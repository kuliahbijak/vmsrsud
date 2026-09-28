/* ==========================================================================
   UI — ikon, format, komponen (toast, modal, drawer, tabel, grafik, upload)
   ========================================================================== */
const UI = (() => {
  // ---------- Ikon (SVG inline, stroke) ----------
  const P = {
    dash: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    clipcheck: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 2h6v4H9zM9 13l2 2 4-4"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4M18 10v4"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    chart: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    contract: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 17c1.5-2 2.5-2 3 0s2 1 3-1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4a3.5 3.5 0 0 1 0 7M18 14.5c2.5.5 4 2.3 4 5.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12l5 5L20 7"/>',
    down: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>', up: '<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', next: '<path d="M9 6l6 6-6 6"/>', prev: '<path d="M15 6l-6 6 6 6"/>', chev: '<path d="M6 9l6 6 6-6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
    filter: '<path d="M4 5h16M7 12h10M10 19h4"/>', sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    excel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>', cloud: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/><path d="M12 12v6M9 15l3-3 3 3"/>',
    camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>',
    pdf: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><text x="7.5" y="17" font-size="5" font-family="monospace" fill="currentColor" stroke="none">PDF</text>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>', trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>', scan: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16"/>',
    braces: '<path d="M8 4c-2 0-3 1-3 3v2c0 1-1 2-2 2 1 0 2 1 2 2v4c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1 1 2 2 2-1 0-2 1-2 2v4c0 2-1 3-3 3"/>',
    doc: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>', sign: '<path d="M3 17c3-6 5-6 6 0s3 3 5-2 3-3 4 0M3 21h18"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>', tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>', share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  const logo = (c = '#fff') => `<svg viewBox="0 0 32 32" width="30" height="30"><path d="M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9z" fill="${c}"/><path d="M26 2l1.2 2.8L30 6l-2.8 1.2L26 10l-1.2-2.8L22 6l2.8-1.2z" fill="#94f4ad"/></svg>`;

  // ---------- Escape & format ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const rp = (n, short) => {
    n = Math.round(Number(n) || 0);
    if (short) { const a = Math.abs(n); if (a >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M'; if (a >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' Jt'; }
    return 'Rp ' + n.toLocaleString('id-ID');
  };
  const num = n => (Number(n) || 0).toLocaleString('id-ID');
  const toDate = s => { if (!s) return null; const d = new Date(String(s).length === 10 ? s + 'T00:00:00' : s); return isNaN(d) ? null : d; };
  const tgl = (s, long) => { const d = toDate(s); if (!d) return '-'; return d.getDate() + ' ' + (long ? BULAN : BLN)[d.getMonth()] + ' ' + d.getFullYear(); };
  const tglJam = s => { const d = toDate(s); if (!d) return '-'; return tgl(s) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const iso = (d = new Date()) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const daysTo = s => { const d = toDate(s); if (!d) return null; const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((d - t) / 86400000); };
  const ago = s => { const d = toDate(s); if (!d) return ''; const m = Math.round((Date.now() - d) / 60000); if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu'; if (m < 1440) return Math.round(m / 60) + ' jam lalu'; return Math.round(m / 1440) + ' hari lalu'; };
  const initials = s => String(s || '?').replace(/^(PT|CV|UD|PD|Koperasi)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const avClass = s => 'a' + ((String(s).charCodeAt(0) + String(s).length) % 5);

  // ---------- Status chip ----------
  const STATUS = {
    'Draft': 'st-gray', 'Menunggu Approval': 'st-red', 'Disetujui PPK': 'st-green', 'Ditolak': 'st-red', 'BAST Parsial': 'st-amber', 'BAST Terbit': 'st-teal', 'Selesai': 'st-solid-green',
    'Ditandatangani': 'st-green', 'Menunggu Verifikasi': 'st-amber', 'Disetujui': 'st-green', 'Dibayar': 'st-solid-green',
    'Aktif Terverifikasi': 'st-green', 'Dokumen Expired': 'st-red', 'Nonaktif': 'st-gray', 'Aktif': 'st-green', 'Urgent': 'st-red', 'Normal': 'st-gray'
  };
  const LABEL = { 'Selesai': 'Selesai / Dibayar', 'Menunggu Verifikasi': 'Menunggu Verifikasi' };
  const chip = (s, extra = '') => `<span class="chip ${STATUS[s] || 'st-blue'} ${extra}">${esc(LABEL[s] || s || '-')}</span>`;

  // ---------- Toast ----------
  function toast(msg, type = '', ms = 3200) {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = icon(type === 'ok' ? 'check' : type === 'err' ? 'alert' : 'info') + '<div>' + esc(msg) + '</div>';
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, ms);
  }

  // ---------- Modal / drawer ----------
  function modal({ title, sub = '', body = '', foot = '', size = '', drawer = false, onMount, onClose, closeOnBg = true }) {
    const ov = document.createElement('div');
    ov.className = 'overlay' + (drawer ? ' drawer-ov' : '');
    ov.innerHTML = `<div class="${drawer ? 'drawer' : 'modal ' + size}" role="dialog" aria-modal="true">
      <div class="modal-h"><div style="flex:1"><h3>${title}</h3>${sub ? `<div class="small muted" style="margin-top:2px">${sub}</div>` : ''}</div><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
      <div class="modal-b" style="${drawer ? 'flex:1' : ''}">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
    let closed = false;
    const close = () => { if (closed) return; closed = true; ov.remove(); document.removeEventListener('keydown', onKey); if (onClose) onClose(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    ov.addEventListener('click', e => { if (e.target.closest('[data-close]') || (closeOnBg && e.target === ov)) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    const api = { el: ov, close, q: s => ov.querySelector(s), qa: s => [...ov.querySelectorAll(s)] };
    if (onMount) onMount(api);
    const f = ov.querySelector('input:not([type=hidden]),select,textarea'); if (f && !drawer) setTimeout(() => f.focus(), 30);
    return api;
  }
  function confirm(title, msg, { ok = 'Ya, lanjutkan', danger = false, input = null } = {}) {
    return new Promise(res => {
      const m = modal({
        title, body: `<p style="margin:0 0 12px;color:var(--ink-2)">${msg}</p>${input ? `<div class="field"><label>${esc(input.label)}${input.required ? ' <span class="req">*</span>' : ''}</label>${input.textarea ? `<textarea class="textarea" id="cf-in" placeholder="${esc(input.placeholder || '')}"></textarea>` : `<input class="input" id="cf-in" placeholder="${esc(input.placeholder || '')}" value="${esc(input.value || '')}">`}</div>` : ''}`,
        foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cf-ok">${ok}</button>`
      });
      let done = false;
      m.q('#cf-ok').onclick = () => {
        const v = input ? m.q('#cf-in').value.trim() : true;
        if (input && input.required && !v) { m.q('#cf-in').classList.add('invalid'); m.q('#cf-in').focus(); return; }
        done = true; m.close(); res(v);
      };
      const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) res(false); } });
      obs.observe(document.body, { childList: true });
    });
  }

  // ---------- Pager ----------
  function paginate(list, page, size) { const pages = Math.max(1, Math.ceil(list.length / size)); page = Math.min(Math.max(1, page), pages); return { rows: list.slice((page - 1) * size, page * size), page, pages, total: list.length, from: list.length ? (page - 1) * size + 1 : 0, to: Math.min(page * size, list.length) }; }
  function pager(p, act, label = 'data') {
    const btn = (n, txt = n, dis = false) => `<button class="pg ${n === p.page && txt === n ? 'on' : ''}" data-act="${act}" data-page="${n}" ${dis ? 'disabled' : ''}>${txt}</button>`;
    const nums = []; const s = Math.max(1, p.page - 2), e = Math.min(p.pages, s + 4);
    if (s > 1) nums.push(btn(1), s > 2 ? '<span class="muted">…</span>' : '');
    for (let i = s; i <= e; i++) nums.push(btn(i));
    if (e < p.pages) nums.push(e < p.pages - 1 ? '<span class="muted">…</span>' : '', btn(p.pages));
    return `<div class="pager"><span class="muted">Menampilkan <b>${p.from}–${p.to}</b> dari <b>${num(p.total)}</b> ${label}</span><span class="spacer"></span>
      <button class="pg" data-act="${act}" data-page="${p.page - 1}" ${p.page <= 1 ? 'disabled' : ''}>‹</button>${nums.join('')}<button class="pg" data-act="${act}" data-page="${p.page + 1}" ${p.page >= p.pages ? 'disabled' : ''}>›</button></div>`;
  }
  const empty = (msg = 'Belum ada data', ic = 'box') => `<div class="empty">${icon(ic)}${msg}</div>`;

  // ---------- Grafik SVG ----------
  function barChart(data, { h = 260, fmt = v => rp(v, true), peakLabel = true, color2 } = {}) {
    const W = 720, H = h, pl = 54, pb = 30, pt = 24;
    const max = Math.max(1, ...data.map(d => d.v));
    const nice = (() => { const e = Math.pow(10, Math.floor(Math.log10(max))); const m = max / e; return (m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; })();
    const bw = (W - pl - 10) / data.length;
    const peak = data.reduce((a, d, i) => d.v > data[a].v ? i : a, 0);
    let g = '';
    for (let i = 0; i <= 4; i++) { const y = pt + (H - pt - pb) * (1 - i / 4); g += `<line class="grid-l" x1="${pl}" x2="${W - 6}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${fmtAxis(nice * i / 4)}</text>`; }
    data.forEach((d, i) => {
      const bh = (H - pt - pb) * d.v / nice, x = pl + i * bw + bw * .22, w = bw * .56, y = H - pb - bh;
      g += `<rect class="bar ${i === peak && d.v > 0 ? 'hi' : ''}" x="${x}" y="${y}" width="${w}" height="${Math.max(0, bh)}" rx="2" data-tip="${esc(d.l)}: ${esc(fmt(d.v))}"/>`;
      if (color2 && d.v2) { const h2 = (H - pt - pb) * d.v2 / nice; g += `<rect x="${x + w * .15}" y="${H - pb - h2}" width="${w * .7}" height="3" fill="${color2}" data-tip="Target ${esc(d.l)}: ${esc(fmt(d.v2))}"/>`; }
      g += `<text x="${x + w / 2}" y="${H - 10}" text-anchor="middle" style="${i === peak && d.v > 0 ? 'font-weight:700;fill:#0c1e25' : ''}">${esc(d.l)}</text>`;
      if (peakLabel && i === peak && d.v > 0) g += `<circle cx="${x + w / 2}" cy="${y - 9}" r="3.5" fill="#0c1e25"/>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }
  const fmtAxis = v => v >= 1e9 ? (v / 1e9).toFixed(v % 1e9 ? 1 : 0) + 'M' : v >= 1e6 ? Math.round(v / 1e6) + 'Jt' : v >= 1e3 ? Math.round(v / 1e3) + 'rb' : Math.round(v);
  function donut(parts, center, sub) {
    const tot = parts.reduce((a, p) => a + p.v, 0) || 1; let acc = 0; const R = 54, C = 2 * Math.PI * R;
    const arcs = parts.map(p => { const len = C * p.v / tot; const s = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${p.c}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 70 70)" data-tip="${esc(p.l)}: ${p.v}"/>`; acc += len; return s; }).join('');
    return `<svg viewBox="0 0 140 140" width="150" height="150"><circle cx="70" cy="70" r="${R}" fill="none" stroke="#EEF3F2" stroke-width="16"/>${arcs}<text x="70" y="70" text-anchor="middle" font-family="Source Serif 4,serif" font-size="22" font-weight="600" fill="#003857">${center}</text><text x="70" y="88" text-anchor="middle" font-size="9" fill="#5B6B73" font-family="Inter">${sub}</text></svg>`;
  }
  // Tooltip global untuk grafik
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    let tip = document.getElementById('tip');
    if (!t) { if (tip) tip.remove(); return; }
    if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; tip.className = 'tip'; document.body.appendChild(tip); }
    tip.textContent = t.getAttribute('data-tip'); tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 30) + 'px';
  });

  // ---------- Berkas ----------
  const readB64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  /** Kompres gambar di browser (maks 1400px, JPEG 0.78) → upload jauh lebih cepat */
  async function compressImage(file, max = 1400, q = .78) {
    if (!/^image\/(jpeg|png|webp|heic)/.test(file.type)) return { base64: await readB64(file), name: file.name, mime: file.type };
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return { base64: c.toDataURL('image/jpeg', q), name: file.name.replace(/\.\w+$/, '') + '.jpg', mime: 'image/jpeg', preview: c.toDataURL('image/jpeg', .5) };
    } catch (e) { return { base64: await readB64(file), name: file.name, mime: file.type }; }
    finally { URL.revokeObjectURL(url); }
  }
  const fsize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const driveUrl = id => id && !/^demo|^local/.test(id) ? 'https://drive.google.com/file/d/' + id + '/view' : '';

  // ---------- Ekspor Excel (SheetJS dimuat saat dibutuhkan saja) ----------
  let xlsxP = null;
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxP) xlsxP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = () => res(window.XLSX); s.onerror = () => { xlsxP = null; rej(new Error('Library Excel gagal dimuat')); }; document.head.appendChild(s); });
    return xlsxP;
  }
  /** sheets: { 'Nama Sheet': [ {kolom: nilai}, ... ] } */
  async function exportExcel(filename, sheets) {
    try {
      const X = await loadXLSX();
      const wb = X.utils.book_new();
      Object.keys(sheets).forEach(n => { const ws = X.utils.json_to_sheet(sheets[n].length ? sheets[n] : [{ Info: 'Tidak ada data' }]); ws['!cols'] = Object.keys(sheets[n][0] || { a: 1 }).map(k => ({ wch: Math.min(40, Math.max(10, k.length + 2)) })); X.utils.book_append_sheet(wb, ws, n.slice(0, 31)); });
      X.writeFile(wb, filename + '.xlsx');
      toast('File Excel diunduh: ' + filename + '.xlsx', 'ok');
    } catch (e) {
      // Fallback CSV (sheet pertama)
      const first = Object.values(sheets)[0] || [];
      downloadText(filename + '.csv', toCSV(first), 'text/csv');
      toast('Excel tidak tersedia, diunduh sebagai CSV', 'warn');
    }
  }
  function toCSV(rows) {
    if (!rows.length) return '';
    const cols = Object.keys(rows[0]);
    const q = v => { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + [cols.join(',')].concat(rows.map(r => cols.map(c => q(r[c])).join(','))).join('\n');
  }
  function downloadText(name, text, type = 'text/plain') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    const h = rows.shift() || [];
    return rows.filter(r => r.join('').trim()).map(r => { const o = {}; h.forEach((k, i) => o[k.trim()] = (r[i] || '').trim()); return o; });
  }

  // ---------- Form helper ----------
  function formData(root) {
    const o = {};
    root.querySelectorAll('[name]').forEach(el => {
      if (el.type === 'checkbox') o[el.name] = el.checked; else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.value.trim();
    });
    return o;
  }
  const opt = (list, sel, ph) => (ph ? `<option value="">${esc(ph)}</option>` : '') + list.map(o => { const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; return `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
  function busy(btn, on) { if (!btn) return; btn.classList.toggle('busy', !!on); btn.disabled = !!on; }

  return { icon, logo, esc, rp, num, tgl, tglJam, iso, toDate, daysTo, ago, initials, uid, debounce, avClass, chip, toast, modal, confirm, paginate, pager, empty, barChart, donut, readB64, compressImage, fsize, driveUrl, exportExcel, toCSV, downloadText, parseCSV, formData, opt, busy, BLN, BULAN };
})();
