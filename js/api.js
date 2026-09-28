/* ==========================================================================
   API — komunikasi fetch() ke GAS (pure REST JSON) + antrean optimistic
   Prinsip:
   - POST WAJIB Content-Type text/plain (hindari CORS preflight yang diblok GAS)
   - Semua tulis melalui API.mutate(): UI berubah instan (0 ms), request
     berjalan di latar dalam antrean berurutan; gagal → rollback + toast
   ========================================================================== */
const API = (() => {
  const cfg = window.VMS_CONFIG || {};
  const url = () => cfg.GAS_URL;
  let token = null;
  const queue = [];
  let running = false;
  let online = true;
  const listeners = new Set();

  function setToken(t) { token = t; }
  function status() { return { pending: queue.length + (running ? 1 : 0), online }; }
  function emit() { listeners.forEach(fn => { try { fn(status()); } catch (e) { } }); }
  function onStatus(fn) { listeners.add(fn); }

  async function call(action, data = {}, opt = {}) {
    if (!url() || url().includes('GANTI_DENGAN')) throw new Error('GAS_URL belum diisi di js/config.js');
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), opt.timeout || cfg.REQUEST_TIMEOUT || 60000);
    let res;
    try {
      const r = await fetch(url(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token, data }),
        signal: ctrl.signal,
        redirect: 'follow'
      });
      res = await r.json();
      if (!online) { online = true; emit(); }
    } catch (e) {
      online = navigator.onLine !== false && e.name !== 'TypeError' ? online : false;
      emit();
      throw new Error(e.name === 'AbortError' ? 'Server tidak merespons (timeout). Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
    } finally { clearTimeout(tm); }
    if (res && res.code === 'AUTH' && action !== 'login') { window.dispatchEvent(new CustomEvent('vms:auth')); }
    if (!res || !res.success) { const err = new Error((res && res.message) || 'Terjadi kesalahan'); err.code = res && res.code; throw err; }
    if (res.version && typeof Store !== 'undefined') Store.seenVersion(res.version);
    return res;
  }

  async function ping() {
    try {
      const r = await fetch(url() + '?action=ping', { method: 'GET' });
      const j = await r.json(); online = true; emit(); return j;
    } catch (e) { online = false; emit(); return null; }
  }

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

  return { call, ping, mutate, setToken, onStatus, status, get token() { return token; } };
})();
