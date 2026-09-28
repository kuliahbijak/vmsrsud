/* ==========================================================================
   APP — boot, login, layout, SPA router (hash), navigasi instan, sinkronisasi
   ========================================================================== */
const Pages = {};         // registry halaman: { title, render(el, param), keep, deps }
const Act = {};           // registry aksi (event delegation: data-act / data-in / data-ch)
const PS = {};            // state UI per halaman (filter, pagination) — tetap saat pindah menu
const ROLE_LABEL = { ADMIN: 'Administrator', PPK: 'PPK Pengadaan', PENGADAAN: 'Pejabat Pengadaan', PPTK: 'PPTK', VENDOR: 'Rekanan / Vendor' };
const CAN = {
  vendorEdit: ['ADMIN', 'PENGADAAN'], poEdit: ['ADMIN', 'PENGADAAN'], poApprove: ['PPK'], bastEdit: ['ADMIN', 'PPTK'],
  invEdit: ['ADMIN', 'PENGADAAN'], invApprove: ['PPK'], invPay: ['ADMIN', 'PPK'], kontrakEdit: ['ADMIN', 'PENGADAAN'], kontrakApprove: ['PPK'],
  template: ['ADMIN'], admin: ['ADMIN'], report: ['ADMIN', 'PPK', 'PENGADAAN', 'PPTK'], genDoc: ['ADMIN', 'PENGADAAN', 'PPK', 'PPTK'], internal: ['ADMIN', 'PPK', 'PENGADAAN', 'PPTK']
};
const can = k => !!(Store.S.user && CAN[k].includes(Store.S.user.role));
const isVendor = () => Store.S.user && Store.S.user.role === 'VENDOR';

const App = (() => {
  const { icon, esc } = UI;
  const sections = {};
  let current = null;
  let pollTimer = null, fullTimer = null;

  // ---------------- NAV ----------------
  function navItems() {
    const r = Store.S.user.role, V = r === 'VENDOR';
    const pendingPO = Store.S.po.filter(p => p.status === 'Menunggu Approval').length
      + Store.S.invoice.filter(i => i.status === 'Menunggu Verifikasi').length + Store.S.kontrak.filter(k => k.status === 'Menunggu Approval').length;
    return [
      { id: 'dashboard', l: V ? 'Portal Rekanan' : 'Dashboard', i: 'dash' },
      { id: 'vendor', l: V ? 'Profil Perusahaan' : 'Daftar Vendor', i: 'building' },
      { id: 'po', l: V ? 'Pesanan (PO) Saya' : 'Purchase Order (PO)', i: 'receipt' },
      { id: 'approval', l: 'Approval', i: 'shield', roles: ['PPK'], badge: pendingPO },
      { id: 'bast', l: V ? 'BAST Diterima' : 'Input BAST', i: 'clipcheck' },
      { id: 'invoice', l: V ? 'Tagihan Saya' : 'Invoice & Pembayaran', i: 'money' },
      { id: 'kontrak', l: 'Kontrak', i: 'contract' },
      { id: 'template', l: 'Kelola Template', i: 'file', roles: ['ADMIN'] },
      { id: 'laporan', l: 'Laporan Pengadaan', i: 'chart', roles: CAN.report },
      { id: 'pengaturan', l: 'Pengaturan Sistem', i: 'gear', roles: ['ADMIN'] }
    ].filter(n => !n.roles || n.roles.includes(r));
  }
  function renderNav() {
    const base = (current && current.page || '').split('-')[0];
    document.getElementById('nav').innerHTML = navItems().map(n =>
      `<a href="#/${n.id}" class="${base === n.id ? 'active' : ''}" data-nav="${n.id}">${icon(n.i)}<span>${n.l}</span>${n.badge ? `<span class="badge">${n.badge}</span>` : ''}</a>`).join('');
  }
  function renderTopbar() {
    const u = Store.S.user;
    document.getElementById('me-name').textContent = u.nama;
    document.getElementById('me-role').textContent = ROLE_LABEL[u.role] + (u.role === 'VENDOR' && Store.vendor(u.vendor_id) ? ' · ' + Store.vendor(u.vendor_id).nama : '');
    const n = Store.unread();
    document.getElementById('bell-dot').textContent = n > 9 ? '9+' : n;
    document.getElementById('bell-dot').classList.toggle('hidden', !n);
    document.getElementById('crumb-rs').textContent = (Store.S.settings.RS_NAMA || window.VMS_CONFIG.RS_SINGKAT);
    document.querySelectorAll('[data-rs]').forEach(e => e.textContent = Store.S.settings.RS_NAMA || window.VMS_CONFIG.RS_SINGKAT);
  }

  // ---------------- ROUTER (hash, tanpa reload) ----------------
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, ...rest] = h.split('/');
    return { page: page || 'dashboard', param: decodeURIComponent(rest.join('/') || '') };
  }
  function go(path) { if (location.hash !== '#/' + path) location.hash = '#/' + path; else route(); }
  function route() {
    if (!Store.S.user) return;
    let { page, param } = parseHash();
    if (!Pages[page] || (Pages[page].roles && !Pages[page].roles.includes(Store.S.user.role))) { page = 'dashboard'; param = ''; }
    document.body.classList.remove('nav-open');
    closeDropdowns();
    const root = document.getElementById('view');
    if (current && sections[current.page]) sections[current.page].el.classList.add('hidden');
    let sec = sections[page];
    if (!sec) { sec = sections[page] = { el: document.createElement('section'), param: null, dirty: true }; root.appendChild(sec.el); }
    const needs = sec.dirty || sec.param !== param || (Pages[page].keep && Pages[page].keep === 'never');
    current = { page, param };
    if (needs) renderSection(page);
    sec.el.classList.remove('hidden');
    sec.el.classList.remove('view'); void sec.el.offsetWidth; sec.el.classList.add('view');
    document.title = (Pages[page].title || 'VMS') + ' · ' + (Store.S.settings.RS_NAMA || 'VMS');
    renderNav();
    window.scrollTo(0, 0);
  }
  function renderSection(page, keepScroll) {
    const sec = sections[page]; const y = window.scrollY;
    try { Pages[page].render(sec.el, current && current.page === page ? current.param : sec.param); }
    catch (e) { console.error(e); sec.el.innerHTML = `<div class="card">${UI.empty('Gagal menampilkan halaman: ' + esc(e.message), 'alert')}</div>`; }
    sec.param = current && current.page === page ? current.param : sec.param; sec.dirty = false;
    if (keepScroll) window.scrollTo(0, y);
  }
  /** Data berubah → halaman aktif dirender ulang, halaman lain ditandai "kotor" (lazy) */
  function onData(tables) {
    if (!Store.S.user || !current) return;
    Object.keys(sections).forEach(p => {
      const pg = Pages[p];
      if (pg.deps && !pg.deps.some(t => tables.includes(t))) return;
      if (pg.keep) return; // halaman form: jangan timpa input pengguna
      if (current.page === p) renderSection(p, true); else sections[p].dirty = true;
    });
    renderNav(); renderTopbar();
  }
  /** Tutup drawer detail → URL kembali ke halaman induk tanpa render ulang */
  function clearParam(page) {
    if (!current || current.page !== page) return;
    current.param = ''; if (sections[page]) sections[page].param = '';
    history.replaceState(null, '', '#/' + page);
  }
  function refreshCurrent() { if (current) renderSection(current.page, true); }
  function invalidate(page) { if (sections[page]) sections[page].dirty = true; }

  // ---------------- AUTH & BOOT ----------------
  async function boot() {
    Store.subscribe(onData);
    API.onStatus(renderConn);
    window.addEventListener('hashchange', route);
    window.addEventListener('vms:auth', () => { UI.toast('Sesi berakhir, silakan login ulang', 'warn'); logout(true); });
    bindGlobal();
    const tok = Store.loadToken();
    const snap = Store.loadLocal();
    if (tok && snap) {
      // Stale-while-revalidate: tampil instan dari cache lokal
      API.setToken(tok); Store.setBoot(snap); showApp();
      refreshData(true);
    } else if (tok) {
      API.setToken(tok);
      try { const r = await API.call('bootstrap'); Store.setBoot(r.data); showApp(); }
      catch (e) { showLogin(e.code === 'AUTH' ? '' : e.message); }
    } else showLogin();
    hideBoot();
  }
  function hideBoot() { const b = document.getElementById('boot'); if (b) b.remove(); }

  function showLogin(msg) {
    document.getElementById('app').classList.add('hidden');
    const root = document.getElementById('login-root'); root.classList.remove('hidden');
    root.innerHTML = `<div class="login">
      <div class="login-art">
        <div class="row" style="gap:12px">${UI.logo()}<div><div class="mono xs" style="letter-spacing:.14em;color:#a9c6dd">${esc(window.VMS_CONFIG.RS_SINGKAT)}</div><b style="font-family:var(--serif);font-size:20px;color:#fff">VMS Procurement</b></div></div>
        <div><div class="mono xs" style="letter-spacing:.14em;color:#94f4ad;margin-bottom:12px">VENDOR MANAGEMENT SYSTEM · BLUD</div>
          <h1>Pengadaan barang & jasa rumah sakit, terkendali dari pesanan hingga pembayaran.</h1>
          <div class="feat">
            <div>${icon('check')}<span>Alur digital PO → Approval PPK → BAST → Invoice & SP2D dalam satu sistem</span></div>
            <div>${icon('check')}<span>Template dokumen resmi otomatis dari Google Docs</span></div>
            <div>${icon('check')}<span>Audit trail lengkap & portal terbatas untuk rekanan</span></div>
          </div></div>
        <div class="mono xs" style="color:#8fb2cc">Google Apps Script · Sheets · Drive · Docs</div>
      </div>
      <div class="login-form"><form class="box" id="login-form" autocomplete="on">
        <div class="eyebrow"><span class="tag">Masuk</span> Staf RSUD & Rekanan Terdaftar</div>
        <h2 style="margin:4px 0 6px">Selamat datang</h2>
        <p class="muted" style="margin:0 0 22px">Gunakan email dan password akun VMS Anda.</p>
        <div class="stack">
          <div class="field"><label for="lg-email">Email</label><div class="input-ic">${icon('mail')}<input class="input" id="lg-email" type="email" required autocomplete="username" placeholder="nama@rsudhamba.go.id"></div></div>
          <div class="field"><label for="lg-pass">Password</label><div class="input-ic">${icon('lock')}<input class="input" id="lg-pass" type="password" required autocomplete="current-password" placeholder="••••••••"></div></div>
          <div id="lg-msg" class="err">${esc(msg || '')}</div>
          <button class="btn" style="width:100%" id="lg-btn" type="submit">Masuk ke VMS</button>
          <div class="row small muted" style="justify-content:center;gap:6px" id="lg-status"><span class="skel" style="width:120px;display:inline-block"></span></div>
        </div>
        <p class="xs muted center" style="margin-top:28px">Lupa password? Hubungi Administrator Sistem ${esc(window.VMS_CONFIG.RS_SINGKAT)}.</p>
      </form></div></div>`;
    document.getElementById('login-form').addEventListener('submit', doLogin);
    setTimeout(() => document.getElementById('lg-email').focus(), 50);
    API.ping().then(p => {
      const el = document.getElementById('lg-status'); if (!el) return;
      el.innerHTML = p && p.success ? `<span class="conn"><i></i>Server terhubung${p.ready ? '' : ' · belum setup'}</span>` : `<span class="conn off"><i></i>Server tidak terjangkau — cek GAS_URL</span>`;
    });
  }
  async function doLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('lg-btn'), msg = document.getElementById('lg-msg');
    UI.busy(btn, true); msg.textContent = '';
    try {
      const r = await API.call('login', { email: document.getElementById('lg-email').value, password: document.getElementById('lg-pass').value, ua: navigator.userAgent });
      API.setToken(r.data.token); Store.saveToken(r.data.token, r.data.expires);
      Store.setBoot(r.data.boot);
      document.getElementById('login-root').classList.add('hidden');
      if (!location.hash || location.hash === '#/') location.hash = '#/dashboard';
      showApp();
      UI.toast('Selamat datang, ' + r.data.user.nama, 'ok');
    } catch (err) { msg.textContent = err.message; UI.busy(btn, false); }
  }
  function showApp() {
    document.getElementById('login-root').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderTopbar(); route();
    startPolling();
    if (Store.S.user.must_change) forceChangePassword();
  }
  async function logout(silent) {
    try { if (!silent) API.call('logout', { token: API.token }).catch(() => { }); } catch (e) { }
    Store.clear(); API.setToken(null);
    Object.keys(sections).forEach(k => { sections[k].el.remove(); delete sections[k]; });
    Object.keys(PS).forEach(k => delete PS[k]);
    current = null; clearInterval(pollTimer); clearInterval(fullTimer);
    location.hash = '';
    showLogin();
  }
  function forceChangePassword() {
    const m = UI.modal({
      title: 'Ganti password awal', sub: 'Demi keamanan, ganti password sementara sebelum melanjutkan.', closeOnBg: false,
      body: `<div class="stack"><div class="field"><label>Password lama / sementara</label><input class="input" type="password" id="cp-old"></div>
      <div class="field"><label>Password baru</label><input class="input" type="password" id="cp-new"><span class="help">Minimal 8 karakter, kombinasi huruf dan angka.</span></div>
      <div class="field"><label>Ulangi password baru</label><input class="input" type="password" id="cp-new2"></div><div class="err" id="cp-err"></div></div>`,
      foot: `<button class="btn btn-outline" id="cp-out">Keluar</button><button class="btn" id="cp-ok">Simpan password</button>`
    });
    m.q('[data-close]').remove();
    m.q('#cp-out').onclick = () => { m.close(); logout(); };
    m.q('#cp-ok').onclick = async () => {
      const a = m.q('#cp-new').value, b = m.q('#cp-new2').value;
      if (a !== b) { m.q('#cp-err').textContent = 'Konfirmasi password tidak sama.'; return; }
      UI.busy(m.q('#cp-ok'), true);
      try { await API.call('changePassword', { oldPassword: m.q('#cp-old').value, newPassword: a }); Store.S.user.must_change = false; Store.persist(); m.close(); UI.toast('Password diperbarui', 'ok'); }
      catch (e) { m.q('#cp-err').textContent = e.message; UI.busy(m.q('#cp-ok'), false); }
    };
  }

  // ---------------- SINKRONISASI LATAR ----------------
  let refreshing = false;
  async function refreshData(silent) {
    if (refreshing) return; refreshing = true;
    try {
      const r = await API.call('bootstrap');
      if (API.status().pending === 0) Store.setBoot(r.data);
    } catch (e) { if (!silent) UI.toast(e.message, 'err'); }
    finally { refreshing = false; }
  }
  function startPolling() {
    clearInterval(pollTimer); clearInterval(fullTimer);
    const ms = window.VMS_CONFIG.POLL_MS || 45000;
    pollTimer = setInterval(poll, ms);
    fullTimer = setInterval(() => { if (document.visibilityState === 'visible') refreshData(true); }, 5 * 60000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); });
  }
  async function poll() {
    if (document.visibilityState !== 'visible' || !Store.S.user || API.status().pending) return;
    try {
      const r = await API.call('version');
      if (r.data.version !== Store.S.version) refreshData(true);
      else if (r.data.unread !== Store.unread()) refreshData(true);
    } catch (e) { }
  }
  function renderConn(st) {
    const el = document.getElementById('conn'); if (!el) return;
    el.className = 'conn' + (!st.online ? ' off' : st.pending ? ' sync' : '');
    el.innerHTML = `<i></i><span>${!st.online ? 'Offline — data lokal' : st.pending ? 'Menyinkronkan ' + st.pending + '…' : 'GAS Database Connected'}</span>`;
  }

  // ---------------- TOPBAR: cari, notifikasi, profil ----------------
  function closeDropdowns() { document.querySelectorAll('.dropdown').forEach(d => d.remove()); const r = document.getElementById('gs-res'); if (r) r.classList.add('hidden'); }
  function globalSearch(q) {
    const box = document.getElementById('gs-res'); q = q.trim().toLowerCase();
    if (q.length < 2) { box.classList.add('hidden'); return; }
    const S = Store.S, out = [];
    S.po.forEach(p => { const v = Store.vendor(p.vendor_id); if ((p.nomor_po + ' ' + (v ? v.nama : '') + ' ' + p.paket).toLowerCase().includes(q)) out.push({ h: '#/po/' + p.id, t: p.nomor_po, s: (v ? v.nama : '') + ' · ' + p.status }); });
    S.vendors.forEach(v => { if ((v.nama + ' ' + v.npwp + ' ' + v.nib + ' ' + v.kode).toLowerCase().includes(q)) out.push({ h: '#/vendor/' + v.id, t: v.nama, s: 'Vendor · ' + (v.kode || '') }); });
    S.bast.forEach(b => { if ((b.nomor_bast || '').toLowerCase().includes(q)) out.push({ h: '#/bast/' + b.id, t: b.nomor_bast, s: 'BAST · ' + b.status }); });
    S.invoice.forEach(i => { if ((i.nomor_invoice + ' ' + i.no_faktur).toLowerCase().includes(q)) out.push({ h: '#/invoice/' + i.id, t: i.nomor_invoice, s: 'Invoice · ' + i.status }); });
    box.innerHTML = out.slice(0, 12).map(o => `<a href="${o.h}"><div class="mono small">${esc(o.t)}</div><div class="xs muted">${esc(o.s)}</div></a>`).join('') || '<div class="empty small">Tidak ditemukan</div>';
    box.classList.remove('hidden');
  }
  function openNotif() {
    closeDropdowns();
    const list = Store.S.notif;
    const dd = document.createElement('div'); dd.className = 'dropdown notif-dd';
    dd.innerHTML = `<div class="row" style="padding:12px 14px;border-bottom:1px solid var(--border)"><b>Notifikasi</b><span class="spacer"></span>${Store.unread() ? '<button class="btn btn-ghost btn-xs" data-act="notif.readAll">Tandai semua dibaca</button>' : ''}</div>` +
      (list.length ? list.map(n => `<div class="n ${String(n.dibaca) !== '1' ? 'unread' : ''}" data-act="notif.open" data-id="${n.id}"><div class="row"><b class="small">${esc(n.judul)}</b><span class="spacer"></span><span class="xs muted">${UI.ago(n.ts)}</span></div><div class="xs muted" style="margin-top:3px;white-space:pre-line">${esc(String(n.pesan).slice(0, 180))}</div></div>`).join('') : UI.empty('Belum ada notifikasi', 'bell'));
    document.body.appendChild(dd);
  }
  function openMe() {
    closeDropdowns();
    const dd = document.createElement('div'); dd.className = 'dropdown me-dd';
    dd.innerHTML = `<div style="padding:10px"><b>${esc(Store.S.user.nama)}</b><div class="small muted">${esc(Store.S.user.email)}</div></div>
      <button data-act="me.password">${icon('key')} Ganti password</button><button data-act="me.refresh">${icon('refresh')} Muat ulang data</button><button data-act="me.logout" style="color:var(--danger)">${icon('logout')} Keluar</button>`;
    document.body.appendChild(dd);
  }

  // ---------------- EVENT DELEGATION ----------------
  function bindGlobal() {
    document.addEventListener('click', e => {
      if (!e.target.closest('.dropdown,#bell,#me,.gsearch')) closeDropdowns();
      const nav = e.target.closest('[data-nav]'); if (nav) { document.body.classList.remove('nav-open'); }
      const cp = e.target.closest('.code-pill[data-copy]'); if (cp) { navigator.clipboard && navigator.clipboard.writeText(cp.dataset.copy); UI.toast('Disalin: ' + cp.dataset.copy); }
      const el = e.target.closest('[data-act]');
      if (el && Act[el.dataset.act]) { e.preventDefault(); Act[el.dataset.act](el, e); }
    });
    document.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el && Act[el.dataset.in]) Act[el.dataset.in](el, e); });
    document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el && Act[el.dataset.ch]) Act[el.dataset.ch](el, e); });
    document.getElementById('hamb').onclick = () => document.body.classList.toggle('nav-open');
    document.getElementById('bell').onclick = e => { e.stopPropagation(); document.querySelector('.notif-dd') ? closeDropdowns() : openNotif(); };
    document.getElementById('me').onclick = e => { e.stopPropagation(); document.querySelector('.me-dd') ? closeDropdowns() : openMe(); };
    const gs = document.getElementById('gs-in');
    gs.addEventListener('input', UI.debounce(() => globalSearch(gs.value), 150));
    gs.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = document.querySelector('#gs-res a'); if (a) { location.hash = a.getAttribute('href'); gs.value = ''; closeDropdowns(); } } });
    document.getElementById('gs-res').addEventListener('click', () => { gs.value = ''; closeDropdowns(); });
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); gs.focus(); } });
  }

  Act['notif.open'] = el => {
    const n = Store.S.notif.find(x => x.id === el.dataset.id); if (!n) return;
    if (String(n.dibaca) !== '1') { n.dibaca = '1'; Store.persist(); renderTopbar(); API.call('markNotifRead', { ids: [n.id] }).catch(() => { }); }
    closeDropdowns();
    const map = { PO: isVendor() ? 'po/' : (Store.S.user.role === 'PPK' && Store.po(n.ref_id) && Store.po(n.ref_id).status === 'Menunggu Approval' ? 'approval/' : 'po/'), BAST: 'bast/', Invoice: 'invoice/', Kontrak: 'kontrak/', Vendor: 'vendor/' };
    if (map[n.ref_type]) go(map[n.ref_type] + n.ref_id);
  };
  Act['notif.readAll'] = () => { Store.S.notif.forEach(n => n.dibaca = '1'); Store.persist(); renderTopbar(); closeDropdowns(); API.call('markNotifRead', { all: true }).catch(() => { }); };
  Act['me.logout'] = () => logout();
  Act['me.refresh'] = async () => { closeDropdowns(); UI.toast('Memuat ulang data…'); await refreshData(); UI.toast('Data terbaru dimuat', 'ok'); };
  Act['me.password'] = () => {
    closeDropdowns();
    const m = UI.modal({ title: 'Ganti password', body: `<div class="stack"><div class="field"><label>Password lama</label><input class="input" type="password" id="p0"></div><div class="field"><label>Password baru</label><input class="input" type="password" id="p1"><span class="help">Minimal 8 karakter, huruf & angka</span></div><div class="err" id="pe"></div></div>`, foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn" id="pok">Simpan</button>` });
    m.q('#pok').onclick = async () => { UI.busy(m.q('#pok'), true); try { await API.call('changePassword', { oldPassword: m.q('#p0').value, newPassword: m.q('#p1').value }); m.close(); UI.toast('Password diperbarui', 'ok'); } catch (e) { m.q('#pe').textContent = e.message; UI.busy(m.q('#pok'), false); } };
  };

  return { boot, go, route, refreshCurrent, clearParam, invalidate, refreshData, renderNav, renderTopbar, logout, get current() { return current; } };
})();

document.addEventListener('DOMContentLoaded', App.boot);
