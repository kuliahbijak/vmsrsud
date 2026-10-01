/* ==========================================================================
   HALAMAN UTAMA: Dashboard, Daftar Vendor (+form), Purchase Order (+form),
   Master Barang. Semua render dari Store (lokal) → navigasi & filter instan.
   ========================================================================== */
const { icon: I, esc: E, rp: RP, tgl: TGL, chip: CHIP } = UI;
const S = Store.S;
const YEAR = new Date().getFullYear();
const ps = (page, def) => (PS[page] = PS[page] || Object.assign({}, def));

// ---------- komponen bersama ----------
function pageHead({ eyebrow = '', title, sub = '', actions = '', extra = '' }) {
  return `<div class="page-head"><div class="t">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<div class="row wrap" style="gap:14px"><h1>${title}</h1>${extra}</div>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="acts">${actions}</div>` : ''}</div>`;
}
function kpi({ lbl, val, ico = 'chart', ic = '', foot = '', fc = '', accent = false, bar = null }) {
  return `<div class="card kpi ${accent ? 'accent' : ''}"><div class="lbl">${lbl}</div><div class="ico ${ic}">${I(ico)}</div><div class="val">${val}</div>${foot ? `<div class="foot ${fc}">${foot}</div>` : ''}${bar != null ? `<div class="bar-mini"><i style="width:${Math.min(100, bar)}%"></i></div>` : ''}</div>`;
}
function vendorCell(v, sub) {
  if (!v) return '<span class="muted">—</span>';
  return `<div class="row" style="gap:10px;align-items:flex-start"><span class="avatar ${UI.avClass(v.nama)}">${E(UI.initials(v.nama))}</span><div style="min-width:0"><div style="font-weight:500">${E(v.nama)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;
}
const vName = id => (Store.vendor(id) || {}).nama || '—';
const inYear = (s, y = YEAR) => String(s || '').slice(0, 4) === String(y);
const monthOf = s => Number(String(s || '').slice(5, 7)) - 1;
const ACTIVE_PO = p => !['Draft', 'Ditolak'].includes(p.status);
const selTab = (cur, id) => cur === id ? 'on' : '';
function tabsBar(act, items, cur) { return `<div class="tabs">${items.map(t => `<button class="tab ${selTab(cur, t.id)}" data-act="${act}" data-v="${t.id}">${t.l}${t.n != null ? `<span class="cnt">${t.n}</span>` : ''}</button>`).join('')}</div>`; }
function steps(po) {
  const order = ['Draft', 'Menunggu Approval', 'Disetujui PPK', 'BAST', 'Invoice', 'Selesai'];
  const inv = Store.invOfPO(po.id);
  let at = { 'Draft': 0, 'Menunggu Approval': 1, 'Disetujui PPK': 2, 'BAST Parsial': 3, 'BAST Terbit': 3, 'Selesai': 5, 'Ditolak': 1 }[po.status] || 0;
  if (at === 3 && inv.length) at = 4;
  const lbl = ['Draft', 'Approval PPK', 'SP Terbit', 'BAPB', 'Invoice', 'Selesai'];
  return `<div class="steps">${order.map((s, i) => `<div class="st ${po.status === 'Ditolak' && i === 1 ? 'bad' : i < at || po.status === 'Selesai' ? 'done' : i === at ? 'cur' : ''}">${lbl[i]}</div>`).join('')}</div>`;
}

/** Buka drawer detail dari parameter URL (sekali saja, bukan setiap render ulang) */
function openFromParam(el, page, param, exists, fn) {
  if (!param || !exists) return;
  if (el._opened === param && document.querySelector('.drawer')) return;
  el._opened = param;
  setTimeout(() => fn(param, () => { el._opened = null; App.clearParam(page); }), 0);
}

// ---------- pratinjau dokumen resmi (format SP/BAPB/BASTP/Invoice dari doc-format.js) ----------
// v1.1: teks "VALIDATED/DISETUJUI" diganti TTD gambar (spesimen PNG) atau dikosongkan untuk TTD basah.
const Docs = {
  /** Wadah pratinjau; diisi oleh Docs.hydrate(el) setelah halaman dirender */
  poPaper(po) { return `<div class="doc-embed" data-jenis="PO" data-id="${E(po.id)}"><div class="skel" style="height:420px"></div></div>`; },
  hydrate(root) { (root || document).querySelectorAll('.doc-embed:not([data-done])').forEach(el => { el.dataset.done = '1'; Doc.embed(el, el.dataset.jenis, el.dataset.id); }); }
};
function terbilang(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  const s = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const t = x => x < 12 ? s[x] : x < 20 ? t(x - 10) + ' Belas' : x < 100 ? t(Math.floor(x / 10)) + ' Puluh ' + t(x % 10) : x < 200 ? 'Seratus ' + t(x - 100) : x < 1000 ? t(Math.floor(x / 100)) + ' Ratus ' + t(x % 100) : x < 2000 ? 'Seribu ' + t(x - 1000) : x < 1e6 ? t(Math.floor(x / 1000)) + ' Ribu ' + t(x % 1000) : x < 1e9 ? t(Math.floor(x / 1e6)) + ' Juta ' + t(x % 1e6) : x < 1e12 ? t(Math.floor(x / 1e9)) + ' Miliar ' + t(x % 1e9) : t(Math.floor(x / 1e12)) + ' Triliun ' + t(x % 1e12);
  return n ? (t(n) + ' Rupiah').replace(/\s+/g, ' ').trim() : 'Nol Rupiah';
}
function printHTML(html, title) {
  const w = window.open('', '_blank'); if (!w) { UI.toast('Izinkan pop-up untuk mencetak', 'warn'); return; }
  const css = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
  w.document.write(`<!doctype html><html><head><title>${E(title)}</title>${css}<style>body{background:#fff;padding:20px}.paper{box-shadow:none}</style></head><body>${html}<script>setTimeout(()=>print(),600)<\/script></body></html>`);
  w.document.close();
}

/* =====================================================================
   DASHBOARD
   ===================================================================== */
Pages.dashboard = {
  title: 'Dashboard',
  render(el) { el.innerHTML = isVendor() ? vendorPortal() : internalDash(); }
};
function monthlySeries(list, valFn, dateFn, y = YEAR) {
  const m = Array(12).fill(0); list.forEach(x => { const d = dateFn(x); if (inYear(d, y)) m[monthOf(d)] += valFn(x); }); return m;
}
function internalDash() {
  const st = ps('dashboard', { mode: 'bulan', kat: '', page: 1 });
  const now = new Date(), M = now.getMonth();
  const poY = S.po.filter(p => ACTIVE_PO(p) && inYear(p.tanggal));
  const total = poY.reduce((a, p) => a + p.total, 0);
  const series = monthlySeries(poY, p => p.total, p => p.tanggal);
  const growth = series[M - 1] ? ((series[M] - series[M - 1]) / series[M - 1] * 100) : 0;
  const pending = S.po.filter(p => p.status === 'Menunggu Approval');
  const urgent = pending.filter(p => p.prioritas === 'Urgent').length;
  const bastMonth = S.bast.filter(b => b.status === 'Ditandatangani' && String(b.tanggal).slice(0, 7) === UI.iso().slice(0, 7));
  const fullOk = bastMonth.filter(b => Store.bastItems(b.id).every(d => d.qty_diterima >= d.qty_po && /baik/i.test(d.kondisi))).length;
  const siap = S.invoice.filter(i => i.status === 'Disetujui');
  const lastM = Math.max(M, 0);
  const shown = st.mode === 'kuartal' ? [0, 1, 2, 3].map(q => ({ l: 'TW ' + ['I', 'II', 'III', 'IV'][q], v: series.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0) })) : series.slice(0, Math.max(lastM + 1, 1)).map((v, i) => ({ l: UI.BLN[i].toUpperCase(), v }));
  const peakI = series.indexOf(Math.max(...series));
  const avg = series.slice(0, M + 1).reduce((a, b) => a + b, 0) / (M + 1);
  const cats = [...new Set(S.po.map(p => p.kategori).filter(Boolean))];
  const recent = S.po.filter(p => !st.kat || p.kategori === st.kat).slice().sort((a, b) => (b.created_at || b.tanggal) > (a.created_at || a.tanggal) ? 1 : -1);
  const pg = UI.paginate(recent, st.page, 5);
  return pageHead({
    eyebrow: `<span class="tag">Overview Sistem Pengadaan</span> • Tahun Anggaran ${YEAR}`,
    title: `Dashboard Pengadaan ${E(S.settings.RS_NAMA || '')}`,
    sub: 'Pusat kendali status kontrak, verifikasi fisik alkes, dan pelunasan termin pengadaan BLUD.',
    actions: `<button class="btn btn-outline" data-act="dash.export">${I('down')} Unduh Rekap Bulanan</button>${can('poEdit') ? `<a class="btn" href="#/po-form">${I('plus')} Buat PO Baru</a>` : ''}`
  }) + `<div class="grid g4">
    ${kpi({ lbl: 'Total Pengadaan Aktif', val: RP(total), ico: 'wallet', foot: `${I('trend')} ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% vs bulan lalu`, fc: growth < 0 ? 'muted' : '' })}
    ${kpi({ lbl: 'PO Menunggu Approval', val: pending.length + ' Dokumen', ico: 'clipcheck', ic: 'r', foot: urgent ? `<b>!</b> ${urgent} urgent membutuhkan tindakan PPK` : 'Tidak ada yang mendesak', fc: urgent ? 'warn' : 'muted' })}
    ${kpi({ lbl: 'BAPB Disahkan Bulan Ini', val: bastMonth.length + ' Dokumen', ico: 'shield', ic: 'g', foot: `${I('check')} ${bastMonth.length ? Math.round(fullOk / bastMonth.length * 100) : 100}% verifikasi fisik lengkap` })}
    ${kpi({ lbl: 'Tagihan Siap Dibayar', val: RP(siap.reduce((a, i) => a + i.netto, 0)), ico: 'money', ic: 'g', foot: `${I('share')} ${new Set(siap.map(i => i.vendor_id)).size} vendor terverifikasi`, fc: 'muted' })}
  </div>
  <div class="grid g-2-1 mt">
    <div class="card"><div class="card-head"><div style="flex:1"><h3>Tren Belanja & Pengadaan Farmasi/Alkes ${YEAR}</h3><p>Realisasi pengadaan obat, BMHP, reagen laboratorium, dan pemeliharaan alat medis (PO disetujui)</p></div>
      <div class="seg"><button class="${st.mode === 'bulan' ? 'on' : ''}" data-act="dash.mode" data-v="bulan">Bulanan</button><button class="${st.mode === 'kuartal' ? 'on' : ''}" data-act="dash.mode" data-v="kuartal">Kuartal</button></div></div>
      <div class="statline mb"><div><div class="k">Puncak Pengadaan (${peakI > -1 && series[peakI] ? UI.BULAN[peakI] : '-'})</div><div class="v">${RP(series[peakI] || 0)}</div></div><div><div class="k">Rata-rata Bulanan</div><div class="v" style="color:var(--primary)">${RP(avg)}</div></div></div>
      ${UI.barChart(shown)}
      <div class="legend mt-s"><span><i style="background:#3d6a8c"></i>Pengadaan Rutin Medis</span><span class="spacer"></span><span><i style="background:#0e5e3c"></i>Periode Pengadaan Terbesar</span></div></div>
    <div class="card"><div class="card-head"><div style="flex:1"><h3 class="row"><span style="width:8px;height:8px;border-radius:50%;background:var(--danger);display:inline-block"></span> Perlu Tindakan</h3><p>Dokumen yang mendekati tenggat waktu administrasi.</p></div>${(() => { const a = actionItems(); return `<span class="pill-lbl pl-red">${a.length} Penting</span>`; })()}</div>
      ${actionItems().slice(0, 4).map(a => `<div class="act-item"><div class="top"><span class="pill-lbl ${a.cls}">${a.tag}</span><span class="mono xs muted">${a.when}</span></div><div class="tt">${E(a.title)}</div><div class="ds">${E(a.desc)}</div><div class="row"><b class="mono small">${a.val}</b><span class="spacer"></span><a class="btn btn-sm ${a.btnCls || ''}" href="${a.href}">${a.btn}</a></div></div>`).join('') || UI.empty('Tidak ada tindakan tertunda 🎉', 'check')}
      <div class="row mt-s act-item" style="background:#fff;border:1px solid var(--border)"><span class="small">Semua audit log sinkron GAS</span><span class="spacer"></span><span style="color:var(--success)">${I('shield')}</span></div></div>
  </div>
  <div class="card pad-0 mt"><div class="card-head" style="padding:18px 20px 0"><div class="ic">${I('receipt')}</div><div style="flex:1"><h3>Purchase Order Terbaru</h3><p>Daftar transaksi pengadaan barang medis & non-medis terkini</p></div>
    <select class="select tinted" style="width:auto" data-ch="dash.kat">${UI.opt(cats, st.kat, 'Semua Kategori')}</select><button class="icon-btn" data-act="me.refresh" title="Muat ulang">${I('refresh')}</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nomor PO</th><th>Nama Vendor</th><th>Kategori</th><th>Tanggal</th><th class="num">Nilai Kontrak</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${pg.rows.map(p => `<tr><td class="mono">${E(p.nomor_po || '…')}</td><td>${vendorCell(Store.vendor(p.vendor_id))}</td><td class="small">${E(p.kategori || '-')}</td><td class="mono small">${TGL(p.tanggal)}</td><td class="num">${RP(p.total)}</td><td>${CHIP(p.status)}</td><td><a class="btn btn-soft btn-sm" href="#/${p.status === 'Draft' && can('poEdit') ? 'po-form/' : 'po/'}${p.id}">${p.status === 'Draft' && can('poEdit') ? 'Edit' : 'Detail'}</a></td></tr>`).join('') || `<tr><td colspan="7">${UI.empty('Belum ada PO')}</td></tr>`}
    </tbody></table></div>${UI.pager(pg, 'dash.page', 'Purchase Order')}</div>`;
}
function actionItems() {
  const r = S.user.role, out = [];
  const exp = S.vendors.filter(v => v.izin_exp && UI.daysTo(v.izin_exp) != null && UI.daysTo(v.izin_exp) <= 30 && v.status !== 'Nonaktif');
  if (r === 'PPK') {
    S.po.filter(p => p.status === 'Menunggu Approval').sort((a, b) => (b.prioritas === 'Urgent') - (a.prioritas === 'Urgent')).forEach(p => out.push({ tag: p.prioritas === 'Urgent' ? 'URGENT PPK' : 'APPROVAL PO', cls: p.prioritas === 'Urgent' ? 'pl-red' : 'pl-blue', when: TGL(p.tanggal), title: p.paket || p.kategori || p.nomor_po, desc: p.nomor_po + ' · ' + vName(p.vendor_id), val: RP(p.total), btn: 'Tinjau PO', href: '#/approval/' + p.id }));
    S.invoice.filter(i => i.status === 'Menunggu Verifikasi').forEach(i => out.push({ tag: 'VERIFIKASI INVOICE', cls: 'pl-amber', when: 'Jatuh tempo ' + TGL(i.jatuh_tempo), title: i.nomor_invoice, desc: vName(i.vendor_id), val: RP(i.netto), btn: 'Verifikasi', href: '#/approval/inv:' + i.id }));
  }
  if (r === 'PPTK' || r === 'ADMIN') S.po.filter(p => ['Disetujui PPK', 'BAST Parsial'].includes(p.status)).forEach(p => out.push({ tag: p.status === 'BAST Parsial' ? 'SISA PENERIMAAN' : 'SIAP DITERIMA', cls: 'pl-green', when: p.tgl_kirim ? 'Kirim ' + TGL(p.tgl_kirim) : TGL(p.tanggal), title: 'BAPB ' + (p.paket || p.kategori || ''), desc: p.nomor_po + ' · ' + vName(p.vendor_id), val: RP(p.total), btn: 'Input BAPB', btnCls: 'btn-success', href: '#/bast-form/' + p.id }));
  if (r === 'PENGADAAN' || r === 'ADMIN') {
    S.po.filter(p => p.status === 'Ditolak').forEach(p => out.push({ tag: 'REVISI PO', cls: 'pl-red', when: TGL(p.tgl_approval), title: p.nomor_po, desc: 'Catatan PPK: ' + (p.catatan_ppk || '-'), val: RP(p.total), btn: 'Perbaiki', href: '#/po-form/' + p.id }));
    const billed = new Set(S.invoice.filter(i => i.status !== 'Ditolak').map(i => i.bast_id));
    S.bast.filter(b => b.status === 'Ditandatangani' && !billed.has(b.id)).forEach(b => out.push({ tag: 'SIAP DITAGIH', cls: 'pl-green', when: TGL(b.tanggal), title: b.nomor_bast, desc: vName(b.vendor_id), val: RP(Store.bastItems(b.id).reduce((a, d) => a + d.qty_diterima * d.harga, 0)), btn: 'Buat Invoice', href: '#/invoice/new:' + b.id }));
  }
  if (r === 'ADMIN' || r === 'PPK') S.invoice.filter(i => i.status === 'Disetujui').forEach(i => out.push({ tag: 'SIAP SP2D', cls: 'pl-blue', when: 'Jatuh tempo ' + TGL(i.jatuh_tempo), title: i.nomor_invoice, desc: vName(i.vendor_id), val: RP(i.netto), btn: 'Catat Bayar', href: '#/invoice/' + i.id }));
  exp.forEach(v => out.push({ tag: 'PERINGATAN IZIN', cls: 'pl-amber', when: 'Sisa ' + UI.daysTo(v.izin_exp) + ' Hari', title: v.nama, desc: 'Masa berlaku izin/berkas legalitas ' + TGL(v.izin_exp), val: v.kode || '', btn: 'Perbarui', btnCls: 'btn-outline', href: '#/vendor/' + v.id }));
  return out;
}
Act['dash.mode'] = el => { ps('dashboard').mode = el.dataset.v; App.refreshCurrent(); };
Act['dash.kat'] = el => { const s = ps('dashboard'); s.kat = el.value; s.page = 1; App.refreshCurrent(); };
Act['dash.page'] = el => { ps('dashboard').page = +el.dataset.page; App.refreshCurrent(); };
Act['dash.export'] = () => {
  const m = UI.BULAN.map((b, i) => {
    const p = S.po.filter(x => ACTIVE_PO(x) && inYear(x.tanggal) && monthOf(x.tanggal) === i);
    const inv = S.invoice.filter(x => x.status === 'Dibayar' && inYear(x.tgl_bayar) && monthOf(x.tgl_bayar) === i);
    return { Bulan: b, 'Jumlah PO': p.length, 'Nilai PO (Rp)': p.reduce((a, x) => a + x.total, 0), 'BAPB Disahkan': S.bast.filter(x => x.status === 'Ditandatangani' && inYear(x.tanggal) && monthOf(x.tanggal) === i).length, 'Pembayaran (Rp)': inv.reduce((a, x) => a + x.netto, 0) };
  });
  UI.exportExcel('Rekap_Bulanan_Pengadaan_' + YEAR, { 'Rekap Bulanan': m, 'Daftar PO': S.po.map(poRow) });
};
const poRow = p => ({ 'Nomor PO': p.nomor_po, Tanggal: p.tanggal, Vendor: vName(p.vendor_id), Unit: p.unit, Kategori: p.kategori, 'Sumber Dana': p.sumber_dana, Subtotal: p.subtotal, PPN: p.ppn, Total: p.total, Status: p.status, Prioritas: p.prioritas, 'Disetujui Oleh': p.disetujui_oleh });

function vendorPortal() {
  const v = Store.vendor(S.user.vendor_id) || {};
  const active = S.po.filter(p => !['Selesai', 'Ditolak'].includes(p.status));
  const nilai = S.po.filter(p => ACTIVE_PO(p) && inYear(p.tanggal)).reduce((a, p) => a + p.total, 0);
  const waiting = S.invoice.filter(i => i.status !== 'Dibayar' && i.status !== 'Ditolak');
  const paid = S.invoice.filter(i => i.status === 'Dibayar');
  return pageHead({ eyebrow: `<span class="tag">Portal Rekanan</span> • ${E(v.kode || '')}`, title: E(v.nama || 'Portal Vendor'), sub: 'Pantau status pesanan, serah terima barang, dan pembayaran tagihan Anda secara real-time.', extra: CHIP(v.status) }) +
    `<div class="grid g4">${kpi({ lbl: 'PO Aktif', val: active.length + ' <small>Pesanan</small>', ico: 'receipt' })}${kpi({ lbl: 'Nilai PO TA ' + YEAR, val: RP(nilai), ico: 'wallet', accent: true })}${kpi({ lbl: 'BAPB (Barang Diterima)', val: S.bast.length + ' <small>Dokumen</small>', ico: 'clipcheck', ic: 'g' })}${kpi({ lbl: 'Tagihan Diproses', val: RP(waiting.reduce((a, i) => a + i.netto, 0)), ico: 'money', ic: 'a', foot: paid.length + ' tagihan sudah dibayar', fc: 'muted' })}</div>
    <div class="card pad-0 mt"><div class="card-head" style="padding:18px 20px 0"><div class="ic">${I('receipt')}</div><div style="flex:1"><h3>Status Pesanan Anda</h3><p>Setiap tahap diperbarui otomatis oleh sistem RSUD</p></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nomor PO</th><th>Paket / Unit</th><th>Tanggal</th><th class="num">Nilai</th><th style="min-width:340px">Progres</th><th></th></tr></thead><tbody>
    ${S.po.map(p => `<tr><td class="mono">${E(p.nomor_po)}</td><td>${E(p.paket || p.kategori || '-')}<div class="sub">${E(p.unit || '')}</div></td><td class="mono small">${TGL(p.tanggal)}</td><td class="num">${RP(p.total)}</td><td>${steps(p)}</td><td><a class="btn btn-soft btn-sm" href="#/po/${p.id}">Detail</a></td></tr>`).join('') || `<tr><td colspan="6">${UI.empty('Belum ada pesanan')}</td></tr>`}
    </tbody></table></div></div>
    <div class="info-box mt">${I('info')}<span>Anda hanya dapat melihat data transaksi milik perusahaan Anda. Pertanyaan terkait pesanan hubungi Pejabat Pengadaan ${E(S.settings.RS_NAMA || '')}.</span></div>`;
}

/* =====================================================================
   DAFTAR VENDOR
   ===================================================================== */
const VSTAT = ['Aktif Terverifikasi', 'Menunggu Verifikasi', 'Dokumen Expired', 'Nonaktif'];
Pages.vendor = {
  title: 'Daftar Vendor', deps: ['vendors', 'po', 'users'],
  render(el, param) {
    if (isVendor()) { el.innerHTML = vendorProfile(Store.vendor(S.user.vendor_id)); return; }
    el.innerHTML = vendorList();
    openFromParam(el, 'vendor', param, Store.vendor(param), vendorDrawer);
  }
};
function vendorStats(v) { const p = S.po.filter(x => x.vendor_id === v.id && ACTIVE_PO(x)); return { n: p.length, total: p.reduce((a, x) => a + x.total, 0), done: p.filter(x => x.status === 'Selesai').length }; }
function vendorFiltered() {
  const st = ps('vendor', { q: '', kat: '', status: '', page: 1, size: 10, sel: {} });
  const q = st.q.toLowerCase();
  return S.vendors.filter(v => (!q || (v.nama + ' ' + v.npwp + ' ' + v.nib + ' ' + v.pic_nama + ' ' + v.email + ' ' + v.kode).toLowerCase().includes(q)) && (!st.kat || v.kategori === st.kat) && (!st.status || v.status === st.status))
    .sort((a, b) => a.nama.localeCompare(b.nama));
}
function vendorList() {
  const st = ps('vendor', { q: '', kat: '', status: '', page: 1, size: 10, sel: {} });
  const list = vendorFiltered();
  const pg = UI.paginate(list, st.page, st.size);
  const aktif = S.vendors.filter(v => v.status === 'Aktif Terverifikasi').length;
  const kritis = S.vendors.filter(v => v.status === 'Menunggu Verifikasi' || v.status === 'Dokumen Expired' || (v.izin_exp && UI.daysTo(v.izin_exp) <= 30));
  const berjalan = S.po.filter(p => ['Disetujui PPK', 'BAST Parsial', 'BAST Terbit', 'Menunggu Approval'].includes(p.status));
  const newThisYear = S.vendors.filter(v => inYear(v.created_at)).length;
  const cats = [...new Set(S.vendors.map(v => v.kategori).filter(Boolean))].sort();
  const exp = S.vendors.filter(v => v.izin_exp && UI.daysTo(v.izin_exp) >= 0 && UI.daysTo(v.izin_exp) <= 30).sort((a, b) => a.izin_exp > b.izin_exp ? 1 : -1);
  return pageHead({
    eyebrow: `<span class="tag navy">Manajemen Rekanan // ${E(S.settings.RS_NAMA || '')} BLUD</span> • Kemenkes E-Katalog Sinkron`, title: 'Daftar Rekanan Vendor',
    sub: `Database rekanan resmi farmasi, alat kesehatan, dan logistik penunjang terverifikasi ${E(S.settings.RS_NAMA_LENGKAP || '')}.`,
    actions: `<button class="btn btn-outline" data-act="vendor.status" data-v="Menunggu Verifikasi">${I('clipcheck')} Cek Kelayakan Legalitas</button>${can('vendorEdit') ? `<a class="btn" href="#/vendor-form">${I('plus')} Tambah Vendor Baru</a>` : ''}`
  }) + `<div class="grid g4">
    ${kpi({ lbl: 'Total Rekanan Terdaftar', val: S.vendors.length + ' <small>Vendor</small>', ico: 'building', foot: `${I('trend')} +${newThisYear} terdaftar tahun ${YEAR}` })}
    ${kpi({ lbl: 'Rekanan Aktif Operasional', val: aktif + ' <small>Vendor</small>', ico: 'shield', ic: 'g', foot: '● Berkas NIB, NPWP & SDAK valid' })}
    ${kpi({ lbl: 'Verifikasi / Masa Kritis', val: kritis.length + ' <small>Rekanan</small>', ico: 'clock', ic: 'a', foot: `${I('alert')} Perlu verifikasi / perpanjangan izin`, fc: 'warn' })}
    ${kpi({ lbl: 'Nilai Kontrak Berjalan', val: RP(berjalan.reduce((a, p) => a + p.total, 0)), ico: 'money', accent: true, foot: `${berjalan.length} paket PO aktif`, fc: 'muted' })}
  </div>
  <div class="card mt"><div class="filters">
    <div class="input-ic">${I('search')}<input class="input tinted" placeholder="Cari nama vendor, NPWP, NIB, PIC atau email" value="${E(st.q)}" data-in="vendor.q"></div>
    <select class="select tinted" data-ch="vendor.kat">${UI.opt(cats, st.kat, 'Semua Kategori')}</select>
    <select class="select tinted" data-ch="vendor.statusSel">${UI.opt(VSTAT, st.status, 'Semua Status')}</select>
    <button class="btn btn-soft" data-act="vendor.export">${I('excel')} Ekspor Excel</button>
  </div>${st.q || st.kat || st.status ? `<div class="row small mt-s"><span class="mono xs">Filter diterapkan:</span>${[st.q && 'Cari: ' + st.q, st.kat, st.status].filter(Boolean).map(f => `<span class="tag-mini">${E(f)}</span>`).join('')}<button class="btn btn-ghost btn-xs" data-act="vendor.reset">Reset semua</button></div>` : ''}</div>
  <div class="card pad-0 mt" id="vendor-table">${vendorTable(pg)}</div>
  <div class="grid g3 mt">
    <div class="card"><div class="eyebrow" style="color:var(--success-dark)">Integrasi SI-Kemkes & LKPP</div><h3>Validasi Legalitas Otomatis</h3><p class="small muted">Setiap rekanan wajib memiliki NIB OSS-RBA, NPWP, dan izin distribusi yang masih berlaku sebelum menerima PO.</p>
      <div class="row act-item mt-s"><span class="avatar a1" style="width:44px;height:44px;font-size:14px">${S.vendors.length ? Math.round(aktif / S.vendors.length * 100) : 0}%</span><div><b>Kepatuhan Rekanan</b><div class="xs mono muted">${aktif} dari ${S.vendors.length} berkas lengkap valid</div></div></div></div>
    <div class="card"><div class="eyebrow">Batas Kadaluarsa Izin</div><h3>Peringatan Berkas Mendatang</h3><p class="small muted">Rekanan dengan masa berlaku izin ≤ 30 hari kalender.</p>
      ${exp.slice(0, 4).map(v => `<a class="row act-item" style="text-decoration:none;color:inherit" href="#/vendor/${v.id}"><span class="small ellipsis" style="flex:1">${E(v.nama)}</span><span class="mono xs" style="color:var(--danger);font-weight:600">Sisa ${UI.daysTo(v.izin_exp)} Hari</span></a>`).join('') || UI.empty('Tidak ada berkas kritis', 'check')}</div>
    <div class="card" style="background:var(--primary);color:#dbe9f4;border:0"><div class="eyebrow" style="color:#94f4ad">Panduan Vendor BLUD</div><h3 style="color:#fff">Import & Template Rekanan</h3><p class="small" style="color:#c9dcea">Unduh template CSV untuk mendaftarkan banyak rekanan sekaligus, lalu impor kembali. Data ganda (NPWP sama) otomatis dilewati.</p>
      <div class="row mt-s"><button class="btn btn-outline btn-sm" data-act="vendor.tplcsv">${I('down')} Template CSV</button>${can('vendorEdit') ? `<button class="btn btn-soft btn-sm" data-act="vendor.importcsv">${I('upload')} Import CSV</button>` : ''}</div></div>
  </div>`;
}
function vendorTable(pg) {
  const st = ps('vendor');
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"><input type="checkbox" data-ch="vendor.selAll"></th><th>Nama Vendor & Kategori</th><th>NIB / NPWP Perusahaan</th><th>Kontak & PIC Rekanan</th><th>Transaksi & Nilai PO</th><th>Status Legalitas</th><th></th></tr></thead><tbody>
  ${pg.rows.map(v => { const s = vendorStats(v); return `<tr class="${v.status === 'Dokumen Expired' ? 'row-danger' : ''}"><td><input type="checkbox" data-ch="vendor.sel" data-id="${v.id}" ${st.sel[v.id] ? 'checked' : ''}></td>
    <td>${vendorCell(v, `<span class="tag-mini">${E(v.kategori || '-')}</span> <span class="mono xs muted">ID: ${E(v.kode || '…')}</span>`)}</td>
    <td class="mono xs">NIB: ${E(v.nib || '-')}<br>NPWP: ${E(v.npwp || '-')}</td>
    <td class="small">${v.telepon ? `<div class="row" style="gap:5px">${I('phone', 'x')}<span class="mono xs">${E(v.telepon)}</span></div>` : ''}<div class="mono xs muted">${E(v.email || '')}</div>${v.pic_nama ? `<div class="xs">${E(v.pic_nama)}</div>` : ''}</td>
    <td><div class="num">${RP(s.total)}</div><div class="mono xs muted">${s.n} Paket PO · ${s.done} selesai</div></td>
    <td>${CHIP(v.status)}${v.izin_exp && UI.daysTo(v.izin_exp) <= 30 ? `<div class="mono xs" style="color:var(--danger);margin-top:4px">Izin: ${TGL(v.izin_exp)}</div>` : ''}</td>
    <td class="row" style="gap:2px"><a class="icon-btn" href="#/vendor/${v.id}" title="Detail">${I('eye')}</a>${can('vendorEdit') ? `<a class="icon-btn" href="#/vendor-form/${v.id}" title="Edit">${I('edit')}</a>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="7">${UI.empty('Tidak ada vendor sesuai filter', 'building')}</td></tr>`}
  </tbody></table></div><div class="row" style="padding:0 16px">${Object.keys(st.sel).length ? `<span class="small">${Object.keys(st.sel).length} dipilih</span><button class="btn btn-ghost btn-sm" data-act="vendor.exportSel">${I('excel')} Ekspor terpilih</button>` : ''}<span class="spacer"></span><span class="mono xs muted">Baris per halaman</span><select class="select input-sm" style="width:70px" data-ch="vendor.size">${UI.opt([10, 25, 50, 100], st.size)}</select></div>${UI.pager(pg, 'vendor.page', 'Rekanan')}`;
}
function updVendorTable() { const el = document.getElementById('vendor-table'); if (el) el.innerHTML = vendorTable(UI.paginate(vendorFiltered(), ps('vendor').page, ps('vendor').size)); }
Act['vendor.q'] = UI.debounce(el => { const s = ps('vendor'); s.q = el.value; s.page = 1; updVendorTable(); }, 120);
Act['vendor.kat'] = el => { const s = ps('vendor'); s.kat = el.value; s.page = 1; App.refreshCurrent(); };
Act['vendor.statusSel'] = el => { const s = ps('vendor'); s.status = el.value; s.page = 1; App.refreshCurrent(); };
Act['vendor.status'] = el => { const s = ps('vendor'); s.status = el.dataset.v; s.page = 1; App.refreshCurrent(); };
Act['vendor.reset'] = () => { Object.assign(ps('vendor'), { q: '', kat: '', status: '', page: 1 }); App.refreshCurrent(); };
Act['vendor.page'] = el => { ps('vendor').page = +el.dataset.page; updVendorTable(); };
Act['vendor.size'] = el => { const s = ps('vendor'); s.size = +el.value; s.page = 1; updVendorTable(); };
Act['vendor.sel'] = el => { const s = ps('vendor'); if (el.checked) s.sel[el.dataset.id] = 1; else delete s.sel[el.dataset.id]; updVendorTable(); };
Act['vendor.selAll'] = el => { const s = ps('vendor'); UI.paginate(vendorFiltered(), s.page, s.size).rows.forEach(v => { if (el.checked) s.sel[v.id] = 1; else delete s.sel[v.id]; }); updVendorTable(); };
const vendorRow = v => ({ Kode: v.kode, Nama: v.nama, 'Bentuk Usaha': v.bentuk_usaha, Kategori: v.kategori, NIB: v.nib, NPWP: v.npwp, Alamat: v.alamat, Kota: v.kota, Provinsi: v.provinsi, PIC: v.pic_nama, Telepon: v.telepon, Email: v.email, Bank: v.bank, 'No Rekening': v.no_rekening, 'Masa Berlaku Izin': v.izin_exp, Status: v.status, 'Nilai PO': vendorStats(v).total });
Act['vendor.export'] = () => UI.exportExcel('Daftar_Rekanan_' + UI.iso(), { Rekanan: vendorFiltered().map(vendorRow) });
Act['vendor.exportSel'] = () => UI.exportExcel('Rekanan_Terpilih_' + UI.iso(), { Rekanan: S.vendors.filter(v => ps('vendor').sel[v.id]).map(vendorRow) });
Act['vendor.tplcsv'] = () => UI.downloadText('template_import_rekanan.csv', UI.toCSV([{ nama: 'PT Contoh Medika', bentuk_usaha: 'PT', kategori: 'Farmasi & Obat', nib: '1234567890123', npwp: '01.234.567.8-901.000', alamat: 'Jl. Contoh No. 1', provinsi: 'Jambi', kota: 'Kota Jambi', kode_pos: '36124', pic_nama: 'Nama PIC', pic_jabatan: 'Direktur', telepon: '081234567890', email: 'email@contoh.co.id', bank: 'Bank Jambi', no_rekening: '1010200000', nama_rekening: 'PT CONTOH MEDIKA', izin_exp: '2027-12-31' }]), 'text/csv');
Act['vendor.importcsv'] = () => csvImport('Vendor', 'Import Rekanan dari CSV', rows => { Store.S.vendors = rows; Store.upsertMany('vendors', []); });

/** Modal import CSV generik (Vendor / Barang_Jasa) dengan dry-run */
function csvImport(table, title, onDone) {
  const m = UI.modal({ title, size: 'lg', body: `<div class="drop" id="csv-drop">${I('upload')}<div><b>Pilih file CSV</b> atau tarik ke sini</div><div class="xs muted">Pemisah koma atau titik koma · baris pertama = header</div><input type="file" accept=".csv,text/csv" id="csv-file" hidden></div><div id="csv-res" class="mt"></div>`, foot: `<button class="btn btn-outline" data-close>Tutup</button><button class="btn" id="csv-run" disabled>Jalankan Import</button>` });
  let rows = [];
  const drop = m.q('#csv-drop'), inp = m.q('#csv-file');
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); };
  inp.onchange = () => inp.files[0] && load(inp.files[0]);
  async function load(f) {
    rows = UI.parseCSV(await f.text());
    m.q('#csv-res').innerHTML = `<div class="skel" style="height:60px"></div>`;
    try {
      const r = await API.call('importRows', { table, rows, dryRun: true });
      const rep = r.data.report;
      m.q('#csv-res').innerHTML = `<div class="grid g3"><div class="card flat"><div class="lbl mono xs">DI FILE</div><h2>${rows.length}</h2></div><div class="card flat"><div class="mono xs">AKAN DITAMBAH</div><h2 style="color:var(--success)">${rep.inserted}</h2></div><div class="card flat"><div class="mono xs">DILEWATI (sudah ada/ganda)</div><h2>${rep.skipped + rep.updated}</h2></div></div>${r.data.warnings.map(w => `<div class="info-box mt-s">${I('alert')}${E(w)}</div>`).join('')}`;
      m.q('#csv-run').disabled = !rep.inserted;
    } catch (e) { m.q('#csv-res').innerHTML = `<div class="err">${E(e.message)}</div>`; }
  }
  m.q('#csv-run').onclick = async () => {
    UI.busy(m.q('#csv-run'), true);
    try { const r = await API.call('importRows', { table, rows }); onDone(r.data.rows); UI.toast(r.data.report.inserted + ' data diimpor', 'ok'); m.close(); App.refreshData(true); }
    catch (e) { UI.toast(e.message, 'err'); UI.busy(m.q('#csv-run'), false); }
  };
}

function vendorDocs(v) {
  const docs = Array.isArray(v.dokumen) ? v.dokumen : [];
  return docs.length ? docs.map(d => `<div class="file-row">${I('pdf', 'fi')}<div style="flex:1;min-width:0"><div class="mono small ellipsis">${E(d.name)}</div><div class="mono xs muted">${d.size ? UI.fsize(d.size) + ' · ' : ''}${E(d.jenis || 'Dokumen')}</div></div>${UI.driveUrl(d.fileId) ? `<a class="icon-btn" target="_blank" rel="noopener" href="${UI.driveUrl(d.fileId)}">${I('ext')}</a>` : ''}</div>`).join('') : '<div class="small muted">Belum ada dokumen legalitas diunggah.</div>';
}
function vendorDrawer(id, onClose) {
  const v = Store.vendor(id); if (!v) return;
  const pos = S.po.filter(p => p.vendor_id === id).sort((a, b) => b.tanggal > a.tanggal ? 1 : -1);
  const acc = S.users.filter(u => u.vendor_id === id);
  const kv = (k, val, mono) => `<div><div class="mono xs muted">${k}</div><div class="${mono ? 'mono small' : ''}">${E(val || '-')}</div></div>`;
  const m = UI.modal({
    drawer: true, onClose, title: E(v.nama), sub: `${E(v.kode || '')} · ${E(v.kategori || '')}`,
    body: `<div class="row wrap mb">${CHIP(v.status)}${v.izin_exp ? `<span class="chip ${UI.daysTo(v.izin_exp) <= 30 ? 'st-red' : 'st-gray'} nodot">Izin s.d. ${TGL(v.izin_exp)}</span>` : ''}</div>
      <div class="grid g2" style="gap:14px">${kv('BENTUK USAHA', v.bentuk_usaha)}${kv('NIB', v.nib, 1)}${kv('NPWP', v.npwp, 1)}${kv('ID LKPP', v.lkpp_id, 1)}<div class="span-all">${kv('ALAMAT', [v.alamat, v.kota, v.provinsi, v.kode_pos].filter(Boolean).join(', '))}</div>${kv('PIC', (v.pic_nama || '') + (v.pic_jabatan ? ' — ' + v.pic_jabatan : ''))}${kv('TELEPON', v.telepon, 1)}${kv('EMAIL', v.email, 1)}${kv('BANK', v.bank)}${kv('NO. REKENING', v.no_rekening, 1)}${kv('NAMA REKENING', v.nama_rekening)}</div>
      <h3 class="mt">Dokumen Legalitas</h3>${vendorDocs(v)}
      <div class="file-row">${I('pen', 'fi')}<div style="flex:1"><div class="small">Tanda tangan pimpinan (spesimen)</div><div class="xs muted">${v.ttd_file_id ? 'Tersimpan — dibubuhkan pada Invoice & BASTP' : 'Belum ada — dokumen memakai TTD basah'}</div></div>${v.ttd_file_id ? `<span class="chip st-green nodot">Ada</span>` : '<span class="chip st-gray nodot">Kosong</span>'}</div>
      <h3 class="mt">Akun Portal</h3>${acc.map(u => `<div class="file-row">${I('user', 'fi')}<div style="flex:1"><div class="small">${E(u.email)}</div><div class="xs muted">${E(u.status)} · login terakhir ${u.last_login ? UI.ago(u.last_login) : '-'}</div></div></div>`).join('') || '<div class="small muted">Belum ada akun portal (isi email vendor untuk membuat otomatis).</div>'}
      <h3 class="mt">Riwayat PO (${pos.length})</h3><div class="tbl-wrap"><table class="tbl"><tbody>${pos.slice(0, 10).map(p => `<tr class="clickable" data-act="go" data-href="po/${p.id}"><td class="mono small">${E(p.nomor_po)}</td><td class="small">${TGL(p.tanggal)}</td><td class="num small">${RP(p.total)}</td><td>${CHIP(p.status)}</td></tr>`).join('') || `<tr><td>${UI.empty('Belum ada transaksi')}</td></tr>`}</tbody></table></div>`,
    foot: can('vendorEdit') ? `<select class="select" style="width:auto" id="vd-st">${UI.opt(VSTAT, v.status)}</select><button class="btn btn-outline" id="vd-st-ok">Ubah Status</button><span class="spacer"></span><button class="btn btn-outline-danger" id="vd-del">${I('trash')}</button><a class="btn" href="#/vendor-form/${v.id}">${I('edit')} Edit</a>` : ''
  });
  m.el.addEventListener('click', e => { if (e.target.closest('a[href^="#/"],[data-act="go"]')) m.close(); });
  if (!can('vendorEdit')) return;
  m.q('#vd-st-ok').onclick = () => {
    const status = m.q('#vd-st').value; if (status === v.status) return;
    const payload = { ...v, status };
    API.mutate({ label: 'Status vendor', apply: () => Store.upsert('vendors', { id: v.id, status }), rollback: old => Store.upsert('vendors', old), run: () => API.call('saveVendor', payload), successMsg: 'Status vendor diperbarui: ' + status });
    m.close();
  };
  m.q('#vd-del').onclick = async () => {
    if (!await UI.confirm('Hapus vendor?', `Vendor <b>${E(v.nama)}</b> akan dihapus. Jika sudah memiliki riwayat PO, statusnya diubah menjadi Nonaktif.`, { danger: true, ok: 'Hapus' })) return;
    m.close();
    const hasPO = S.po.some(p => p.vendor_id === v.id);
    API.mutate({ label: 'Hapus vendor', apply: () => hasPO ? Store.upsert('vendors', { id: v.id, status: 'Nonaktif' }) : Store.remove('vendors', v.id), rollback: old => Store.upsert('vendors', old || v), run: () => API.call('deleteVendor', { id: v.id }) });
  };
}
Act['go'] = el => App.go(el.dataset.href);

function vendorProfile(v) {
  if (!v) return UI.empty('Profil vendor tidak ditemukan');
  return pageHead({ eyebrow: `<span class="tag">Profil Perusahaan</span>`, title: E(v.nama), sub: 'Data rekanan terdaftar. Perubahan data dilakukan melalui Pejabat Pengadaan RSUD.', extra: CHIP(v.status) }) +
    `<div class="grid g2"><div class="card"><div class="card-head"><div class="ic">${I('building')}</div><h3>Identitas & Kontak</h3></div><div class="grid g2" style="gap:14px">
      ${[['KODE REKANAN', v.kode], ['BENTUK USAHA', v.bentuk_usaha], ['NIB', v.nib], ['NPWP', v.npwp], ['KATEGORI', v.kategori], ['ID LKPP', v.lkpp_id], ['PIC', v.pic_nama], ['TELEPON', v.telepon], ['EMAIL', v.email], ['MASA BERLAKU IZIN', TGL(v.izin_exp)]].map(([k, x]) => `<div><div class="mono xs muted">${k}</div><div>${E(x || '-')}</div></div>`).join('')}
      <div class="span-all"><div class="mono xs muted">ALAMAT</div>${E([v.alamat, v.kota, v.provinsi].filter(Boolean).join(', '))}</div></div></div>
    <div class="card"><div class="card-head"><div class="ic">${I('bank')}</div><h3>Rekening Pembayaran</h3></div><div class="grid g2" style="gap:14px">${[['BANK', v.bank], ['NO. REKENING', v.no_rekening], ['NAMA REKENING', v.nama_rekening]].map(([k, x]) => `<div><div class="mono xs muted">${k}</div><div class="mono">${E(x || '-')}</div></div>`).join('')}</div>
      <h3 class="mt">Dokumen Legalitas</h3>${vendorDocs(v)}
      <h3 class="mt">Tanda Tangan Pimpinan</h3><div class="file-row">${I('pen', 'fi')}<span class="small" style="flex:1">${v.ttd_file_id ? 'Spesimen TTD tersimpan' : 'Belum ada spesimen TTD'}</span><button class="btn btn-soft btn-sm" data-act="me.ttd">${v.ttd_file_id ? 'Ubah' : 'Unggah'} TTD</button></div></div></div>`;
}

/* ---------- FORM TAMBAH / EDIT VENDOR ---------- */
Pages['vendor-form'] = {
  title: 'Tambah Rekanan', keep: true, roles: CAN.vendorEdit,
  render(el, id) {
    const v = id ? Store.vendor(id) : null;
    let d = v ? { ...v } : null;
    if (!v) { try { d = JSON.parse(localStorage.getItem('vms_draft_vendor') || 'null'); } catch (e) { } }
    d = d || { id: UI.uid(), dokumen: [] };
    d.dokumen = Array.isArray(d.dokumen) ? d.dokumen : [];
    el._vf = d;
    const f = (name, label, o = {}) => `<div class="field ${o.full ? 'full' : ''}"><label>${label}${o.req ? ' <span class="req">*</span>' : ''}${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</label>${o.select ? `<select class="select" name="${name}">${UI.opt(o.select, d[name], o.ph)}</select>` : o.textarea ? `<textarea class="textarea" name="${name}" rows="2">${E(d[name] || '')}</textarea>` : `<div class="${o.icon ? 'input-ic' : ''}">${o.icon ? I(o.icon) : ''}<input class="input ${o.mono ? 'mono' : ''}" name="${name}" type="${o.type || 'text'}" value="${E(d[name] || '')}" placeholder="${E(o.ph || '')}" ${o.req ? 'required' : ''}></div>`}</div>`;
    el.innerHTML = `<a href="#/vendor" class="row small" style="text-decoration:underline;gap:6px">${I('back', '')} Kembali ke Daftar Rekanan</a>` +
      pageHead({ title: v ? 'Edit Rekanan' : 'Tambah Rekanan Baru', sub: `Registrasi dan verifikasi kepatuhan rekanan pengadaan barang & jasa ${E(S.settings.RS_NAMA || '')}`, actions: `<div class="card flat row" style="padding:10px 14px;gap:16px"><div><div class="mono xs muted">REFERENSI ${v ? 'REKANAN' : 'DRAFT'}</div><b class="mono">${E(v ? v.kode : 'VND-REG-' + YEAR)}</b></div><span class="ok-t">${I('shield')} Form Kualifikasi SIK-04</span></div>` }) +
      `<form id="vform" class="grid g-3-2" autocomplete="off">
      <div class="stack">
        <div class="card"><div class="card-head"><div class="ic">${I('building')}</div><div style="flex:1"><h3>1. Profil & Identitas Perusahaan</h3><p>Legalitas formal badan usaha penyedia layanan medis & non-medis</p></div><span class="mono xs muted">Bagian 1 dari 4</span></div>
          <div class="form-grid">${f('nama', 'Nama Badan Usaha / PT / CV', { req: 1, full: 1, hint: 'Sesuai Akta Pendirian' })}${f('bentuk_usaha', 'Bentuk Usaha', { req: 1, select: ['Perseroan Terbatas (PT)', 'Commanditaire Vennootschap (CV)', 'Koperasi', 'Usaha Dagang (UD)', 'Perorangan'], ph: 'Pilih' })}${f('kategori', 'Kategori Pengadaan', { req: 1, select: ['Farmasi & Obat', 'Alat Kesehatan', 'Reagen & Laboratorium', 'BMHP', 'Gas Medis', 'Linen & Seragam', 'Pemeliharaan Alkes', 'Jasa Lainnya'].concat(d.kategori && !['Farmasi & Obat', 'Alat Kesehatan', 'Reagen & Laboratorium', 'BMHP', 'Gas Medis', 'Linen & Seragam', 'Pemeliharaan Alkes', 'Jasa Lainnya'].includes(d.kategori) ? [d.kategori] : []), ph: 'Pilih kategori' })}
          ${f('nib', 'Nomor Induk Berusaha (NIB)', { req: 1, mono: 1, hint: '13 digit OSS' })}${f('npwp', 'NPWP Perusahaan (15/16 Digit)', { req: 1, mono: 1, ph: '01.234.567.8-901.000' })}${f('alamat', 'Alamat Lengkap Kantor / Gudang Distribusi', { req: 1, full: 1, textarea: 1 })}${f('provinsi', 'Provinsi', { ph: 'Jambi' })}${f('kota', 'Kota / Kabupaten', { ph: 'Kota Jambi' })}${f('kode_pos', 'Kode Pos', { mono: 1 })}${f('izin_exp', 'Masa Berlaku Izin Distribusi', { type: 'date' })}</div></div>
        <div class="card"><div class="card-head"><div class="ic">${I('users')}</div><div style="flex:1"><h3>2. Kontak Person & Akun Portal Vendor</h3><p>Penunjukan petugas resmi perantara korespondensi & pengadaan</p></div><span class="mono xs muted">Bagian 2 dari 4</span></div>
          <div class="info-box mb">${I('mail')}<span><b>Aktivasi Akun Otomatis:</b> email yang didaftarkan akan menerima kredensial Portal Rekanan secara otomatis setelah data disimpan.</span></div>
          <div class="form-grid">${f('pic_nama', 'Nama Lengkap PIC', { req: 1 })}${f('pic_jabatan', 'Jabatan PIC')}${f('telepon', 'Nomor Telepon / WhatsApp Aktif', { req: 1, icon: 'phone', mono: 1, type: 'tel' })}${f('email', 'Alamat Email Resmi Rekanan', { req: 1, icon: 'mail', type: 'email' })}${f('lkpp_id', 'ID Penyedia E-Katalog LKPP / INAPROC', { full: 1, hint: 'Opsional / Disarankan', mono: 1 })}</div></div>
      </div>
      <div class="stack">
        <div class="card"><div class="card-head"><div class="ic">${I('bank')}</div><div style="flex:1"><h3>3. Rekening Bank (BLUD)</h3><p>Penyaluran SP2D & kliring pembayaran kas RSUD</p></div><span class="mono xs muted">Bagian 3 dari 4</span></div>
          <div class="stack">${f('bank', 'Nama Bank Pembayaran Rekanan', { req: 1, select: ['Bank Jambi', 'Bank Mandiri', 'BRI', 'BNI', 'BSI', 'BCA', 'Bank Lainnya'].concat(d.bank && !['Bank Jambi', 'Bank Mandiri', 'BRI', 'BNI', 'BSI', 'BCA', 'Bank Lainnya'].includes(d.bank) ? [d.bank] : []), ph: 'Pilih bank' })}${f('no_rekening', 'Nomor Rekening Perusahaan', { req: 1, mono: 1 })}${f('nama_rekening', 'Nama Pemilik Rekening', { req: 1 })}<div class="help">${I('info', '')} Harus sama persis dengan nama badan usaha pada buku rekening koran.</div></div></div>
        <div class="card"><div class="card-head"><div class="ic" style="background:#d6f5df;color:var(--success)">${I('shield')}</div><div style="flex:1"><h3>4. Dokumen Legalitas & Sertifikasi</h3><p>Prasyarat kepatuhan audit BPK & Inspektorat Daerah</p></div><span class="mono xs" style="color:var(--success-dark);font-weight:600">Wajib PDF</span></div>
          <div class="drop" data-act="vf.pick">${I('cloud')}<div>Tarik berkas PDF atau <u>Klik untuk Unggah</u></div><div class="xs muted">NIB, NPWP, Izin PBF/IPAK, CDOB, Rekening Koran · maks 15 MB</div><input type="file" id="vf-files" accept="application/pdf,image/*" multiple hidden></div>
          <div class="mono xs muted mt">BERKAS TERLAMPIR (<span id="vf-cnt">${d.dokumen.length}</span> DOKUMEN)</div><div id="vf-docs"></div>
          <label class="check act-item mt"><input type="checkbox" name="pernyataan" ${v ? 'checked' : ''}><span class="small">Saya menyatakan dengan sungguh-sungguh bahwa seluruh berkas legalitas dan rincian rekanan ini sah, mutakhir, serta dapat dipertanggungjawabkan di hadapan hukum sesuai ketentuan pengadaan BLUD ${E(S.settings.RS_NAMA || '')}.</span></label>
        </div>
        <div class="card"><div class="card-head"><div class="ic">${I('pen')}</div><div style="flex:1"><h3>5. Tanda Tangan Pimpinan</h3><p>Dibubuhkan otomatis pada Invoice &amp; BAST Hasil Pekerjaan (opsional — bisa juga TTD basah)</p></div></div>
          <div id="vf-ttd"></div></div>
      </div></form>
      <div class="sticky-bar"><span class="row small">${I('shield')} Audit Trail: <span class="code-pill">GAS ID: LOG-VND-${YEAR}</span></span><span class="small muted" id="vf-draft"></span><span class="spacer"></span><a class="btn btn-outline" href="#/vendor" data-act="vf.cancel">Batal</a><button class="btn" data-act="vf.save">${I('check')} ${v ? 'Simpan Perubahan' : 'Simpan Rekanan Baru'}</button></div>`;
    renderVfDocs(el);
    el._ttd = UI.ttdPicker(el.querySelector('#vf-ttd'), { spesimen: d.ttd_file_id || '', modes: d.ttd_file_id ? ['spesimen', 'pad', 'upload'] : ['kosong', 'pad', 'upload'], value: d.ttd_file_id ? 'spesimen' : 'kosong' });
    const form = el.querySelector('#vform');
    const inp = el.querySelector('#vf-files');
    inp.onchange = () => { vfUpload(el, [...inp.files]); inp.value = ''; };
    const drop = el.querySelector('.drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); vfUpload(el, [...e.dataTransfer.files]); };
    if (!v) form.addEventListener('input', UI.debounce(() => { try { localStorage.setItem('vms_draft_vendor', JSON.stringify(Object.assign({}, el._vf, UI.formData(form)))); el.querySelector('#vf-draft').textContent = 'Draft tersimpan otomatis ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); } catch (e) { } }, 600));
  }
};
function renderVfDocs(el) {
  const d = el._vf;
  el.querySelector('#vf-cnt').textContent = d.dokumen.length;
  el.querySelector('#vf-docs').innerHTML = d.dokumen.map((x, i) => `<div class="file-row">${I('pdf', 'fi')}<div style="flex:1;min-width:0"><div class="mono small ellipsis">${E(x.name)}</div><div class="mono xs ${x.fileId ? '' : 'muted'}" style="color:${x.fileId ? 'var(--success-dark)' : ''}">${x.size ? UI.fsize(x.size) + ' • ' : ''}${x.fileId ? 'Terunggah' : x.err ? '<span style="color:var(--danger)">Gagal: ' + E(x.err) + '</span>' : 'Mengunggah…'}</div></div><select class="select input-sm" style="width:130px" data-ch="vf.jenis" data-i="${i}">${UI.opt(['NIB', 'NPWP', 'Izin PBF/IPAK', 'Sertifikat CDOB', 'Rekening Koran', 'Akta Pendirian', 'Lainnya'], x.jenis)}</select><button type="button" class="icon-btn" data-act="vf.rm" data-i="${i}">${I('x')}</button></div>`).join('');
}
async function vfUpload(el, files) {
  const d = el._vf, form = el.querySelector('#vform');
  const vname = form.nama.value || 'Rekanan_Baru';
  for (const f of files) {
    if (f.size > 15 * 1048576) { UI.toast(f.name + ' melebihi 15 MB', 'err'); continue; }
    const rec = { name: f.name, size: f.size, jenis: /npwp/i.test(f.name) ? 'NPWP' : /nib/i.test(f.name) ? 'NIB' : /cdob/i.test(f.name) ? 'Sertifikat CDOB' : /rek|tabungan/i.test(f.name) ? 'Rekening Koran' : 'Lainnya' };
    d.dokumen.push(rec); renderVfDocs(el);
    try {
      const c = await UI.compressImage(f);
      const r = await API.call('uploadFile', { vendor_id: Store.vendor(d.id) ? d.id : '', vendor_name: vname, base64: c.base64, name: c.name, mime: c.mime }, { timeout: 120000 });
      Object.assign(rec, { fileId: r.data[0].fileId, name: r.data[0].name });
    } catch (e) { rec.err = e.message; }
    if (document.body.contains(el)) renderVfDocs(el);
  }
}
Act['vf.pick'] = el => el.closest('section').querySelector('#vf-files').click();
Act['vf.rm'] = el => { const sec = el.closest('section'); sec._vf.dokumen.splice(+el.dataset.i, 1); renderVfDocs(sec); };
Act['vf.jenis'] = el => { el.closest('section')._vf.dokumen[+el.dataset.i].jenis = el.value; };
Act['vf.cancel'] = () => { try { localStorage.removeItem('vms_draft_vendor'); } catch (e) { } App.invalidate('vendor-form'); };
Act['vf.save'] = el => {
  const sec = el.closest('section'), form = sec.querySelector('#vform'), d = sec._vf;
  const x = UI.formData(form);
  const need = { nama: 'Nama badan usaha', alamat: 'Alamat', npwp: 'NPWP', telepon: 'Telepon', email: 'Email', pic_nama: 'PIC', bank: 'Bank', no_rekening: 'No. rekening', nama_rekening: 'Nama rekening' };
  form.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));
  const miss = Object.keys(need).filter(k => !x[k]);
  if (miss.length) { miss.forEach(k => form[k] && form[k].classList.add('invalid')); form[miss[0]].focus(); UI.toast('Lengkapi: ' + miss.map(k => need[k]).join(', '), 'err'); return; }
  const nd = x.npwp.replace(/\D/g, '');
  if (nd.length < 15 || nd.length > 16) { form.npwp.classList.add('invalid'); form.npwp.focus(); UI.toast('NPWP harus 15 atau 16 digit', 'err'); return; }
  if (S.vendors.some(v => v.id !== d.id && String(v.npwp).replace(/\D/g, '') === nd)) { UI.toast('NPWP sudah terdaftar pada rekanan lain', 'err'); return; }
  if (!x.pernyataan) { UI.toast('Centang pernyataan keabsahan berkas', 'err'); return; }
  if (d.dokumen.some(z => !z.fileId && !z.err)) { UI.toast('Tunggu hingga semua berkas selesai diunggah', 'warn'); return; }
  delete x.pernyataan;
  const existed = !!Store.vendor(d.id);
  const ttd = sec._ttd ? sec._ttd.get() : { mode: 'kosong' };
  const payload = Object.assign({}, existed ? Store.vendor(d.id) : {}, x, { id: d.id, dokumen: d.dokumen.filter(z => z.fileId).map(({ name, fileId, size, jenis }) => ({ name, fileId, size, jenis })) });
  const local = Object.assign({ kode: 'VND-…', status: 'Menunggu Verifikasi', created_at: new Date().toISOString() }, payload);
  API.mutate({
    label: 'Simpan rekanan', apply: () => Store.upsert('vendors', local),
    rollback: old => existed ? Store.upsert('vendors', old) : Store.remove('vendors', d.id),
    run: () => API.call('saveVendor', payload),
    onSuccess: r => {
      Store.upsert('vendors', r.data.vendor);
      if (r.data.user) Store.upsert('users', r.data.user);
      if (ttd.mode === 'gambar') API.call('saveTtd', { target: 'vendor', id: r.data.vendor.id, base64: ttd.base64 }).then(t => { DocImg.put(t.data.file_id, ttd.base64); Store.upsert('vendors', { id: r.data.vendor.id, ttd_file_id: t.data.file_id }); UI.toast('TTD pimpinan tersimpan', 'ok'); }).catch(e => UI.toast('TTD gagal disimpan: ' + e.message, 'err'));
      if (r.data.account) UI.modal({ title: 'Akun Portal Rekanan dibuat', body: `<p>Kredensial telah dikirim ke email rekanan. Simpan juga informasi berikut untuk diserahkan bila diperlukan:</p><div class="act-item"><div class="mono small">Email: <b>${E(r.data.account.email)}</b></div><div class="mono small">Password sementara: <b>${E(r.data.account.password)}</b></div></div><p class="small muted">Rekanan wajib mengganti password saat login pertama.</p>`, foot: '<button class="btn" data-close>Mengerti</button>' });
    }
  });
  try { localStorage.removeItem('vms_draft_vendor'); } catch (e) { }
  App.invalidate('vendor-form');
  App.go('vendor');
};

/* =====================================================================
   PURCHASE ORDER
   ===================================================================== */
const PO_TABS = [{ id: '', l: 'Semua' }, { id: 'Draft', l: 'Draft' }, { id: 'Menunggu Approval', l: 'Menunggu Approval' }, { id: 'Disetujui PPK', l: 'Disetujui' }, { id: 'BAST', l: 'Penerimaan' }, { id: 'Selesai', l: 'Selesai' }, { id: 'Ditolak', l: 'Ditolak / Revisi' }];
Pages.po = {
  title: 'Purchase Order', deps: ['po', 'poDetail', 'vendors', 'bast', 'invoice', 'barang'],
  render(el, param) {
    const st = ps('po', { tab: '', q: '', vendor: '', page: 1, view: 'list' });
    if (st.view === 'barang' && can('poEdit')) { el.innerHTML = poHead(st) + barangView(); return; }
    el.innerHTML = poHead(st) + poListView();
    openFromParam(el, 'po', param, Store.po(param), poDrawer);
  }
};
function poHead(st) {
  return pageHead({
    eyebrow: `<span class="tag">Modul Pengadaan</span> • Siklus PO TA ${YEAR}`, title: isVendor() ? 'Pesanan (PO) Saya' : 'Purchase Order (PO)',
    sub: isVendor() ? 'Daftar surat pesanan yang diterbitkan untuk perusahaan Anda.' : 'Pembuatan, pengajuan, dan pemantauan surat pesanan barang/jasa ke rekanan.',
    actions: can('poEdit') ? `<div class="seg"><button class="${st.view !== 'barang' ? 'on' : ''}" data-act="po.view" data-v="list">Daftar PO</button><button class="${st.view === 'barang' ? 'on' : ''}" data-act="po.view" data-v="barang">Master Barang/Jasa</button></div><a class="btn" href="#/po-form">${I('plus')} Buat PO Baru</a>` : ''
  });
}
function poFiltered() {
  const st = ps('po'); const q = st.q.toLowerCase();
  return S.po.filter(p => (!st.tab || (st.tab === 'BAST' ? ['BAST Parsial', 'BAST Terbit'].includes(p.status) : p.status === st.tab)) && (!st.vendor || p.vendor_id === st.vendor) &&
    (!q || (p.nomor_po + ' ' + vName(p.vendor_id) + ' ' + p.paket + ' ' + p.unit + ' ' + p.kategori).toLowerCase().includes(q)))
    .sort((a, b) => (b.created_at || b.tanggal) > (a.created_at || a.tanggal) ? 1 : -1);
}
function poListView() {
  const st = ps('po');
  const cnt = id => S.po.filter(p => !id || (id === 'BAST' ? ['BAST Parsial', 'BAST Terbit'].includes(p.status) : p.status === id)).length;
  return `<div class="card pad-0"><div style="padding:14px 16px 0">${tabsBar('po.tab', PO_TABS.filter(t => !isVendor() || t.id !== 'Draft').map(t => ({ ...t, n: cnt(t.id) })), st.tab)}
    <div class="filters" style="padding-bottom:14px"><div class="input-ic">${I('search')}<input class="input tinted" placeholder="Cari nomor PO, vendor, paket, unit…" value="${E(st.q)}" data-in="po.q"></div>
    ${isVendor() ? '' : `<select class="select tinted" data-ch="po.vendor">${UI.opt(S.vendors.map(v => ({ v: v.id, l: v.nama })), st.vendor, 'Semua Vendor')}</select>`}<button class="btn btn-soft" data-act="po.export">${I('excel')} Ekspor</button></div></div>
    <div id="po-table">${poTable()}</div></div>`;
}
function poTable() {
  const pg = UI.paginate(poFiltered(), ps('po').page, 15);
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nomor PO</th><th>Vendor</th><th>Paket / Unit</th><th>Tanggal</th><th class="num">Nilai (incl. PPN)</th><th>Status</th><th></th></tr></thead><tbody>
  ${pg.rows.map(p => `<tr class="clickable" data-act="go" data-href="po/${p.id}"><td class="mono">${E(p.nomor_po || '(menunggu nomor)')}${p.prioritas === 'Urgent' ? ' <span class="chip st-red nodot">URGENT</span>' : ''}</td><td>${vendorCell(Store.vendor(p.vendor_id))}</td><td>${E(p.paket || p.kategori || '-')}<div class="sub">${E(p.unit || '')}</div></td><td class="mono small">${TGL(p.tanggal)}</td><td class="num">${RP(p.total)}</td><td>${CHIP(p.status)}</td><td>${I('next')}</td></tr>`).join('') || `<tr><td colspan="7">${UI.empty('Tidak ada PO', 'receipt')}</td></tr>`}
  </tbody></table></div>${UI.pager(pg, 'po.page', 'PO')}`;
}
const updPoTable = () => { const el = document.getElementById('po-table'); if (el) el.innerHTML = poTable(); };
Act['po.tab'] = el => { const s = ps('po'); s.tab = el.dataset.v; s.page = 1; App.refreshCurrent(); };
Act['po.q'] = UI.debounce(el => { const s = ps('po'); s.q = el.value; s.page = 1; updPoTable(); }, 120);
Act['po.vendor'] = el => { const s = ps('po'); s.vendor = el.value; s.page = 1; updPoTable(); };
Act['po.page'] = el => { ps('po').page = +el.dataset.page; updPoTable(); };
Act['po.view'] = el => { ps('po').view = el.dataset.v; App.refreshCurrent(); };
Act['po.export'] = () => UI.exportExcel('Daftar_PO_' + UI.iso(), { PO: poFiltered().map(poRow), 'Detail Item': poFiltered().flatMap(p => Store.poItems(p.id).map(d => ({ 'Nomor PO': p.nomor_po, Item: d.nama, Qty: d.qty, Satuan: d.satuan, Harga: d.harga, Subtotal: d.subtotal }))) });

function poDrawer(id, onClose) {
  const p = Store.po(id); if (!p) return;
  const items = Store.poItems(id), basts = Store.bastOfPO(id), invs = Store.invOfPO(id);
  const approved = ['Disetujui PPK', 'BAST Parsial', 'BAST Terbit', 'Selesai'].includes(p.status);
  const m = UI.modal({
    drawer: true, onClose, title: `<span class="mono">${E(p.nomor_po || '(menunggu nomor)')}</span>`, sub: E(vName(p.vendor_id)) + ' · ' + TGL(p.tanggal, 1),
    body: `<div class="row wrap">${CHIP(p.status)}${p.prioritas === 'Urgent' ? '<span class="chip st-red nodot">URGENT</span>' : ''}<span class="spacer"></span><b class="num" style="font-size:18px;color:var(--primary-deep)">${RP(p.total)}</b></div>${steps(p)}
      ${p.status === 'Ditolak' && p.catatan_ppk ? `<div class="info-box mt" style="background:var(--danger-tint);color:var(--danger-text)">${I('alert')}<span><b>Catatan PPK:</b> ${E(p.catatan_ppk)}</span></div>` : ''}
      <div class="grid g2 mt" style="gap:12px">${[['UNIT PEMESAN', p.unit], ['KATEGORI', p.kategori], ['KEGIATAN', p.kegiatan], ['SUB KEGIATAN', p.sub_kegiatan], ['PEKERJAAN / PAKET', p.paket], ['KODE REKENING', p.kode_rekening], ['SUMBER DANA', p.sumber_dana], ['RUJUKAN E-KATALOG', p.rujukan], ['TGL BARANG DITERIMA', TGL(p.tgl_kirim)], ['WAKTU PENYELESAIAN', p.waktu_penyelesaian ? p.waktu_penyelesaian + ' hari kalender' : ''], ['DIBUAT OLEH', p.dibuat_oleh], ['DISETUJUI', p.disetujui_oleh ? p.disetujui_oleh + ' · ' + TGL(p.tgl_approval) : '-']].map(([k, v]) => `<div><div class="mono xs muted">${k}</div><div class="small">${E(v || '-')}</div></div>`).join('')}</div>
      ${p.keterangan ? `<div class="small mt-s"><span class="mono xs muted">KETERANGAN</span><br>${E(p.keterangan)}</div>` : ''}
      <h3 class="mt">Rincian Item (${items.length})</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Uraian</th><th class="num">Qty</th><th class="num">Harga</th><th class="num">Jumlah</th></tr></thead><tbody>${items.map(d => `<tr><td>${E(d.nama)}<div class="sub">${E(d.spesifikasi || '')}</div></td><td class="num">${UI.num(d.qty)} ${E(d.satuan)}</td><td class="num">${UI.num(d.harga)}</td><td class="num">${UI.num(d.subtotal)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3" class="right">Subtotal</td><td class="num">${UI.num(p.subtotal)}</td></tr><tr><td colspan="3" class="right">PPN</td><td class="num">${UI.num(p.ppn)}</td></tr><tr><td colspan="3" class="right">TOTAL</td><td class="num">${RP(p.total)}</td></tr></tfoot></table></div>
      ${basts.length ? `<h3 class="mt">BAPB (Penerimaan)</h3>${basts.map(b => `<a class="file-row" style="text-decoration:none;color:inherit" href="#/bast/${b.id}">${I('clipcheck', 'fi')}<div style="flex:1"><div class="mono small">${E(b.nomor_bast)}</div><div class="xs muted">${TGL(b.tanggal)} · ${E(b.kesimpulan || '')}</div></div>${CHIP(b.status)}</a>`).join('')}` : ''}
      ${invs.length ? `<h3 class="mt">Invoice</h3>${invs.map(i => `<a class="file-row" style="text-decoration:none;color:inherit" href="#/invoice/${i.id}">${I('money', 'fi')}<div style="flex:1"><div class="mono small">${E(i.nomor_invoice)}</div><div class="xs muted">Netto ${RP(i.netto)}</div></div>${CHIP(i.status)}</a>`).join('')}` : ''}
      ${p.doc_file_id ? `<h3 class="mt">Dokumen Resmi</h3><a class="file-row" target="_blank" rel="noopener" href="${UI.driveUrl(p.doc_file_id)}">${I('pdf', 'fi')}<div style="flex:1" class="mono small">SP_${E(p.nomor_po)}.pdf</div>${I('ext')}</a>` : ''}`,
    foot: `<button class="btn ${approved ? '' : 'btn-outline'}" data-act="po.print" data-id="${p.id}">${I('print')} Cetak SP / PDF</button><span class="spacer"></span>
      ${can('poEdit') && p.status === 'Draft' ? `<button class="btn btn-outline-danger" data-act="po.del" data-id="${p.id}">${I('trash')}</button>` : ''}
      ${can('poEdit') && ['Draft', 'Ditolak'].includes(p.status) ? `<a class="btn btn-outline" href="#/po-form/${p.id}">${I('edit')} Edit</a><button class="btn" data-act="po.submitQuick" data-id="${p.id}">Ajukan ke PPK</button>` : ''}
      ${can('poApprove') && p.status === 'Menunggu Approval' ? `<a class="btn btn-success" href="#/approval/${p.id}">${I('shield')} Tinjau & Setujui</a>` : ''}
      ${can('bastEdit') && ['Disetujui PPK', 'BAST Parsial'].includes(p.status) ? `<a class="btn btn-success" href="#/bast-form/${p.id}">${I('clipcheck')} Input BAPB</a>` : ''}`
  });
  m.el.addEventListener('click', e => { if (e.target.closest('a[href^="#/"],[data-act="po.del"],[data-act="po.submitQuick"]')) m.close(); });
}
Act['po.print'] = el => Doc.open('PO', el.dataset.id);
Act['po.del'] = async el => {
  const p = Store.po(el.dataset.id);
  if (!await UI.confirm('Hapus draft PO?', `Draft <b>${E(p.nomor_po)}</b> akan dihapus permanen.`, { danger: true, ok: 'Hapus' })) return;
  let det;
  API.mutate({ label: 'Hapus PO', apply: () => { det = Store.removeWhere('poDetail', d => d.po_id === p.id); return Store.remove('po', p.id); }, rollback: old => { Store.upsert('po', old); Store.upsertMany('poDetail', det); }, run: () => API.call('deletePO', { id: p.id }) });
  App.go('po');
};
Act['po.submitQuick'] = el => {
  const p = Store.po(el.dataset.id);
  const items = Store.poItems(p.id);
  API.mutate({
    label: 'Ajukan PO', apply: () => Store.upsert('po', { id: p.id, status: 'Menunggu Approval' }), rollback: old => Store.upsert('po', old),
    run: () => API.call('savePO', { ...p, items, submit: true }), onSuccess: r => { Store.upsert('po', r.data.po); Store.removeWhere('poDetail', d => d.po_id === p.id); Store.upsertMany('poDetail', r.data.details); }
  });
};

/* ---------- FORM PO ---------- */
Pages['po-form'] = {
  title: 'Form Purchase Order', keep: true, roles: CAN.poEdit,
  render(el, id) {
    const ex = id ? Store.po(id) : null;
    if (ex && !['Draft', 'Ditolak'].includes(ex.status)) { el.innerHTML = UI.empty('PO berstatus ' + E(ex.status) + ' tidak dapat diedit. <a href="#/po/' + ex.id + '">Lihat detail</a>', 'lock'); return; }
    let d;
    if (ex) d = { ...ex, items: Store.poItems(ex.id).map(x => ({ ...x })) };
    else { try { d = JSON.parse(localStorage.getItem('vms_draft_po') || 'null'); } catch (e) { } }
    d = d || { id: UI.uid(), tanggal: UI.iso(), prioritas: 'Normal', sumber_dana: 'APBD-BLUD ' + YEAR, kegiatan: S.settings.DEFAULT_KEGIATAN || '', sub_kegiatan: S.settings.DEFAULT_SUB_KEGIATAN || '', waktu_penyelesaian: Number(S.settings.DEFAULT_WAKTU) || 30, items: [{ id: UI.uid(), nama: '', qty: 1, satuan: '', harga: 0 }] };
    el._po = d;
    const vopts = S.vendors.filter(v => v.status !== 'Nonaktif').map(v => ({ v: v.id, l: v.nama + (v.status !== 'Aktif Terverifikasi' ? ' (' + v.status + ')' : '') }));
    const f = (n, l, o = {}) => `<div class="field ${o.full ? 'full' : ''}"><label>${l}${o.req ? ' <span class="req">*</span>' : ''}</label>${o.select ? `<select class="select" name="${n}">${UI.opt(o.select, d[n], o.ph)}</select>` : o.textarea ? `<textarea class="textarea" name="${n}" rows="2">${E(d[n] || '')}</textarea>` : `<input class="input ${o.mono ? 'mono' : ''}" name="${n}" type="${o.type || 'text'}" value="${E(d[n] == null ? '' : d[n])}" placeholder="${E(o.ph || '')}" ${o.list ? `list="${o.list}"` : ''}>`}</div>`;
    const units = [...new Set(S.po.map(p => p.unit).concat(['Instalasi Farmasi', 'Rawat Inap & ICU', 'Instalasi Bedah Sentral', 'Instalasi Lab Patologi Klinik', 'IGD', 'IPSRS', 'Radiologi']).filter(Boolean))];
    const cats = [...new Set(S.po.map(p => p.kategori).concat(['Obat Kronis & Generik', 'Alat Kesehatan', 'Reagen Laboratorium', 'BMHP', 'Gas Medis', 'Linen', 'Pemeliharaan Alkes']).filter(Boolean))];
    el.innerHTML = `<a href="#/po" class="row small" style="text-decoration:underline;gap:6px">${I('back')} Kembali ke Daftar PO</a>` + pageHead({ eyebrow: `<span class="tag">Pejabat Pengadaan</span> • ${ex ? 'Revisi' : 'PO Baru'}`, title: ex ? 'Edit ' + E(ex.nomor_po) : 'Buat Purchase Order', sub: 'Nomor PO dibuat otomatis oleh sistem. Harga satuan belum termasuk PPN.', extra: ex ? CHIP(ex.status) : '' }) +
      `${ex && ex.status === 'Ditolak' && ex.catatan_ppk ? `<div class="info-box mb" style="background:var(--danger-tint);color:var(--danger-text)">${I('alert')}<span><b>Catatan revisi PPK:</b> ${E(ex.catatan_ppk)}</span></div>` : ''}
      <form id="poform" autocomplete="off"><div class="card"><div class="card-head"><div class="ic">${I('receipt')}</div><div style="flex:1"><h3>1. Informasi Pesanan</h3><p>Rekanan penyedia dan rujukan pengadaan</p></div></div>
      <div class="grid g3" style="gap:16px">${f('vendor_id', 'Vendor / Penyedia', { req: 1, select: vopts, ph: 'Pilih rekanan…' })}${f('tanggal', 'Tanggal PO', { type: 'date', req: 1 })}${f('prioritas', 'Prioritas', { select: ['Normal', 'Urgent'] })}
      ${f('unit', 'Unit Pemesan', { list: 'dl-unit', req: 1 })}${f('kategori', 'Kategori Belanja', { list: 'dl-kat' })}${f('sumber_dana', 'Sumber Dana', { list: 'dl-dana' })}
      ${f('paket', 'Pekerjaan / Nama Paket (tercetak di SP)')}${f('rujukan', 'Rujukan / No. E-Katalog / E-Purchasing', { mono: 1 })}${f('kode_rekening', 'Kode Rekening Belanja', { mono: 1, list: 'dl-rek', ph: '5.1.02.01.001.00038 (Belanja Obat-obatan…)' })}
      ${f('kegiatan', 'Kegiatan', { list: 'dl-keg' })}${f('sub_kegiatan', 'Sub Kegiatan', { list: 'dl-subkeg' })}${f('waktu_penyelesaian', 'Waktu Penyelesaian (hari kalender)', { type: 'number', mono: 1 })}
      ${f('tgl_kirim', 'Tanggal Barang Diterima / Selesai', { type: 'date' })}${f('alamat_kirim', 'Alamat Pengiriman (kosong = alamat RS)', { ph: S.settings.RS_NAMA_DOK || '' })}<div class="field"><label>&nbsp;</label><div class="xs muted">Kosongkan tanggal agar dihitung otomatis: tanggal SP + waktu penyelesaian.</div></div>
      ${f('keterangan', 'Keterangan / Syarat Khusus', { full: 1, textarea: 1 })}</div>
      <datalist id="dl-unit">${units.map(u => `<option value="${E(u)}">`).join('')}</datalist><datalist id="dl-kat">${cats.map(u => `<option value="${E(u)}">`).join('')}</datalist><datalist id="dl-dana">${['APBD-BLUD ' + YEAR, 'DAK Fisik ' + YEAR, 'Pendapatan Fungsional BLUD', 'JKN'].map(u => `<option value="${E(u)}">`).join('')}</datalist>
      <datalist id="dl-rek">${[...new Set(S.po.map(p => p.kode_rekening).filter(Boolean))].map(u => `<option value="${E(u)}">`).join('')}</datalist><datalist id="dl-keg">${[...new Set(S.po.map(p => p.kegiatan).concat([S.settings.DEFAULT_KEGIATAN]).filter(Boolean))].map(u => `<option value="${E(u)}">`).join('')}</datalist><datalist id="dl-subkeg">${[...new Set(S.po.map(p => p.sub_kegiatan).concat([S.settings.DEFAULT_SUB_KEGIATAN]).filter(Boolean))].map(u => `<option value="${E(u)}">`).join('')}</datalist></div>
      <div class="card mt"><div class="card-head"><div class="ic">${I('box')}</div><div style="flex:1"><h3>2. Rincian Barang / Jasa</h3><p>Pilih dari master barang (harga HPS terisi otomatis) atau ketik item baru</p></div><button type="button" class="btn btn-soft btn-sm" data-act="pof.add">${I('plus')} Tambah Item</button></div>
      <datalist id="dl-brg">${S.barang.filter(b => b.status !== 'Nonaktif').map(b => `<option value="${E(b.nama)}">${E(b.satuan)} · HPS ${UI.num(b.harga_hps)}</option>`).join('')}</datalist>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:34px">No</th><th style="min-width:240px">Uraian Barang/Jasa</th><th style="min-width:160px">Spesifikasi / Batch</th><th style="width:100px" class="num">Qty</th><th style="width:100px">Satuan</th><th style="width:150px" class="num">Harga Satuan</th><th class="num" style="width:150px">Jumlah</th><th></th></tr></thead><tbody id="pof-items"></tbody></table></div>
      <div class="row mt" style="justify-content:flex-end"><div style="min-width:320px" id="pof-tot"></div></div></div></form>
      <div class="sticky-bar"><span class="small muted" id="pof-draft">${ex ? '' : 'Draft disimpan otomatis di perangkat ini'}</span><span class="spacer"></span><a class="btn btn-outline" href="#/po" data-act="pof.cancel">Batal</a><button class="btn btn-outline" data-act="pof.save" data-submit="0">Simpan Draft</button><button class="btn btn-success" data-act="pof.save" data-submit="1">${I('shield')} Ajukan ke PPK</button></div>`;
    renderPoItems(el);
    const form = el.querySelector('#poform');
    form.addEventListener('input', UI.debounce(() => {
      Object.assign(d, UI.formData(form)); delete d['']; readItems(el);
      if (!ex) try { localStorage.setItem('vms_draft_po', JSON.stringify(d)); el.querySelector('#pof-draft').textContent = 'Draft tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); } catch (e) { }
    }, 500));
  }
};
function readItems(el) {
  const d = el._po;
  el.querySelectorAll('#pof-items tr').forEach((tr, i) => { const it = d.items[i]; if (!it) return; tr.querySelectorAll('[data-f]').forEach(inp => { it[inp.dataset.f] = ['qty', 'harga'].includes(inp.dataset.f) ? Number(String(inp.value).replace(/\./g, '').replace(',', '.')) || 0 : inp.value; }); });
}
function renderPoItems(el) {
  const d = el._po;
  el.querySelector('#pof-items').innerHTML = d.items.map((it, i) => {
    const b = it.barang_id && Store.byId('barang', it.barang_id);
    const over = b && b.harga_hps && it.harga > b.harga_hps;
    return `<tr><td class="mono">${i + 1}</td><td><input class="input input-sm" data-f="nama" list="dl-brg" value="${E(it.nama)}" data-in="pof.pick" data-i="${i}" placeholder="Nama barang/jasa"></td><td><input class="input input-sm" data-f="spesifikasi" value="${E(it.spesifikasi || '')}"></td>
    <td><input class="input input-sm mono right" data-f="qty" inputmode="decimal" value="${it.qty}" data-in="pof.calc"></td><td><input class="input input-sm" data-f="satuan" value="${E(it.satuan || '')}"></td>
    <td><input class="input input-sm mono right ${over ? 'invalid' : ''}" data-f="harga" inputmode="numeric" value="${it.harga}" data-in="pof.calc" title="${over ? 'Melebihi HPS ' + UI.num(b.harga_hps) : ''}"></td><td class="num" data-sub="${i}">${UI.num(it.qty * it.harga)}</td>
    <td><button type="button" class="icon-btn" data-act="pof.rm" data-i="${i}" ${d.items.length < 2 ? 'disabled' : ''}>${I('trash')}</button></td></tr>`;
  }).join('');
  renderPoTot(el);
}
function renderPoTot(el) {
  const d = el._po, rate = Number(S.settings.PPN_RATE || 11);
  const sub = d.items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.harga) || 0), 0), ppn = Math.round(sub * rate / 100);
  el.querySelector('#pof-tot').innerHTML = `<div class="row small" style="justify-content:space-between"><span>Subtotal</span><span class="num">${RP(sub)}</span></div><div class="row small mt-s" style="justify-content:space-between"><span>PPN ${rate}%</span><span class="num">${RP(ppn)}</span></div>
    <div class="row mt-s" style="justify-content:space-between;border-left:3px solid var(--primary);background:var(--tint);padding:10px 12px"><b>Total</b><b class="num" style="font-size:18px;color:var(--primary-deep)">${RP(sub + ppn)}</b></div><div class="xs muted mt-s" style="font-style:italic">${E(terbilang(sub + ppn))}</div>`;
}
Act['pof.add'] = el => { const sec = el.closest('section'); readItems(sec); sec._po.items.push({ id: UI.uid(), nama: '', qty: 1, satuan: '', harga: 0 }); renderPoItems(sec); sec.querySelectorAll('#pof-items [data-f=nama]').forEach((x, i, a) => i === a.length - 1 && x.focus()); };
Act['pof.rm'] = el => { const sec = el.closest('section'); readItems(sec); sec._po.items.splice(+el.dataset.i, 1); renderPoItems(sec); };
Act['pof.calc'] = el => { const sec = el.closest('section'); readItems(sec); const i = +el.closest('tr').querySelector('[data-sub]').dataset.sub, it = sec._po.items[i]; sec.querySelector(`[data-sub="${i}"]`).textContent = UI.num(it.qty * it.harga); renderPoTot(sec); };
Act['pof.pick'] = el => {
  const sec = el.closest('section'); const b = S.barang.find(x => x.nama === el.value); const it = sec._po.items[+el.dataset.i];
  if (b && it.barang_id !== b.id) { readItems(sec); Object.assign(it, { barang_id: b.id, nama: b.nama, satuan: b.satuan, harga: b.harga_hps || it.harga, spesifikasi: it.spesifikasi || b.spesifikasi || '' }); renderPoItems(sec); }
  else if (!b) it.barang_id = '';
};
Act['pof.cancel'] = () => { try { localStorage.removeItem('vms_draft_po'); } catch (e) { } App.invalidate('po-form'); };
Act['pof.save'] = el => {
  const sec = el.closest('section'), form = sec.querySelector('#poform'), d = sec._po, submit = el.dataset.submit === '1';
  Object.assign(d, UI.formData(form)); delete d['']; readItems(sec);
  const items = d.items.filter(i => String(i.nama).trim());
  if (!d.vendor_id) { form.vendor_id.classList.add('invalid'); form.vendor_id.focus(); UI.toast('Pilih vendor terlebih dahulu', 'err'); return; }
  if (!d.unit) { form.unit.classList.add('invalid'); form.unit.focus(); UI.toast('Unit pemesan wajib diisi', 'err'); return; }
  if (!items.length) { UI.toast('Minimal 1 item barang/jasa', 'err'); return; }
  const bad = items.findIndex(i => !(i.qty > 0)); if (bad > -1) { UI.toast('Qty item #' + (bad + 1) + ' harus > 0', 'err'); return; }
  const rate = Number(S.settings.PPN_RATE || 11), sub = items.reduce((a, i) => a + i.qty * i.harga, 0), ppn = Math.round(sub * rate / 100);
  const existed = Store.po(d.id);
  d.waktu_penyelesaian = Number(d.waktu_penyelesaian) || 0;
  if (!d.tgl_kirim && d.waktu_penyelesaian) d.tgl_kirim = DC.addDays(d.tanggal, d.waktu_penyelesaian);
  const rec = { ...(existed || {}), ...d, subtotal: sub, ppn, total: sub + ppn, status: submit ? 'Menunggu Approval' : 'Draft', nomor_po: existed ? existed.nomor_po : '', dibuat_oleh: existed ? existed.dibuat_oleh : S.user.nama, created_at: existed ? existed.created_at : new Date().toISOString() };
  delete rec.items;
  const payload = { ...d, items, submit };
  let oldDet;
  API.mutate({
    label: submit ? 'Ajukan PO' : 'Simpan PO',
    apply: () => { oldDet = Store.removeWhere('poDetail', x => x.po_id === d.id); Store.upsertMany('poDetail', items.map((x, k) => ({ ...x, id: x.id || UI.uid(), po_id: d.id, subtotal: x.qty * x.harga, urut: k + 1 }))); return Store.upsert('po', rec); },
    rollback: old => { Store.removeWhere('poDetail', x => x.po_id === d.id); Store.upsertMany('poDetail', oldDet); existed ? Store.upsert('po', old) : Store.remove('po', d.id); },
    run: () => API.call('savePO', payload),
    onSuccess: r => { Store.upsert('po', r.data.po); Store.removeWhere('poDetail', x => x.po_id === d.id); Store.upsertMany('poDetail', r.data.details); }
  });
  try { localStorage.removeItem('vms_draft_po'); } catch (e) { }
  App.invalidate('po-form');
  App.go('po/' + d.id);
};

/* ---------- MASTER BARANG ---------- */
function barangView() {
  const st = ps('barang', { q: '', page: 1 }); const q = st.q.toLowerCase();
  const list = S.barang.filter(b => !q || (b.nama + ' ' + b.kode + ' ' + b.kategori).toLowerCase().includes(q)).sort((a, b) => a.nama.localeCompare(b.nama));
  const pg = UI.paginate(list, st.page, 20);
  return `<div class="card pad-0"><div class="filters" style="padding:14px 16px"><div class="input-ic">${I('search')}<input class="input tinted" placeholder="Cari barang/jasa…" value="${E(st.q)}" data-in="brg.q"></div><button class="btn btn-soft" data-act="brg.tpl">${I('down')} Template CSV</button><button class="btn btn-soft" data-act="brg.import">${I('upload')} Import CSV</button><button class="btn" data-act="brg.edit">${I('plus')} Tambah Barang</button></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Nama Barang/Jasa</th><th>Kategori</th><th>Satuan</th><th class="num">Harga HPS</th><th>Status</th><th></th></tr></thead><tbody>
  ${pg.rows.map(b => `<tr><td class="mono small">${E(b.kode || '…')}</td><td>${E(b.nama)}<div class="sub">${E(b.spesifikasi || '')}</div></td><td class="small">${E(b.kategori || '-')}</td><td>${E(b.satuan)}</td><td class="num">${RP(b.harga_hps)}</td><td>${CHIP(b.status || 'Aktif')}</td><td class="row"><button class="icon-btn" data-act="brg.edit" data-id="${b.id}">${I('edit')}</button><button class="icon-btn" data-act="brg.del" data-id="${b.id}">${I('trash')}</button></td></tr>`).join('') || `<tr><td colspan="7">${UI.empty('Belum ada master barang')}</td></tr>`}
  </tbody></table></div>${UI.pager(pg, 'brg.page', 'item')}</div>`;
}
Act['brg.q'] = UI.debounce(el => { const s = ps('barang'); s.q = el.value; s.page = 1; App.refreshCurrent(); setTimeout(() => { const i = document.querySelector('[data-in="brg.q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 200);
Act['brg.page'] = el => { ps('barang').page = +el.dataset.page; App.refreshCurrent(); };
Act['brg.tpl'] = () => UI.downloadText('template_master_barang.csv', UI.toCSV([{ kode: '', nama: 'Ceftriaxone 1g Injeksi', kategori: 'Obat', satuan: 'Vial', harga_hps: 28000, spesifikasi: 'Generik' }]), 'text/csv');
Act['brg.import'] = () => csvImport('Barang_Jasa', 'Import Master Barang/Jasa', rows => { Store.S.barang = rows; Store.upsertMany('barang', []); });
Act['brg.edit'] = el => {
  const b = el.dataset.id ? Store.byId('barang', el.dataset.id) : { id: UI.uid(), status: 'Aktif' };
  const m = UI.modal({ title: el.dataset.id ? 'Edit Barang/Jasa' : 'Tambah Barang/Jasa', body: `<form class="form-grid" id="bf"><div class="field full"><label>Nama <span class="req">*</span></label><input class="input" name="nama" value="${E(b.nama || '')}"></div><div class="field"><label>Kategori</label><input class="input" name="kategori" value="${E(b.kategori || '')}"></div><div class="field"><label>Satuan <span class="req">*</span></label><input class="input" name="satuan" value="${E(b.satuan || '')}"></div><div class="field"><label>Harga HPS (Rp)</label><input class="input mono" name="harga_hps" inputmode="numeric" value="${b.harga_hps || 0}"></div><div class="field"><label>Status</label><select class="select" name="status">${UI.opt(['Aktif', 'Nonaktif'], b.status)}</select></div><div class="field full"><label>Spesifikasi</label><input class="input" name="spesifikasi" value="${E(b.spesifikasi || '')}"></div></form>`, foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn" id="bok">Simpan</button>` });
  m.q('#bok').onclick = () => {
    const x = UI.formData(m.q('#bf')); if (!x.nama || !x.satuan) { UI.toast('Nama & satuan wajib', 'err'); return; }
    const rec = { ...b, ...x, harga_hps: Number(x.harga_hps) || 0 };
    const existed = !!Store.byId('barang', b.id);
    API.mutate({ label: 'Simpan barang', apply: () => Store.upsert('barang', rec), rollback: old => existed ? Store.upsert('barang', old) : Store.remove('barang', b.id), run: () => API.call('saveBarang', rec), onSuccess: r => Store.upsertMany('barang', r.data) });
    m.close();
  };
};
Act['brg.del'] = async el => {
  const b = Store.byId('barang', el.dataset.id);
  if (!await UI.confirm('Hapus barang?', `<b>${E(b.nama)}</b> akan dihapus (dinonaktifkan jika sudah dipakai PO).`, { danger: true, ok: 'Hapus' })) return;
  const used = S.poDetail.some(d => d.barang_id === b.id);
  API.mutate({ label: 'Hapus barang', apply: () => used ? Store.upsert('barang', { id: b.id, status: 'Nonaktif' }) : Store.remove('barang', b.id), rollback: old => Store.upsert('barang', old || b), run: () => API.call('deleteBarang', { id: b.id }) });
};
