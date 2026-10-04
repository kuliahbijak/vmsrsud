/* ==========================================================================
   API — komunikasi fetch() ke GAS (pure REST JSON) + antrean optimistic
   gas-instant-ux-pro:
   - POST WAJIB Content-Type text/plain (hindari CORS preflight yang diblok GAS)
   - Aksi BACA: timeout pendek + retry bertahap (pulih dari cold start / sinyal HP)
   - Aksi TULIS: membawa reqId unik → aman di-retry tanpa data ganda (idempoten di server)
   - Semua tulis melalui API.mutate(): UI berubah instan (0 ms), request berjalan
     di latar dalam antrean berurutan; gagal → rollback + toast
   - Perf.table() di console: total vs waktu server (ms) per aksi
   ========================================================================== */
const Perf = {
  rows: [],
  add(action, total, server) { this.rows.push({ action, total, server: server ?? null, net: server != null ? total - server : null, at: new Date().toLocaleTimeString('id-ID') }); if (this.rows.length > 200) this.rows.shift(); },
  table() { console.table(this.rows.slice(-30)); }
};
window.Perf = Perf;

const API = (() => {
  const cfg = window.VMS_CONFIG || {};
  const url = () => cfg.GAS_URL;
  let token = null;
  const queue = [];
  let running = false;
  let online = navigator.onLine !== false;
  const listeners = new Set();
  // aksi baca (aman diulang tanpa reqId)
  const READ = /^(bootstrap|version|loadYear|images|getLogs|listBackups|importScan|scanTemplate|notifConfig|notifQueue|waAudience|waBlastList|waDevice|crmList|crmStats|crmDetail|crmExport|exportJson|resetPreview)$/;

  function setToken(t) { token = t; }
  function status() { return { pending: queue.length + (running ? 1 : 0), online }; }
  function emit() { listeners.forEach(fn => { try { fn(status()); } catch (e) { } }); }
  function onStatus(fn) { listeners.add(fn); }
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function waitOnline(ms) { return new Promise(r => { if (navigator.onLine !== false) return r(); const t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); }); }

  async function once(action, data, timeout, reqId) {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), timeout);
    const t0 = performance.now();
    try {
      const r = await fetch(url(), { method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token, reqId, data }) });
      const text = await r.text();
      try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
      catch (e) { return { success: false, network: true, retryable: r.status >= 500 || r.status === 429, message: 'Server membalas HTTP ' + r.status + ' (bukan JSON).' }; }
    } catch (e) {
      return { success: false, network: true, retryable: true, message: e.name === 'AbortError' ? 'Server tidak merespons (timeout). Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.' };
    } finally { clearTimeout(tm); }
  }

  async function call(action, data = {}, opt = {}) {
    if (!url() || url().includes('GANTI_DENGAN')) throw new Error('GAS_URL belum diisi di js/config.js');
    const isRead = READ.test(action) || opt.read;
    const reqId = isRead ? '' : (opt.reqId || rid());
    const tries = opt.retry === false ? 1 : isRead ? 3 : 2;   // tulis aman diulang karena reqId sama
    let res;
    for (let i = 0; i < tries; i++) {
      if (i) { await sleep(1200 * i); if (navigator.onLine === false) await waitOnline(15000); }
      const tmo = opt.timeout || (isRead ? (i ? 45000 : 25000) : (cfg.REQUEST_TIMEOUT || 90000));
      res = await once(action, data, tmo, reqId);
      if (res.success || !res.retryable) break;
    }
    const wasOnline = online;
    online = !(res.network && !res.success);
    if (wasOnline !== online) emit();
    if (res && res.code === 'AUTH' && action !== 'login') { window.dispatchEvent(new CustomEvent('vms:auth')); }
    if (!res || !res.success) { const err = new Error((res && res.message) || 'Terjadi kesalahan'); err.code = res && res.code; err.network = !!(res && res.network); throw err; }
    if (res.version && typeof Store !== 'undefined') Store.seenVersion(res.version);
    return res;
  }

  async function ping() {
    try {
      const r = await fetch(url() + '?action=ping', { method: 'GET', cache: 'no-store' });
      const j = await r.json(); online = true; emit(); return j;
    } catch (e) { online = false; emit(); return null; }
  }
  /** Bangunkan server (cold start) tanpa menunggu */
  function warmUp() { try { fetch(url() + '?action=ping&t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => { }); } catch (e) { } }

  /**
   * Mutasi optimistic:
   *  apply()     → ubah state lokal + render seketika (sinkron)
   *  run()       → Promise request ke server (default: call(action, data))
   *  onSuccess() → rekonsiliasi dengan data server (nomor dokumen, dsb.)
   *  rollback()  → kembalikan state bila gagal
   */
  function mutate(job) {
    let undo = null;
    try { undo = job.apply ? job.apply() : null; } catch (e) { console.error(e); }
    return new Promise((resolve, reject) => {
      queue.push({ job, undo, resolve, reject });
      emit();
      pump();
    });
  }

  async function pump() {
    if (running) return;
    running = true;
    while (queue.length) {
      const it = queue.shift();
      emit();
      try {
        const res = it.job.run ? await it.job.run() : await call(it.job.action, it.job.data);
        if (it.job.onSuccess) it.job.onSuccess(res);
        if (res.version && !queue.length) Store.markSynced(res.version);
        if (it.job.successMsg !== false && (it.job.successMsg || res.message)) UI.toast(it.job.successMsg || res.message, 'ok');
        it.resolve(res);
      } catch (e) {
        try { if (it.job.rollback) it.job.rollback(it.undo); } catch (x) { console.error(x); }
        UI.toast((it.job.label ? it.job.label + ': ' : '') + e.message, 'err', 6000);
        it.reject(e);
      }
    }
    running = false;
    emit();
  }

  window.addEventListener('beforeunload', (e) => {
    if (queue.length || running) { e.preventDefault(); e.returnValue = 'Masih ada data yang sedang disinkronkan.'; }
  });
  window.addEventListener('online', () => { online = true; emit(); });
  window.addEventListener('offline', () => { online = false; emit(); });

  return { call, ping, warmUp, mutate, setToken, onStatus, status, get token() { return token; } };
})();
