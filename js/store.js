/* ==========================================================================
   STORE — state aplikasi di memori (window.appState) + cache localStorage
   - Stale-while-revalidate: buka app → render dari localStorage (0 ms),
     lalu bootstrap server di latar → render ulang bila berubah.
   - Semua halaman membaca dari sini; pencarian/filter 100% lokal.
   - v1.1: modul Kontrak dihapus; + penerima (PJ Ruangan). Kunci cache naik ke v2
     agar cache lama (skema v1.0) otomatis tidak dipakai.
   ========================================================================== */
const Store = (() => {
  const TABLES = ['vendors', 'barang', 'po', 'poDetail', 'bast', 'bastDetail', 'invoice', 'templates', 'users', 'penerima', 'notif'];
  const S = { user: null, settings: {}, version: '0', sources: null, loadedYears: {} };
  TABLES.forEach(t => S[t] = []);
  let idx = {};
  const subs = new Set();
  const LS_KEY = 'vms_state_v2';
  const TOKEN_KEY = 'vms_token_v1';
  let persistTimer = null;
  let serverVersion = '0';
  try { localStorage.removeItem('vms_state_v1'); } catch (e) { }

  function reindex(t) { if (t) delete idx[t]; else idx = {}; }
  function byId(t, id) {
    if (!id) return null;
    if (!idx[t]) { idx[t] = new Map(); S[t].forEach(r => idx[t].set(r.id, r)); }
    return idx[t].get(id) || null;
  }
  function setBoot(b) {
    S.user = b.user || S.user; S.settings = b.settings || {}; S.sources = b.sources || S.sources;
    TABLES.forEach(t => { if (Array.isArray(b[t])) S[t] = b[t]; });
    S.version = b.version || S.version; S.cutoffYear = b.cutoffYear; serverVersion = S.version;
    reindex(); persist(); notify(TABLES);
  }
  function mergeYear(d, year) {
    ['po', 'poDetail', 'bast', 'bastDetail', 'invoice'].forEach(t => {
      const have = new Set(S[t].map(r => r.id));
      (d[t] || []).forEach(r => { if (!have.has(r.id)) S[t].push(r); });
      reindex(t);
    });
    S.loadedYears[year] = true; notify(['po', 'bast', 'invoice']);
  }
  /** upsert lokal (optimistic) — mengembalikan salinan lama untuk rollback */
  function upsert(t, rec) {
    const i = S[t].findIndex(r => r.id === rec.id);
    const old = i > -1 ? { ...S[t][i] } : null;
    if (i > -1) S[t][i] = { ...S[t][i], ...rec }; else S[t].unshift(rec);
    reindex(t); schedulePersist(); notify([t]);
    return old;
  }
  function upsertMany(t, recs) { recs.forEach(r => { const i = S[t].findIndex(x => x.id === r.id); if (i > -1) S[t][i] = { ...S[t][i], ...r }; else S[t].push(r); }); reindex(t); schedulePersist(); notify([t]); }
  function remove(t, id) {
    const i = S[t].findIndex(r => r.id === id); if (i === -1) return null;
    const old = S[t].splice(i, 1)[0]; reindex(t); schedulePersist(); notify([t]); return old;
  }
  function removeWhere(t, fn) { const gone = S[t].filter(fn); S[t] = S[t].filter(r => !fn(r)); reindex(t); schedulePersist(); notify([t]); return gone; }
  function restore(t, rec, wasNew) { if (wasNew) remove(t, rec.id); else if (rec) upsert(t, rec); }

  function notify(tables) { subs.forEach(fn => { try { fn(tables); } catch (e) { console.error(e); } }); }
  function subscribe(fn) { subs.add(fn); }

  function schedulePersist() { clearTimeout(persistTimer); persistTimer = setTimeout(persist, 400); }
  function persist() {
    if (!S.user) return;
    try {
      const snap = { user: S.user, settings: S.settings, version: S.version, sources: S.sources, cutoffYear: S.cutoffYear, savedAt: Date.now() };
      TABLES.forEach(t => snap[t] = S[t]);
      localStorage.setItem(LS_KEY, JSON.stringify(snap));
    } catch (e) {
      // kuota penuh → buang cache gambar TTD lalu coba sekali lagi
      try { Object.keys(localStorage).filter(k => k.indexOf('vms_img_') === 0).forEach(k => localStorage.removeItem(k)); localStorage.setItem(LS_KEY, JSON.stringify(Object.assign({ user: S.user, settings: S.settings, version: S.version }, ...TABLES.map(t => ({ [t]: S[t] }))))); } catch (e2) { }
    }
  }
  function loadLocal() {
    try { const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); return s && s.user ? s : null; } catch (e) { return null; }
  }
  function saveToken(t, exp) { try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ t, exp })); } catch (e) { } }
  function loadToken() {
    try { const o = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); if (o && new Date(o.exp) > new Date()) return o.t; } catch (e) { }
    return null;
  }
  function clear() {
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem(TOKEN_KEY); Object.keys(localStorage).filter(k => k.indexOf('vms_img_') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { }
    S.user = null; TABLES.forEach(t => S[t] = []); reindex();
  }
  function seenVersion(v) { serverVersion = v; }
  function isStale() { return serverVersion && serverVersion !== S.version; }
  function markSynced(v) { S.version = v || serverVersion; }

  // ---------- helper domain ----------
  const vendor = id => byId('vendors', id);
  const po = id => byId('po', id);
  const poItems = id => S.poDetail.filter(d => d.po_id === id).sort((a, b) => (a.urut || 0) - (b.urut || 0));
  const bastOfPO = id => S.bast.filter(b => b.po_id === id);
  const bastItems = id => S.bastDetail.filter(d => d.bast_id === id);
  const invOfPO = id => S.invoice.filter(i => i.po_id === id);
  const userById = id => byId('users', id);
  const unread = () => S.notif.filter(n => String(n.dibaca) !== '1').length;
  /** spesimen TTD akun yang sedang login */
  const myTtd = () => (S.user && ((userById(S.user.id) || {}).ttd_file_id || S.user.ttd_file_id)) || '';

  return { S, TABLES, byId, setBoot, mergeYear, upsert, upsertMany, remove, removeWhere, restore, subscribe, notify, persist, loadLocal, saveToken, loadToken, clear, seenVersion, isStale, markSynced, vendor, po, poItems, bastOfPO, bastItems, invOfPO, userById, unread, myTtd, get serverVersion() { return serverVersion; } };
})();
window.appState = Store.S;
