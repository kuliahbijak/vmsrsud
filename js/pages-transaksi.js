/* ==========================================================================
   HALAMAN TRANSAKSI: Approval (PPK), BAST (PPTK), Invoice & Pembayaran,
   Kontrak, dan Generate Dokumen dari Template Google Docs.
   ========================================================================== */

/* ---------- Generate dokumen (dipakai semua modul) ---------- */
function genDocument(jenis, refId, { silent = false, manual = null } = {}) {
  const tpl = S.templates.find(t => t.jenis === jenis && t.status === 'Aktif');
  if (!tpl) { if (!silent) UI.toast('Belum ada template ' + jenis + ' aktif. Admin dapat mendaftarkannya di Kelola Template.', 'warn', 5000); return Promise.resolve(null); }
  const manualKeys = (tpl.placeholders || []).filter(p => (tpl.mapping || {})[p] === 'manual');
  const run = vals => {
    if (!silent) UI.toast('Membuat dokumen ' + jenis + ' dari template…');
    return API.call('generateDocument', { jenis, ref_id: refId, template_id: tpl.id, manual: vals || {} }, { timeout: 180000 }).then(r => {
      const t = { PO: 'po', BAST: 'bast', INVOICE: 'invoice', KONTRAK: 'kontrak' }[jenis];
      if (t && Store.byId(t, refId)) Store.upsert(t, { id: refId, doc_file_id: r.data.pdfId });
      UI.toast('Dokumen ' + jenis + ' siap di Google Drive' + (r.data.missing && r.data.missing.length ? ' (kosong: ' + r.data.missing.join(', ') + ')' : ''), 'ok', 5000);
      return r.data;
    }).catch(e => { UI.toast('Generate dokumen gagal: ' + e.message, 'err', 6000); return null; });
  };
  if (manualKeys.length && !manual) {
    return new Promise(res => {
      const m = UI.modal({ title: 'Lengkapi isian dokumen', sub: 'Template ' + E(tpl.nama) + ' memiliki isian manual', body: `<div class="stack">${manualKeys.map(k => `<div class="field"><label class="mono small">[${E(k)}]</label><input class="input" data-k="${E(k)}"></div>`).join('')}</div>`, foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn" id="gd-ok">${I('doc')} Generate</button>` });
      m.q('#gd-ok').onclick = () => { const v = {}; m.qa('[data-k]').forEach(i => v[i.dataset.k] = i.value); m.close(); res(run(v)); };
    });
  }
  return run(manual);
}
Act['doc.gen'] = el => genDocument(el.dataset.jenis, el.dataset.id);

/* =====================================================================
   APPROVAL (PPK)
   ===================================================================== */
Pages.approval = {
  title: 'Approval', roles: ['PPK'], deps: ['po', 'poDetail', 'invoice', 'kontrak', 'vendors'],
  render(el, param) {
    const st = ps('approval', { tab: 'po', filter: 'all', q: '', note: {}, zoom: 100 });
    if (param && param.startsWith('inv:')) st.tab = 'inv'; else if (param && param.startsWith('k:')) st.tab = 'kontrak'; else if (param) { st.tab = 'po'; st.sel = param; }
    const nPO = S.po.filter(p => p.status === 'Menunggu Approval').length, nInv = S.invoice.filter(i => i.status === 'Menunggu Verifikasi').length, nK = S.kontrak.filter(k => k.status === 'Menunggu Approval').length;
    el.innerHTML = pageHead({
      eyebrow: `<span class="tag navy">Modul Pejabat Pembuat Komitmen (PPK)</span> • Siklus Verifikasi APBD ${YEAR}`, title: 'Approval Purchase Order',
      extra: `<span class="chip st-blue nodot">${I('hourglass')} ${nPO + nInv + nK} Dokumen Menunggu Persetujuan</span>`,
      actions: `<div class="card flat row" style="padding:10px 14px"><span style="color:var(--success)">${I('shield')}</span><div><div class="mono xs muted">Otoritas Validasi</div><b class="small">Digital Signature PPK Aktif</b></div></div>`
    }) + tabsBar('appr.tab', [{ id: 'po', l: 'Purchase Order', n: nPO }, { id: 'inv', l: 'Invoice / Tagihan', n: nInv }, { id: 'kontrak', l: 'Kontrak', n: nK }], st.tab) +
      (st.tab === 'po' ? apprPO(st) : st.tab === 'inv' ? apprInv(param) : apprKontrak());
  }
};
function apprQueue(st) {
  const q = st.q.toLowerCase();
  return S.po.filter(p => p.status === 'Menunggu Approval')
    .filter(p => st.filter === 'all' || (st.filter === 'urgent' ? p.prioritas === 'Urgent' : p.total > 200e6))
    .filter(p => !q || (p.nomor_po + ' ' + vName(p.vendor_id)).toLowerCase().includes(q))
    .sort((a, b) => (b.prioritas === 'Urgent') - (a.prioritas === 'Urgent') || (a.tanggal > b.tanggal ? 1 : -1));
}
function apprPO(st) {
  const queue = apprQueue(st);
  const allPending = S.po.filter(p => p.status === 'Menunggu Approval');
  let sel = st.sel && Store.po(st.sel) && Store.po(st.sel).status === 'Menunggu Approval' ? Store.po(st.sel) : queue[0];
  if (st.sel && Store.po(st.sel) && Store.po(st.sel).status !== 'Menunggu Approval' && !queue.length) sel = null;
  if (sel) st.sel = sel.id;
  const total = queue.reduce((a, p) => a + p.total, 0);
  const left = `<div><div class="card" style="padding:14px"><div class="row"><h3 style="font-family:var(--sans);font-size:15px;flex:1">Daftar Antrean PO</h3><span class="mono xs muted">${queue.length} Ditampilkan</span></div>
      <div class="input-ic mt-s">${I('filter')}<input class="input tinted input-sm" style="padding-left:36px" placeholder="Cari No. PO atau Vendor…" value="${E(st.q)}" data-in="appr.q"></div>
      <div class="seg mt-s" style="width:100%">${[['all', 'Semua (' + allPending.length + ')'], ['urgent', 'Urgent (' + allPending.filter(p => p.prioritas === 'Urgent').length + ')'], ['big', '>200 Juta']].map(([k, l]) => `<button style="flex:1" class="${st.filter === k ? 'on' : ''}" data-act="appr.filter" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div class="mt-s">${queue.map(p => `<div class="q-card ${sel && sel.id === p.id ? 'on' : ''}" data-act="appr.sel" data-id="${p.id}"><div class="row" style="align-items:flex-start"><b class="mono small" style="flex:1">${E(p.nomor_po)}</b>${p.prioritas === 'Urgent' ? '<span class="pill-lbl pl-red">URGENT</span>' : p.total > 200e6 ? '<span class="pill-lbl pl-blue">NILAI TINGGI</span>' : '<span class="pill-lbl pl-blue">RUTIN</span>'}</div>
      <div style="margin-top:8px">${E(vName(p.vendor_id))}</div><div class="xs muted ellipsis">${E(p.paket || p.kategori || '')}</div><div class="row mt-s"><div style="flex:1"><div class="mono xs muted">Nilai Pengadaan</div><b class="num small">${RP(p.total)}</b></div><span class="mono xs muted">${I('calendar')} ${TGL(p.tanggal)}</span></div></div>`).join('') || `<div class="card">${UI.empty('Antrean kosong — semua PO sudah diproses', 'check')}</div>`}
    ${queue.length ? `<div class="card tint row mt-s" style="padding:12px 14px"><span style="color:var(--success)">${I('shield')}</span><div class="mono xs" style="flex:1">Total Nilai Verifikasi:</div><b class="num small">${RP(total)}</b></div>` : ''}</div></div>`;
  if (!sel) {
    const recent = S.po.filter(p => p.tgl_approval).sort((a, b) => b.tgl_approval > a.tgl_approval ? 1 : -1).slice(0, 8);
    return `<div class="appr"><div>${left}</div><div class="card" style="grid-column:span 2"><h3>Keputusan Terakhir</h3><div class="tbl-wrap mt-s"><table class="tbl"><tbody>${recent.map(p => `<tr class="clickable" data-act="go" data-href="po/${p.id}"><td class="mono small">${E(p.nomor_po)}</td><td>${E(vName(p.vendor_id))}</td><td class="num">${RP(p.total)}</td><td>${CHIP(p.status)}</td><td class="small muted">${UI.ago(p.tgl_approval)}</td></tr>`).join('') || `<tr><td>${UI.empty('Belum ada riwayat')}</td></tr>`}</tbody></table></div></div></div>`;
  }
  const v = Store.vendor(sel.vendor_id) || {}, items = Store.poItems(sel.id);
  const overHps = items.filter(d => { const b = d.barang_id && Store.byId('barang', d.barang_id); return b && b.harga_hps && d.harga > b.harga_hps; });
  const realisasi = S.po.filter(p => p.sumber_dana === sel.sumber_dana && inYear(p.tanggal) && ['Disetujui PPK', 'BAST Parsial', 'BAST Terbit', 'Selesai'].includes(p.status)).reduce((a, p) => a + p.total, 0);
  const docs = Array.isArray(v.dokumen) ? v.dokumen : [];
  const lampiran = Array.isArray(sel.lampiran) ? sel.lampiran : [];
  const methodOk = !!sel.rujukan || sel.total <= 200e6;
  const vendorOk = v.status === 'Aktif Terverifikasi';
  const center = `<div><div class="card row wrap" style="padding:10px 14px;margin-bottom:12px">${I('pdf')}<span class="mono xs" style="flex:1">PDF Preview: ${E(String(sel.nomor_po).replace(/\//g, '_'))}.pdf</span>
      <div class="seg"><button data-act="appr.zoom" data-v="-10">−</button><button class="on">${st.zoom}%</button><button data-act="appr.zoom" data-v="10">+</button></div><button class="btn btn-soft btn-sm" data-act="po.print" data-id="${sel.id}">${I('print')} Cetak</button></div>
    <div class="paper-wrap"><div style="zoom:${st.zoom / 100}">${Docs.poPaper(sel)}</div></div></div>`;
  const right = `<div class="card verif"><div class="row mb"><span style="color:var(--primary)">${I('shield')}</span><h3 style="flex:1">Verification Details</h3><span class="chip st-blue nodot">PPK Review</span></div>
    <div class="blk"><div class="hd"><span>1. SUMBER DANA & ANGGARAN</span>${sel.sumber_dana ? `<span class="ok-t">${I('check')} Verified</span>` : `<span class="bad-t">${I('alert')} Kosong</span>`}</div><div>${E(sel.sumber_dana || 'Sumber dana belum diisi')}</div><div class="mono xs mt-s">Realisasi TA ${YEAR}: <b style="color:var(--success-dark)">${RP(realisasi)}</b></div></div>
    <div class="blk"><div class="hd"><span>2. METODE PENGADAAN</span>${methodOk && !overHps.length ? `<span class="ok-t">${I('check')} Compliant</span>` : `<span class="bad-t">${I('alert')} Periksa</span>`}</div><div>${sel.rujukan ? 'E-Katalog / E-Purchasing' : 'Pengadaan Langsung'}</div>
      <div class="mono xs mt-s">${sel.rujukan ? 'Rujukan: <b>' + E(sel.rujukan) + '</b><br>' : sel.total > 200e6 ? '<span style="color:var(--danger)">Nilai > Rp200 Jt tanpa rujukan e-katalog</span><br>' : ''}Harga vs HPS: <b style="color:${overHps.length ? 'var(--danger)' : 'var(--success-dark)'}">${overHps.length ? overHps.length + ' item melebihi HPS' : 'Sesuai HPS'}</b></div></div>
    <div class="blk"><div class="hd"><span>3. DOKUMEN KELENGKAPAN (${docs.length + lampiran.length})</span><span class="chip ${vendorOk ? 'st-green' : 'st-amber'} nodot">${vendorOk ? 'Lengkap' : E(v.status || 'Periksa')}</span></div>
      ${lampiran.concat(docs).map(d => `<div class="doc-line">${I('doc')}<span class="ellipsis" style="flex:1">${E(d.name)}</span>${UI.driveUrl(d.fileId) ? `<a href="${UI.driveUrl(d.fileId)}" target="_blank" rel="noopener" class="icon-btn" style="width:22px;height:22px">${I('eye')}</a>` : `<span style="color:var(--success)">${I('check')}</span>`}</div>`).join('') || '<div class="xs muted">Vendor belum mengunggah dokumen legalitas.</div>'}</div>
    <div class="info-box mt">${I('info')}<span>Persetujuan ini akan menerbitkan Surat Pesanan resmi, dicatat di audit trail, dan otomatis mendisposisikan PO ke PPTK & portal rekanan${S.templates.some(t => t.jenis === 'PO' && t.status === 'Aktif') ? ' serta men-generate PDF dari template' : ''}.</span></div>
    <div class="row mt" style="align-items:baseline"><b style="flex:1">Catatan / Disposisi PPK</b><span class="mono xs muted">Wajib bila menolak</span></div>
    <textarea class="textarea tinted mt-s" rows="3" placeholder="Tambahkan catatan persetujuan atau alasan revisi/penolakan…" data-in="appr.note" data-id="${sel.id}">${E(st.note[sel.id] || '')}</textarea>
    <div class="row mt"><button class="btn btn-outline-danger" style="flex:1" data-act="appr.reject" data-id="${sel.id}">${I('back')} Tolak / Revisi</button><button class="btn btn-success" style="flex:1" data-act="appr.approve" data-id="${sel.id}">${I('check')} Setujui PO</button></div>
    <div class="row mono xs muted mt" style="justify-content:center">${I('lock')} Sistem Audit Trail Aktif • VMS ${E(S.settings.RS_NAMA || '')}</div></div>`;
  return `<div class="appr">${left}${center}${right}</div>`;
}
Act['appr.tab'] = el => { ps('approval').tab = el.dataset.v; App.clearParam('approval'); App.refreshCurrent(); };
Act['appr.filter'] = el => { ps('approval').filter = el.dataset.v; App.refreshCurrent(); };
Act['appr.q'] = UI.debounce(el => { ps('approval').q = el.value; App.refreshCurrent(); const i = document.querySelector('[data-in="appr.q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200);
Act['appr.sel'] = el => { ps('approval').sel = el.dataset.id; App.clearParam('approval'); App.refreshCurrent(); };
Act['appr.zoom'] = el => { const s = ps('approval'); s.zoom = Math.max(60, Math.min(140, s.zoom + Number(el.dataset.v))); App.refreshCurrent(); };
Act['appr.note'] = el => { ps('approval').note[el.dataset.id] = el.value; };
function decidePO(id, keputusan) {
  const st = ps('approval'), catatan = (st.note[id] || '').trim();
  if (keputusan === 'tolak' && !catatan) { UI.toast('Isi alasan penolakan / revisi pada kolom catatan', 'err'); const t = document.querySelector('[data-in="appr.note"]'); if (t) { t.classList.add('invalid'); t.focus(); } return; }
  const p = Store.po(id);
  const next = apprQueue(st).find(x => x.id !== id);
  st.sel = next ? next.id : null;
  API.mutate({
    label: keputusan === 'setuju' ? 'Setujui PO' : 'Tolak PO',
    apply: () => Store.upsert('po', { id, status: keputusan === 'setuju' ? 'Disetujui PPK' : 'Ditolak', disetujui_oleh: S.user.nama, tgl_approval: new Date().toISOString(), catatan_ppk: catatan }),
    rollback: old => Store.upsert('po', old),
    run: () => API.call('approvePO', { id, keputusan, catatan }),
    successMsg: (keputusan === 'setuju' ? '✓ Disetujui: ' : 'Dikembalikan: ') + p.nomor_po,
    onSuccess: r => { Store.upsert('po', r.data.po); if (keputusan === 'setuju') genDocument('PO', id, { silent: true, manual: {} }); }
  });
  delete st.note[id];
  App.clearParam('approval');
}
Act['appr.approve'] = el => decidePO(el.dataset.id, 'setuju');
Act['appr.reject'] = el => decidePO(el.dataset.id, 'tolak');

function apprInv(param) {
  const list = S.invoice.filter(i => i.status === 'Menunggu Verifikasi').sort((a, b) => a.jatuh_tempo > b.jatuh_tempo ? 1 : -1);
  return `<div class="card pad-0">${invTableHTML(list, { approve: true, hl: param && param.slice(4) })}</div>`;
}
function apprKontrak() {
  const list = S.kontrak.filter(k => k.status === 'Menunggu Approval');
  return `<div class="card pad-0">${kontrakTable(list)}</div>`;
}

/* =====================================================================
   BAST — daftar & pilih PO
   ===================================================================== */
Pages.bast = {
  title: 'BAST', deps: ['bast', 'bastDetail', 'po', 'vendors', 'invoice'],
  render(el, param) {
    const st = ps('bast', { q: '', page: 1 });
    const ready = S.po.filter(p => ['Disetujui PPK', 'BAST Parsial'].includes(p.status));
    const q = st.q.toLowerCase();
    const list = S.bast.filter(b => !q || (b.nomor_bast + ' ' + (Store.po(b.po_id) || {}).nomor_po + ' ' + vName(b.vendor_id)).toLowerCase().includes(q)).sort((a, b) => (b.created_at || b.tanggal) > (a.created_at || a.tanggal) ? 1 : -1);
    const pg = UI.paginate(list, st.page, 15);
    el.innerHTML = pageHead({
      eyebrow: `<span class="tag">Modul Pejabat Pelaksana Teknis Kegiatan (PPTK)</span> / Kontrak Fisik TA ${YEAR}`, title: isVendor() ? 'BAST Diterima' : 'Berita Acara Serah Terima (BAST)',
      sub: isVendor() ? 'Berita acara penerimaan barang yang telah ditandatangani PPTK.' : 'Pencatatan hasil pemeriksaan fisik, volume, dan kelayakan barang yang diserahkan oleh rekanan penyedia.'
    }) + (can('bastEdit') ? `<div class="card mb"><div class="card-head"><div class="ic" style="background:#d6f5df;color:var(--success)">${I('clipcheck')}</div><div style="flex:1"><h3>PO Siap Diperiksa (${ready.length})</h3><p>PO yang telah disetujui PPK dan menunggu pemeriksaan fisik barang</p></div></div>
      ${ready.length ? `<div class="grid g3">${ready.map(p => `<div class="act-item" style="margin:0"><div class="top"><b class="mono small">${E(p.nomor_po)}</b>${CHIP(p.status)}</div><div class="tt">${E(vName(p.vendor_id))}</div><div class="ds">${E(p.paket || p.kategori || '')} · ${E(p.unit || '')}${p.tgl_kirim ? '<br>Target kirim: ' + TGL(p.tgl_kirim) : ''}</div><div class="row"><b class="num small">${RP(p.total)}</b><span class="spacer"></span><a class="btn btn-success btn-sm" href="#/bast-form/${p.id}">${I('clipcheck')} Periksa</a></div></div>`).join('')}</div>` : UI.empty('Tidak ada PO yang menunggu pemeriksaan', 'check')}</div>` : '') +
      `<div class="card pad-0"><div class="filters" style="padding:14px 16px"><h3 style="flex:1">Riwayat BAST</h3><div class="input-ic" style="max-width:320px">${I('search')}<input class="input tinted" placeholder="Cari no. BAST / PO / vendor" value="${E(st.q)}" data-in="bast.q"></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>No. BAST</th><th>Referensi PO</th><th>Vendor</th><th>Tanggal</th><th>Kesimpulan</th><th>PPTK</th><th>Status</th><th></th></tr></thead><tbody>
      ${pg.rows.map(b => `<tr class="clickable" data-act="go" data-href="bast/${b.id}"><td class="mono small">${E(b.nomor_bast || '(menunggu nomor)')}</td><td class="mono small">${E((Store.po(b.po_id) || {}).nomor_po || '-')}</td><td>${E(vName(b.vendor_id))}</td><td class="mono small">${TGL(b.tanggal)}</td><td class="small">${E(b.kesimpulan || '-')}</td><td class="small">${E(b.pptk_nama || '')}</td><td>${CHIP(b.status)}</td><td>${I('next')}</td></tr>`).join('') || `<tr><td colspan="8">${UI.empty('Belum ada BAST', 'clipcheck')}</td></tr>`}
      </tbody></table></div>${UI.pager(pg, 'bast.page', 'BAST')}</div>`;
    openFromParam(el, 'bast', param, Store.byId('bast', param), bastDrawer);
  }
};
Act['bast.q'] = UI.debounce(el => { const s = ps('bast'); s.q = el.value; s.page = 1; App.refreshCurrent(); const i = document.querySelector('[data-in="bast.q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200);
Act['bast.page'] = el => { ps('bast').page = +el.dataset.page; App.refreshCurrent(); };
function bastDrawer(id, onClose) {
  const b = Store.byId('bast', id); if (!b) return;
  const p = Store.po(b.po_id) || {}, items = Store.bastItems(id);
  const hasTpl = S.templates.some(t => t.jenis === 'BAST' && t.status === 'Aktif');
  const m = UI.modal({
    drawer: true, onClose, title: `<span class="mono">${E(b.nomor_bast || 'BAST')}</span>`, sub: 'PO ' + E(p.nomor_po || '-') + ' · ' + E(vName(b.vendor_id)),
    body: `<div class="row wrap">${CHIP(b.status)}<span class="chip st-blue nodot">${E(b.kesimpulan || '-')}</span></div>
      <div class="grid g2 mt" style="gap:12px">${[['TANGGAL PEMERIKSAAN', TGL(b.tanggal, 1)], ['NO. SURAT JALAN', b.no_surat_jalan], ['PPTK PEMERIKSA', b.pptk_nama], ['NIP', b.pptk_nip]].map(([k, v]) => `<div><div class="mono xs muted">${k}</div><div class="small">${E(v || '-')}</div></div>`).join('')}</div>
      <h3 class="mt">Barang Diterima</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Barang</th><th>Lot / Exp</th><th class="num">PO</th><th class="num">Diterima</th><th>Kondisi</th></tr></thead><tbody>${items.map(d => `<tr><td>${E(d.nama)}<div class="sub">${E(d.catatan || '')}</div></td><td class="mono xs">${E(d.lot || '-')}<br>${E(d.exp || '')}</td><td class="num">${d.qty_po}</td><td class="num" style="color:${d.qty_diterima < d.qty_po ? 'var(--warn)' : 'var(--success-dark)'}">${d.qty_diterima} ${E(d.satuan)}</td><td class="small">${E(d.kondisi)}</td></tr>`).join('')}</tbody></table></div>
      ${Array.isArray(b.checklist) && b.checklist.length ? `<h3 class="mt">Checklist Pemeriksaan</h3>${b.checklist.map(c => `<div class="small row" style="gap:6px;margin-top:4px"><span style="color:${c.ok ? 'var(--success)' : 'var(--danger)'}">${I(c.ok ? 'check' : 'x')}</span>${E(c.label)}</div>`).join('')}` : ''}
      ${b.catatan ? `<p class="small mt"><b>Catatan:</b> ${E(b.catatan)}</p>` : ''}
      <h3 class="mt">Berkas</h3>${(Array.isArray(b.foto) ? b.foto : []).map((f, i) => UI.driveUrl(f) ? `<a class="file-row" target="_blank" rel="noopener" href="${UI.driveUrl(f)}">${I('camera', 'fi')}<span class="small" style="flex:1">Foto dokumentasi ${i + 1}</span>${I('ext')}</a>` : '').join('')}
      ${b.ttd_file_id ? `<a class="file-row" target="_blank" rel="noopener" href="${UI.driveUrl(b.ttd_file_id)}">${I('sign', 'fi')}<span class="small" style="flex:1">Tanda tangan digital PPTK</span>${I('ext')}</a>` : ''}
      ${b.doc_file_id ? `<a class="file-row" target="_blank" rel="noopener" href="${UI.driveUrl(b.doc_file_id)}">${I('pdf', 'fi')}<span class="small" style="flex:1">Dokumen BAST resmi (PDF)</span>${I('ext')}</a>` : ''}`,
    foot: `${can('genDoc') && hasTpl && b.status === 'Ditandatangani' ? `<button class="btn btn-outline" data-act="doc.gen" data-jenis="BAST" data-id="${b.id}">${I('doc')} Generate Dokumen BAST</button>` : ''}<span class="spacer"></span>${can('bastEdit') && b.status === 'Draft' ? `<a class="btn" href="#/bast-form/b:${b.id}">${I('edit')} Lanjutkan Draft</a>` : ''}${can('invEdit') && b.status === 'Ditandatangani' && !S.invoice.some(i => i.bast_id === b.id && i.status !== 'Ditolak') ? `<a class="btn btn-success" href="#/invoice/new:${b.id}">${I('money')} Buat Invoice</a>` : ''}`
  });
  m.el.addEventListener('click', e => { if (e.target.closest('a[href^="#/"]')) m.close(); });
}

/* ---------- FORM BAST ---------- */
const KONDISI = ['Baik & Berfungsi', 'Segel Utuh', 'Cacat Ringan', 'Rusak / Retur', 'Kadaluarsa Dekat'];
const CHECKS = [
  ['Kesesuaian jumlah fisik dengan surat jalan vendor', 'Nomor surat jalan diverifikasi cocok dengan fisik kemasan.'],
  ['Masa kadaluarsa (expired date) minimal 18 bulan ke depan', 'Kedaluwarsa terdekat telah diperiksa per batch/lot.'],
  ['Kemasan tidak cacat/bocor dan label BPOM/Kemenkes tertera', 'Izin edar AKL/AKD/NIE terverifikasi pada kemasan.'],
  ['Sertifikat Analisis (CoA) / garansi terlampir asli', 'Dokumen CoA/garansi pabrikan terlampir dalam paket.']
];
Pages['bast-form'] = {
  title: 'Input BAST', keep: true, roles: CAN.bastEdit,
  render(el, param) {
    let draft = null, poId = param;
    if (param && param.startsWith('b:')) { draft = Store.byId('bast', param.slice(2)); poId = draft && draft.po_id; }
    const ready = S.po.filter(p => ['Disetujui PPK', 'BAST Parsial'].includes(p.status) || (draft && p.id === draft.po_id));
    const po = poId ? Store.po(poId) : null;
    if (!po) {
      el.innerHTML = `<a href="#/bast" class="row small" style="text-decoration:underline;gap:6px">${I('back')} Kembali</a>` + pageHead({ title: 'Input Berita Acara Serah Terima (BAST)' }) + `<div class="card"><div class="field"><label>Pilih dokumen PO yang akan diperiksa <span class="req">*</span></label><select class="select" data-ch="bf.po">${UI.opt(ready.map(p => ({ v: p.id, l: p.nomor_po + ' — ' + vName(p.vendor_id) + ' (' + (p.paket || p.kategori || '') + ')' })), '', 'Pilih PO…')}</select></div>${ready.length ? '' : '<p class="small muted mt-s">Belum ada PO berstatus Disetujui PPK.</p>'}</div>`;
      return;
    }
    const v = Store.vendor(po.vendor_id) || {};
    const pd = Store.poItems(po.id);
    const signedIds = new Set(S.bast.filter(b => b.po_id === po.id && b.status === 'Ditandatangani' && (!draft || b.id !== draft.id)).map(b => b.id));
    const got = {}; S.bastDetail.forEach(d => { if (signedIds.has(d.bast_id)) got[d.po_detail_id] = (got[d.po_detail_id] || 0) + d.qty_diterima; });
    const dItems = draft ? Store.bastItems(draft.id) : [];
    const d = el._bf = {
      id: draft ? draft.id : UI.uid(), po_id: po.id, tanggal: draft ? draft.tanggal : UI.iso(), no_surat_jalan: draft ? draft.no_surat_jalan : '', kesimpulan: draft ? draft.kesimpulan : '', catatan: draft ? draft.catatan : '',
      checklist: CHECKS.map((c, i) => ({ label: c[0], ok: draft && Array.isArray(draft.checklist) && draft.checklist[i] ? !!draft.checklist[i].ok : false })),
      foto: (draft && Array.isArray(draft.foto) ? draft.foto : []).map(f => ({ fileId: f, name: 'Foto tersimpan' })),
      items: pd.map(x => { const di = dItems.find(z => z.po_detail_id === x.id) || {}; const sisa = x.qty - (got[x.id] || 0); return { po_detail_id: x.id, nama: x.nama, spes: x.spesifikasi, qty_po: x.qty, sisa, satuan: x.satuan, qty_diterima: di.qty_diterima != null ? di.qty_diterima : sisa, kondisi: di.kondisi || 'Baik & Berfungsi', lot: di.lot || '', exp: di.exp || '', catatan: di.catatan || '' }; }),
      signed: false
    };
    const late = po.tgl_kirim ? -UI.daysTo(po.tgl_kirim) : null;
    const minFoto = Number(S.settings.MIN_FOTO_BAST || 0);
    el.innerHTML = `<a href="#/bast" class="row small" style="text-decoration:underline;gap:6px">${I('back')} Kembali ke daftar BAST</a>` + pageHead({
      eyebrow: `<span class="tag">Modul Pejabat Pelaksana Teknis Kegiatan (PPTK)</span> / Kontrak Fisik TA ${YEAR}`, title: 'Input Berita Acara Serah Terima (BAST)', extra: `<span class="chip st-blue nodot mono">${draft ? E(draft.nomor_bast) : 'Draft BAST-' + YEAR}</span>`,
      sub: `<span class="chip st-green">Terverifikasi e-Katalog</span> Pencatatan hasil pemeriksaan fisik, volume, dan kelayakan barang yang diserahkan oleh rekanan penyedia.`,
      actions: `<div class="card flat row" style="padding:10px 14px">${I('clipcheck')}<div><div class="mono xs muted">ID FORMULIR BAST</div><b class="mono small">${E(d.id.slice(0, 8).toUpperCase())}</b></div></div>`
    }) + `<div class="card"><div class="card-head"><span class="avatar a4" style="width:26px;height:26px;border-radius:4px">1</span><h3>Referensi Purchase Order</h3><span class="ok-t">${I('check')} Terhubung dengan SIM-RS & GAS</span></div>
      <div class="mono xs mb" style="letter-spacing:.06em">PILIH DOKUMEN PO YANG AKAN DIPERIKSA <span style="color:var(--danger)">*</span></div>
      <div class="row"><select class="select tinted" style="flex:1" data-ch="bf.po">${UI.opt(ready.map(p => ({ v: p.id, l: p.nomor_po + ' — ' + vName(p.vendor_id) + ' (' + (p.paket || p.kategori || '') + ')' })), po.id)}</select><button class="btn btn-soft" data-act="po.print" data-id="${po.id}">${I('eye')} Lihat File PO Asli</button></div>
      <div class="grid g4 act-item mt" style="gap:12px;grid-template-columns:repeat(5,minmax(0,1fr))">${[['VENDOR PENYEDIA', E(v.nama || '-') + `<div class="xs muted">NIB: ${E(v.nib || '-')}</div>`], ['KONTAK REKANAN', `<span class="mono small">${E(v.telepon || '-')}</span><div class="xs muted">${E(v.email || '')}</div>`], ['UNIT PEMESAN', E(po.unit || '-')], ['NILAI TOTAL PO', `<b style="font-family:var(--serif);font-size:17px;color:var(--primary-deep)">${RP(po.total)}</b><div class="mono xs" style="color:var(--success-dark)">Termasuk PPN ${E(S.settings.PPN_RATE || 11)}%</div>`], ['TGL PENGIRIMAN', po.tgl_kirim ? TGL(po.tgl_kirim, 1) + `<div class="xs" style="color:${late > 0 ? 'var(--danger)' : 'var(--success-dark)'}">${late > 0 ? 'Terlambat ' + late + ' hari' : 'Tiba tepat waktu'}</div>` : '-']].map(([k, x]) => `<div><div class="mono xs muted">${k}</div><div class="small">${x}</div></div>`).join('')}</div></div>
    <div class="card mt"><div class="card-head"><span class="avatar a4" style="width:26px;height:26px;border-radius:4px">2</span><h3>Detail Barang Diterima & Pemeriksaan Fisik</h3><span class="mono xs muted">${I('sliders')} Pastikan kuantitas diterima diverifikasi berdasar surat jalan fisik</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="min-width:180px">Nama Barang / Jasa</th><th style="min-width:150px">Spesifikasi / Lot No</th><th class="num">Qty PO</th><th style="width:110px">Qty Diterima</th><th style="min-width:170px">Kondisi Fisik</th><th style="min-width:180px">Catatan Pemeriksaan PPTK</th></tr></thead><tbody id="bf-items">${d.items.map((it, i) => `<tr>
        <td>${E(it.nama)}<div class="mono xs muted">${E(it.spes || '')}</div></td>
        <td><input class="input input-sm mono" placeholder="Lot/Batch" value="${E(it.lot)}" data-in="bf.it" data-i="${i}" data-f="lot"><input class="input input-sm mono" style="margin-top:4px" placeholder="Exp: MM/YYYY" value="${E(it.exp)}" data-in="bf.it" data-i="${i}" data-f="exp"></td>
        <td class="num"><b>${it.qty_po}</b> <span class="small">${E(it.satuan)}</span>${it.sisa < it.qty_po ? `<div class="xs" style="color:var(--warn)">sisa ${it.sisa}</div>` : ''}</td>
        <td><input class="input input-sm mono center" style="background:var(--tint)" type="number" min="0" max="${it.sisa}" value="${it.qty_diterima}" data-in="bf.it" data-i="${i}" data-f="qty_diterima"></td>
        <td><select class="select input-sm" style="background:var(--success-tint)" data-ch="bf.it" data-i="${i}" data-f="kondisi">${UI.opt(KONDISI, it.kondisi)}</select></td>
        <td><input class="input input-sm" value="${E(it.catatan)}" placeholder="Kemasan utuh, segel baik…" data-in="bf.it" data-i="${i}" data-f="catatan"></td></tr>`).join('')}</tbody></table></div>
      <div class="act-item row mt" id="bf-recon"></div></div>
    <div class="grid g-3-2 mt">
      <div class="card"><div class="card-head"><span class="avatar a4" style="width:26px;height:26px;border-radius:4px">3</span><h3>Checklist Pemeriksaan & Dokumentasi Foto</h3></div>
        <div class="field mb"><label>Nomor Surat Jalan Vendor</label><input class="input mono" value="${E(d.no_surat_jalan)}" data-in="bf.f" data-f="no_surat_jalan" placeholder="SJ-${YEAR}/…"></div>
        ${CHECKS.map((c, i) => `<label class="check check-card"><input type="checkbox" ${d.checklist[i].ok ? 'checked' : ''} data-ch="bf.chk" data-i="${i}"><div><b>${E(c[0])}</b><div class="small">${E(c[1])}</div></div></label>`).join('')}
        <div class="grid g2 mt" style="gap:12px"><div class="field"><label>Kesimpulan Hasil Pemeriksaan PPTK <span class="req">*</span></label><select class="select" style="background:var(--success-tint);font-weight:500" data-ch="bf.f" data-f="kesimpulan">${UI.opt(['DISETUJUI / DITERIMA LENGKAP', 'DITERIMA SEBAGIAN', 'DITOLAK / RETUR KE VENDOR'], d.kesimpulan, 'Pilih kesimpulan…')}</select></div><div class="field"><label>Tanggal Pemeriksaan</label><input type="date" class="input" value="${E(d.tanggal)}" data-in="bf.f" data-f="tanggal"></div></div>
        <div class="field mt"><label>Catatan Umum</label><textarea class="textarea" rows="2" data-in="bf.f" data-f="catatan">${E(d.catatan)}</textarea></div>
        <div class="row mt"><b class="mono xs" style="flex:1;letter-spacing:.06em">FOTO DOKUMENTASI PENERIMAAN (WAJIB MIN. ${minFoto} FOTO)</b><span class="mono xs" style="color:var(--success-dark)" id="bf-fcnt"></span></div>
        <div class="drop mt-s" data-act="bf.pick">${I('camera')}<div>Tarik file bukti foto atau <u>Klik untuk Telusuri</u></div><div class="xs muted">JPG, PNG, atau HEIC · dikompres otomatis sebelum diunggah</div><input type="file" id="bf-files" accept="image/*" capture="environment" multiple hidden></div>
        <div class="thumbs" id="bf-thumbs"></div></div>
      <div class="card"><div class="card-head"><span class="avatar a4" style="width:26px;height:26px;border-radius:4px">4</span><h3>Pengesahan PPTK</h3></div>
        <p class="small" style="color:var(--ink-2)">Dengan menandatangani lembar ini, Pejabat Pelaksana Teknis Kegiatan menyatakan barang di atas telah diterima, diperiksa, dan sesuai dengan spesifikasi kontrak.</p>
        <div class="row mt"><b class="mono xs" style="flex:1;letter-spacing:.06em">KANVAS TANDA TANGAN DIGITAL</b><button class="btn btn-ghost btn-xs" style="color:var(--danger)" data-act="bf.clear">${I('refresh')} Reset</button></div>
        <div class="sigpad mt-s"><span class="lbl">PAD TTD ELEKTRONIK</span><canvas id="bf-sig"></canvas><div class="row mono xs muted" style="padding:6px 12px;justify-content:space-between"><span>Goreskan TTD via Mouse/Stylus/Jari</span><span id="bf-sigst">● Siap Rekam</span></div></div>
        <div class="act-item mt"><b style="font-family:var(--serif);font-size:16px">${E(S.user.nama)}</b><div class="mono xs">NIP: ${E(S.user.nip || '-')} • <span style="color:var(--success-dark)">Aktif</span></div><div class="xs">Jabatan: ${E(S.user.jabatan || ROLE_LABEL[S.user.role])}</div></div>
        <div class="info-box mt">${I('info')}<span>Setelah disimpan, status PO berubah otomatis (BAST Terbit / Parsial), rekanan & Pejabat Pengadaan menerima notifikasi${S.templates.some(t => t.jenis === 'BAST' && t.status === 'Aktif') ? ', dan PDF BAST di-generate ke Google Drive' : ''}.</span></div></div>
    </div>
    <div class="sticky-bar"><span style="color:var(--primary)">${I('refresh')}</span><div class="small"><b>Sinkronisasi Otomatis Dokumen BAST</b><div class="xs muted">Dokumen BAST PDF resmi otomatis di-generate ke Google Drive setelah ditandatangani.</div></div><span class="spacer"></span><a class="btn btn-outline" href="#/bast" data-act="bf.cancel">Batal</a><button class="btn btn-outline" data-act="bf.save" data-sign="0">Simpan Draft</button><button class="btn" data-act="bf.save" data-sign="1">${I('clipcheck')} Simpan & Generate Dokumen BAST</button></div>`;
    bfRecon(el); bfThumbs(el); bfSignature(el);
    el.querySelector('#bf-files').onchange = e => { bfUpload(el, [...e.target.files]); e.target.value = ''; };
    const drop = el.querySelector('.drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); bfUpload(el, [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'))); };
  }
};
function bfRecon(el) {
  const d = el._bf; const po = d.items.reduce((a, i) => a + i.sisa, 0), got = d.items.reduce((a, i) => a + (Number(i.qty_diterima) || 0), 0);
  const bad = d.items.filter(i => Number(i.qty_diterima) !== i.sisa || !/baik|segel/i.test(i.kondisi)).length;
  el.querySelector('#bf-recon').innerHTML = `<span style="color:${bad ? 'var(--warn)' : 'var(--success)'}">${I(bad ? 'alert' : 'check')}</span><span class="small" style="flex:1">Semua ${d.items.length} item PO telah diperiksa fisik: <b>${po ? Math.round(got / po * 100) : 0}% Kuantitas Sesuai (${got}/${po} Unit)</b></span><span class="mono xs">Status Rekonsiliasi: <b style="color:${bad ? 'var(--warn)' : 'var(--success-dark)'}">${bad ? bad + ' DISCREPANCY' : 'ZERO DISCREPANCY'}</b></span>`;
}
function bfThumbs(el) {
  const d = el._bf, min = Number(S.settings.MIN_FOTO_BAST || 0);
  el.querySelector('#bf-fcnt').textContent = d.foto.filter(f => f.fileId).length + ' / ' + min + ' FILE TERUNGGAH';
  el.querySelector('#bf-thumbs').innerHTML = d.foto.map((f, i) => `<div class="thumb">${f.preview ? `<img src="${f.preview}" alt="">` : `<div style="height:90px;display:grid;place-items:center;background:#fff;border-radius:6px">${I('camera')}</div>`}${!f.fileId && !f.err ? '<div class="prog">Mengunggah…</div>' : ''}<button class="x" data-act="bf.rmfoto" data-i="${i}">×</button><div class="mono ellipsis" style="margin-top:4px">${E(f.name)}</div><div class="mono" style="color:${f.err ? 'var(--danger)' : 'var(--muted)'}">${f.err ? 'Gagal' : f.size ? UI.fsize(f.size) + ' · ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : ''}</div></div>`).join('');
}
async function bfUpload(el, files) {
  const d = el._bf, po = Store.po(d.po_id);
  await Promise.all(files.map(async f => {
    const rec = { name: f.name, size: f.size }; d.foto.push(rec); bfThumbs(el);
    try {
      const c = await UI.compressImage(f, 1400, .75); rec.preview = c.preview; rec.size = Math.round(c.base64.length * .75); bfThumbs(el);
      const r = await API.call('uploadFile', { po_id: po.id, vendor_id: po.vendor_id, base64: c.base64, name: 'BAST_' + c.name, mime: c.mime }, { timeout: 120000 });
      rec.fileId = r.data[0].fileId;
    } catch (e) { rec.err = e.message; UI.toast('Upload ' + f.name + ' gagal: ' + e.message, 'err'); }
    if (document.body.contains(el)) bfThumbs(el);
  }));
}
function bfSignature(el) {
  const c = el.querySelector('#bf-sig'), ctx = c.getContext('2d');
  const fit = () => { const r = c.getBoundingClientRect(); const img = el._bf.signed ? c.toDataURL() : null; c.width = r.width * devicePixelRatio; c.height = r.height * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0c1e25'; if (img) { const i = new Image(); i.onload = () => ctx.drawImage(i, 0, 0, r.width, r.height); i.src = img; } };
  setTimeout(fit, 30);
  let draw = false, last = null;
  const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  c.onpointerdown = e => { draw = true; last = pos(e); c.setPointerCapture(e.pointerId); };
  c.onpointermove = e => { if (!draw) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; el._bf.signed = true; el.querySelector('#bf-sigst').textContent = '● Tertanda'; };
  c.onpointerup = () => { draw = false; };
}
Act['bf.po'] = el => App.go('bast-form/' + el.value);
Act['bf.it'] = el => { const sec = el.closest('section'), it = sec._bf.items[+el.dataset.i]; let v = el.value; if (el.dataset.f === 'qty_diterima') { v = Math.max(0, Number(v) || 0); el.classList.toggle('invalid', v > it.sisa); } it[el.dataset.f] = v; bfRecon(sec); };
Act['bf.f'] = el => { el.closest('section')._bf[el.dataset.f] = el.value; };
Act['bf.chk'] = el => { el.closest('section')._bf.checklist[+el.dataset.i].ok = el.checked; };
Act['bf.pick'] = el => el.closest('section').querySelector('#bf-files').click();
Act['bf.rmfoto'] = el => { const sec = el.closest('section'); sec._bf.foto.splice(+el.dataset.i, 1); bfThumbs(sec); };
Act['bf.clear'] = el => { const sec = el.closest('section'), c = sec.querySelector('#bf-sig'); c.getContext('2d').clearRect(0, 0, c.width, c.height); sec._bf.signed = false; sec.querySelector('#bf-sigst').textContent = '● Siap Rekam'; };
Act['bf.cancel'] = () => App.invalidate('bast-form');
Act['bf.save'] = el => {
  const sec = el.closest('section'), d = sec._bf, sign = el.dataset.sign === '1';
  const minFoto = Number(S.settings.MIN_FOTO_BAST || 0);
  const over = d.items.find(i => Number(i.qty_diterima) > i.sisa);
  if (over) { UI.toast('Qty diterima ' + over.nama + ' melebihi sisa PO (' + over.sisa + ')', 'err'); return; }
  if (d.foto.some(f => !f.fileId && !f.err)) { UI.toast('Tunggu hingga semua foto selesai diunggah', 'warn'); return; }
  const foto = d.foto.filter(f => f.fileId).map(f => f.fileId);
  if (sign) {
    if (!d.kesimpulan) { UI.toast('Pilih kesimpulan hasil pemeriksaan', 'err'); return; }
    if (foto.length < minFoto) { UI.toast('Foto dokumentasi minimal ' + minFoto + ' berkas (baru ' + foto.length + ')', 'err'); return; }
    if (!d.signed) { UI.toast('Bubuhkan tanda tangan digital pada kanvas', 'err'); sec.querySelector('.sigpad').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (d.items.every(i => !Number(i.qty_diterima))) { UI.toast('Belum ada barang yang diterima', 'err'); return; }
  }
  const po = Store.po(d.po_id);
  const payload = { id: d.id, po_id: d.po_id, tanggal: d.tanggal, no_surat_jalan: d.no_surat_jalan, kesimpulan: d.kesimpulan, catatan: d.catatan, checklist: d.checklist, foto, sign, items: d.items.map(i => ({ po_detail_id: i.po_detail_id, qty_diterima: Number(i.qty_diterima) || 0, kondisi: i.kondisi, lot: i.lot, exp: i.exp, catatan: i.catatan })) };
  if (sign) payload.ttd_base64 = sec.querySelector('#bf-sig').toDataURL('image/png');
  const existed = Store.byId('bast', d.id);
  const pdMap = {}; Store.poItems(po.id).forEach(x => pdMap[x.id] = x);
  const localBast = { ...(existed || {}), id: d.id, nomor_bast: existed ? existed.nomor_bast : '', po_id: po.id, vendor_id: po.vendor_id, tanggal: d.tanggal, no_surat_jalan: d.no_surat_jalan, kesimpulan: d.kesimpulan, catatan: d.catatan, checklist: d.checklist, foto, pptk_nama: S.user.nama, pptk_nip: S.user.nip, status: sign ? 'Ditandatangani' : 'Draft', created_at: existed ? existed.created_at : new Date().toISOString() };
  let oldDet, oldPo;
  const full = d.items.every(i => Number(i.qty_diterima) >= i.sisa);
  API.mutate({
    label: sign ? 'Tanda tangan BAST' : 'Simpan draft BAST',
    apply: () => {
      oldDet = Store.removeWhere('bastDetail', x => x.bast_id === d.id);
      Store.upsertMany('bastDetail', payload.items.map(i => ({ ...i, id: UI.uid(), bast_id: d.id, nama: pdMap[i.po_detail_id].nama, qty_po: pdMap[i.po_detail_id].qty, satuan: pdMap[i.po_detail_id].satuan, harga: pdMap[i.po_detail_id].harga })));
      if (sign) oldPo = Store.upsert('po', { id: po.id, status: full ? 'BAST Terbit' : 'BAST Parsial' });
      return Store.upsert('bast', localBast);
    },
    rollback: old => { Store.removeWhere('bastDetail', x => x.bast_id === d.id); Store.upsertMany('bastDetail', oldDet || []); if (oldPo) Store.upsert('po', oldPo); existed ? Store.upsert('bast', old) : Store.remove('bast', d.id); },
    run: () => API.call('saveBAST', payload, { timeout: 120000 }),
    onSuccess: r => {
      Store.upsert('bast', r.data.bast); Store.removeWhere('bastDetail', x => x.bast_id === d.id); Store.upsertMany('bastDetail', r.data.details);
      if (r.data.po) Store.upsert('po', r.data.po);
      if (sign) genDocument('BAST', r.data.bast.id, { silent: true, manual: {} });
    }
  });
  App.invalidate('bast-form');
  App.go('bast/' + d.id);
};

/* =====================================================================
   INVOICE & PEMBAYARAN
   ===================================================================== */
const INV_TABS = [{ id: '', l: 'Semua Invoice' }, { id: 'Menunggu Verifikasi', l: 'Menunggu Verifikasi' }, { id: 'Disetujui', l: 'Siap Bayar / SP2D' }, { id: 'Ditolak', l: 'Ditolak / Revisi' }, { id: 'Dibayar', l: 'Sudah Cair / Lunas' }];
Pages.invoice = {
  title: 'Invoice & Pembayaran', deps: ['invoice', 'bast', 'po', 'vendors'],
  render(el, param) {
    const st = ps('invoice', { tab: '', q: '', dana: '', bulan: '', page: 1 });
    const invY = S.invoice.filter(i => inYear(i.tanggal));
    const sum = l => l.reduce((a, i) => a + i.netto, 0);
    const by = s => S.invoice.filter(i => i.status === s);
    const danas = [...new Set(S.invoice.map(i => i.sumber_dana).filter(Boolean))];
    const rate = S.settings;
    el.innerHTML = pageHead({
      eyebrow: `<span class="tag navy">Modul Keuangan & Pembayaran BLUD</span> // T.A. ${YEAR} • Terintegrasi SIPD & BAST Digital`, title: isVendor() ? 'Tagihan Saya' : 'Invoice & Pembayaran BLUD',
      sub: isVendor() ? 'Status verifikasi dan pencairan tagihan perusahaan Anda.' : `Verifikasi dokumen penagihan vendor, pemotongan pajak PPh/PPN, dan penerbitan rekomendasi SP2D ${E(S.settings.RS_NAMA_LENGKAP || '')}.`,
      actions: `<button class="btn btn-outline" data-act="inv.export">${I('down')} Unduh Rekap Pajak & SP2D</button>${can('invEdit') ? `<button class="btn" data-act="inv.new">${I('plus')} Buat Draf Invoice Baru</button>` : ''}`
    }) + `<div class="grid g4">
      ${kpi({ lbl: 'Total Tagihan Masuk', val: RP(sum(invY)), ico: 'receipt', foot: `<span class="tag-mini">${invY.length} Berkas</span> Invoice TA ${YEAR}`, fc: 'muted' })}
      ${kpi({ lbl: 'Menunggu Verifikasi PPK', val: by('Menunggu Verifikasi').length + ' Invoice', ico: 'hourglass', ic: 'a', foot: `<span class="tag-mini" style="background:var(--warn-tint);color:var(--warn-text)">${RP(sum(by('Menunggu Verifikasi')))}</span> Butuh disposisi`, fc: 'muted' })}
      ${kpi({ lbl: 'Disetujui / Siap Terbit SP2D', val: by('Disetujui').length + ' Invoice', ico: 'shield', ic: 'g', foot: `<span class="tag-mini" style="background:var(--success-tint);color:var(--success-dark)">${RP(sum(by('Disetujui')))}</span> Lolos validasi`, fc: 'muted' })}
      ${kpi({ lbl: 'Ditolak / Revisi Berkas', val: by('Ditolak').length + ' Invoice', ico: 'alert', ic: 'r', foot: 'Menunggu revisi vendor', fc: 'warn' })}
    </div>
    ${isVendor() ? '' : `<div class="card mt row wrap" style="gap:16px"><div class="ic avatar a4" style="width:44px;height:44px">${I('chart')}</div><div style="flex:1;min-width:260px"><h3>Automasi Perhitungan Pajak BLUD <span class="chip st-green nodot">Formula ${YEAR} Aktif</span></h3><p class="small muted" style="margin:4px 0 0">PPN ${E(rate.PPN_RATE)}% dan PPh Pasal 22 (${E(rate.PPH22_RATE)}%) dihitung otomatis dari nilai barang diterima pada BAST (bukan nilai PO). Netto = DPP + PPN − PPN dipungut − PPh 22.</p></div>
      <div class="stack" style="min-width:200px"><div class="act-item" style="padding:8px 12px"><div class="mono xs muted">Invoice jatuh tempo ≤ 7 hari</div><b class="mono">${S.invoice.filter(i => !['Dibayar', 'Ditolak'].includes(i.status) && UI.daysTo(i.jatuh_tempo) <= 7).length} tagihan</b></div>${can('admin') ? `<a class="btn btn-soft btn-sm" href="#/pengaturan/app">${I('sliders')} Atur Tarif Pajak</a>` : ''}</div></div>`}
    <div class="card pad-0 mt"><div style="padding:14px 16px 0">${tabsBar('inv.tab', INV_TABS.map(t => ({ ...t, n: t.id ? by(t.id).length : S.invoice.length })), st.tab)}
      <div class="filters" style="padding-bottom:14px"><div class="input-ic">${I('search')}<input class="input tinted" placeholder="Cari No. Invoice, No. PO, No. Faktur, vendor" value="${E(st.q)}" data-in="inv.q"></div>
      <select class="select tinted" data-ch="inv.dana">${UI.opt(danas, st.dana, 'Semua Sumber Dana')}</select><select class="select tinted" data-ch="inv.bulan">${UI.opt(UI.BULAN.map((b, i) => ({ v: String(i), l: b })), st.bulan, 'Bulan Jatuh Tempo: Semua')}</select></div></div>
      <div id="inv-table">${invTableHTML(invFiltered(), { page: true })}</div></div>
    ${isVendor() ? '' : invBottom()}`;
    if (param && param.startsWith('new:')) { if (el._opened !== param) { el._opened = param; setTimeout(() => invCreate(param.slice(4), () => { el._opened = null; App.clearParam('invoice'); }), 0); } }
    else openFromParam(el, 'invoice', param, Store.byId('invoice', param), invDrawer);
  }
};
function invFiltered() {
  const st = ps('invoice'); const q = st.q.toLowerCase();
  return S.invoice.filter(i => (!st.tab || i.status === st.tab) && (!st.dana || i.sumber_dana === st.dana) && (st.bulan === '' || monthOf(i.jatuh_tempo) === Number(st.bulan)) &&
    (!q || (i.nomor_invoice + ' ' + i.no_faktur + ' ' + (Store.po(i.po_id) || {}).nomor_po + ' ' + vName(i.vendor_id)).toLowerCase().includes(q)))
    .sort((a, b) => (b.created_at || b.tanggal) > (a.created_at || a.tanggal) ? 1 : -1);
}
function invTableHTML(list, { page = false, approve = false, hl = '' } = {}) {
  const pg = page ? UI.paginate(list, ps('invoice').page, 10) : { rows: list };
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>No. Invoice & Tanggal</th><th>Vendor Rekanan</th><th>Referensi PO & BAST</th><th>Jatuh Tempo</th><th class="num">Rincian Nilai<br>(DPP / Pajak / Netto)</th><th>Status BLUD</th><th>Aksi</th></tr></thead><tbody>
  ${pg.rows.map(i => { const dt = UI.daysTo(i.jatuh_tempo), p = Store.po(i.po_id) || {}, b = Store.byId('bast', i.bast_id) || {}; const paid = i.status === 'Dibayar';
    return `<tr class="${hl === i.id ? 'row-sel' : ''}"><td><a class="mono small" href="#/invoice/${i.id}" style="font-weight:600;color:var(--ink)">${E(i.nomor_invoice || '(menunggu nomor)')}</a><div class="xs muted">Tgl: ${TGL(i.tanggal)}</div>${i.no_faktur ? `<div class="xs" style="color:var(--success-dark)">${I('check', '')} e-Faktur ${E(i.no_faktur)}</div>` : '<div class="xs" style="color:var(--danger)">e-Faktur belum ada</div>'}</td>
    <td>${vendorCell(Store.vendor(i.vendor_id))}</td><td><span class="tag-mini">${E(p.nomor_po || '-')}</span><br><span class="tag-mini" style="margin-top:4px">${E(b.nomor_bast || '-')}</span></td>
    <td class="small">${TGL(i.jatuh_tempo)}${paid ? `<div class="xs" style="color:var(--success-dark)">Dibayar ${TGL(i.tgl_bayar)}</div>` : i.status === 'Ditolak' ? '' : `<div class="pill-lbl ${dt < 0 ? 'pl-red' : dt <= 7 ? 'pl-amber' : 'pl-blue'}" style="display:inline-block;margin-top:4px">${dt < 0 ? 'Lewat ' + -dt + ' hari' : 'Sisa ' + dt + ' hari'}</div>`}</td>
    <td class="num"><div class="mono xs muted">DPP: ${UI.num(i.dpp)}</div><div class="mono xs muted">PPN: ${UI.num(i.ppn)} · PPh22: ${UI.num(i.pph)}</div><b>${RP(i.netto)}</b></td>
    <td>${CHIP(i.status)}${i.no_sp2d ? `<div class="mono xs muted" style="margin-top:4px">SP2D: ${E(i.no_sp2d)}</div>` : ''}${i.sumber_dana ? `<div class="xs muted">${E(i.sumber_dana)}</div>` : ''}</td>
    <td class="row" style="gap:4px">${(approve || can('invApprove')) && i.status === 'Menunggu Verifikasi' ? `<button class="btn btn-success btn-xs" data-act="inv.approve" data-id="${i.id}">Setujui</button><button class="btn btn-outline-danger btn-xs" data-act="inv.reject" data-id="${i.id}">Tolak</button>` : ''}${can('invPay') && i.status === 'Disetujui' ? `<button class="btn btn-xs" data-act="inv.pay" data-id="${i.id}">${I('money')} Catat SP2D</button>` : ''}${can('invEdit') && i.status === 'Ditolak' ? `<button class="btn btn-soft btn-xs" data-act="inv.new" data-bast="${i.bast_id}">Ajukan Ulang</button>` : ''}<a class="icon-btn" href="#/invoice/${i.id}" title="Detail">${I('eye')}</a></td></tr>`; }).join('') || `<tr><td colspan="7">${UI.empty('Tidak ada invoice', 'money')}</td></tr>`}
  </tbody></table></div>${page ? UI.pager(pg, 'inv.page', 'tagihan') : ''}`;
}
function invBottom() {
  const danas = [...new Set(S.invoice.map(i => i.sumber_dana).filter(Boolean))];
  const rows = danas.map(d => { const l = S.invoice.filter(i => i.sumber_dana === d && i.status !== 'Ditolak' && inYear(i.tanggal)); const tot = l.reduce((a, i) => a + i.netto, 0), paid = l.filter(i => i.status === 'Dibayar').reduce((a, i) => a + i.netto, 0); return { d, tot, paid, pct: tot ? paid / tot * 100 : 0 }; });
  const allT = rows.reduce((a, r) => a + r.tot, 0), allP = rows.reduce((a, r) => a + r.paid, 0);
  return `<div class="grid g-3-2 mt"><div class="card"><div class="card-head"><div class="ic">${I('refresh')}</div><div style="flex:1"><h3>Progres Pencairan Termin Belanja</h3><p>Realisasi pembayaran vs total tagihan per sumber dana TA ${YEAR}</p></div><span class="chip st-green nodot">${allT ? (allP / allT * 100).toFixed(1) : 0}% Realisasi</span></div>
    ${rows.map(r => `<div class="prog-row"><div class="top"><span>${E(r.d)}</span><span class="mono">${RP(r.paid)} / ${RP(r.tot)} (${r.pct.toFixed(0)}%)</span></div><div class="prog-bar"><i class="${r.pct >= 80 ? 'g' : r.pct < 50 ? 'o' : ''}" style="width:${r.pct}%"></i></div></div>`).join('') || UI.empty('Belum ada tagihan')}</div>
  <div class="card"><div class="card-head"><div class="ic" style="background:#d6f5df;color:var(--success)">${I('clipcheck')}</div><div style="flex:1"><h3>Kelengkapan Dokumen SPM</h3><p>Syarat mutlak sebelum penerbitan Surat Perintah Membayar</p></div><span class="chip st-blue nodot">5 Standar Baku</span></div>
    ${[['BAST Fisik / Digital Sah', 'Ditandatangani PPTK & rekanan (otomatis dari modul BAST)'], ['Kuitansi Asli Bermaterai', 'Memuat rincian pekerjaan dan stempel rekanan'], ['e-Faktur Pajak Tervalidasi DJP', 'Nomor faktur tercatat pada invoice'], ['Surat Permohonan Pembayaran Vendor', 'Nomor rekening sesuai data rekanan di VMS'], ['Berita Acara Pembayaran (BAP) PPK', 'Persetujuan invoice oleh PPK di sistem']].map(([a, b], i) => `<div class="act-item row" style="align-items:flex-start"><span style="color:var(--success)">${I('check')}</span><div><b class="small">${i + 1}. ${a}</b><div class="xs muted">${b}</div></div></div>`).join('')}</div></div>`;
}
const updInvTable = () => { const el = document.getElementById('inv-table'); if (el) el.innerHTML = invTableHTML(invFiltered(), { page: true }); };
Act['inv.tab'] = el => { const s = ps('invoice'); s.tab = el.dataset.v; s.page = 1; App.refreshCurrent(); };
Act['inv.q'] = UI.debounce(el => { const s = ps('invoice'); s.q = el.value; s.page = 1; updInvTable(); }, 120);
Act['inv.dana'] = el => { const s = ps('invoice'); s.dana = el.value; s.page = 1; updInvTable(); };
Act['inv.bulan'] = el => { const s = ps('invoice'); s.bulan = el.value; s.page = 1; updInvTable(); };
Act['inv.page'] = el => { ps('invoice').page = +el.dataset.page; updInvTable(); };
Act['inv.export'] = () => UI.exportExcel('Rekap_Pajak_SP2D_' + UI.iso(), { Invoice: invFiltered().map(i => ({ 'No Invoice': i.nomor_invoice, Tanggal: i.tanggal, Vendor: vName(i.vendor_id), NPWP: (Store.vendor(i.vendor_id) || {}).npwp, 'No Faktur': i.no_faktur, 'No PO': (Store.po(i.po_id) || {}).nomor_po, 'No BAST': (Store.byId('bast', i.bast_id) || {}).nomor_bast, DPP: i.dpp, PPN: i.ppn, 'PPh 22': i.pph, Netto: i.netto, 'Jatuh Tempo': i.jatuh_tempo, 'Sumber Dana': i.sumber_dana, Status: i.status, 'No SP2D': i.no_sp2d, 'Tgl Bayar': i.tgl_bayar })) });
Act['inv.new'] = el => invCreate(el.dataset.bast || '');
function invCalc(bastId) {
  const d = Store.bastItems(bastId); const dpp = Math.round(d.reduce((a, x) => a + x.qty_diterima * x.harga, 0));
  const ppn = Math.round(dpp * Number(S.settings.PPN_RATE || 11) / 100), pph = Math.round(dpp * Number(S.settings.PPH22_RATE || 1.5) / 100);
  return { dpp, ppn, pph, netto: dpp - pph };
}
function invCreate(bastId, onClose) {
  const billed = new Set(S.invoice.filter(i => i.status !== 'Ditolak').map(i => i.bast_id));
  const avail = S.bast.filter(b => b.status === 'Ditandatangani' && !billed.has(b.id));
  const jt = new Date(); jt.setDate(jt.getDate() + 14);
  const m = UI.modal({
    title: 'Buat Invoice / Tagihan', sub: 'Invoice hanya dapat dibuat dari BAST yang sudah ditandatangani', size: 'lg', onClose,
    body: `<div class="form-grid"><div class="field full"><label>BAST Referensi <span class="req">*</span></label><select class="select" id="iv-bast">${UI.opt(avail.map(b => ({ v: b.id, l: b.nomor_bast + ' — ' + vName(b.vendor_id) + ' (PO ' + ((Store.po(b.po_id) || {}).nomor_po || '') + ')' })), bastId, avail.length ? 'Pilih BAST…' : 'Tidak ada BAST yang siap ditagih')}</select></div>
      <div class="field"><label>No. e-Faktur Pajak</label><input class="input mono" id="iv-faktur" placeholder="010.000-26.00000000"></div><div class="field"><label>Tanggal Invoice</label><input class="input" type="date" id="iv-tgl" value="${UI.iso()}"></div>
      <div class="field"><label>Jatuh Tempo</label><input class="input" type="date" id="iv-jt" value="${UI.iso(jt)}"></div><div class="field"><label>Scan Kuitansi / Faktur (PDF)</label><input class="input" type="file" id="iv-file" accept="application/pdf,image/*" style="padding-top:8px"></div>
      <div class="field full"><label>Catatan</label><input class="input" id="iv-cat"></div></div><div id="iv-calc" class="mt"></div>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn" id="iv-ok">${I('check')} Simpan & Ajukan ke PPK</button>`
  });
  const upd = () => {
    const b = m.q('#iv-bast').value; if (!b) { m.q('#iv-calc').innerHTML = ''; return; }
    const c = invCalc(b);
    m.q('#iv-calc').innerHTML = `<div class="statline"><div><div class="k">DPP (barang diterima)</div><div class="v num">${RP(c.dpp)}</div></div><div><div class="k">PPN ${E(S.settings.PPN_RATE)}%</div><div class="v num">${RP(c.ppn)}</div></div><div><div class="k">PPh 22 ${E(S.settings.PPH22_RATE)}%</div><div class="v num">${RP(c.pph)}</div></div><div><div class="k">Netto ditransfer</div><div class="v num" style="color:var(--success-dark)">${RP(c.netto)}</div></div></div>`;
  };
  m.q('#iv-bast').onchange = upd; upd();
  m.q('#iv-ok').onclick = async () => {
    const b = Store.byId('bast', m.q('#iv-bast').value); if (!b) { UI.toast('Pilih BAST referensi', 'err'); return; }
    let file_id = '';
    const f = m.q('#iv-file').files[0];
    if (f) { UI.busy(m.q('#iv-ok'), true); try { const c = await UI.compressImage(f); const r = await API.call('uploadFile', { po_id: b.po_id, vendor_id: b.vendor_id, base64: c.base64, name: 'Faktur_' + c.name, mime: c.mime }, { timeout: 120000 }); file_id = r.data[0].fileId; } catch (e) { UI.toast('Upload gagal: ' + e.message, 'err'); UI.busy(m.q('#iv-ok'), false); return; } }
    const po = Store.po(b.po_id) || {};
    const payload = { id: UI.uid(), bast_id: b.id, no_faktur: m.q('#iv-faktur').value.trim(), tanggal: m.q('#iv-tgl').value, jatuh_tempo: m.q('#iv-jt').value, catatan: m.q('#iv-cat').value.trim(), file_id };
    const local = { ...payload, ...invCalc(b.id), nomor_invoice: '', po_id: b.po_id, vendor_id: b.vendor_id, sumber_dana: po.sumber_dana, status: 'Menunggu Verifikasi', created_at: new Date().toISOString() };
    API.mutate({ label: 'Simpan invoice', apply: () => Store.upsert('invoice', local), rollback: () => Store.remove('invoice', payload.id), run: () => API.call('saveInvoice', payload), onSuccess: r => Store.upsert('invoice', r.data.invoice) });
    m.close();
  };
}
Act['inv.approve'] = async el => {
  const i = Store.byId('invoice', el.dataset.id);
  if (!await UI.confirm('Setujui invoice?', `Invoice <b>${E(i.nomor_invoice)}</b> senilai <b>${RP(i.netto)}</b> (netto) untuk ${E(vName(i.vendor_id))} akan disetujui dan diteruskan untuk penerbitan SP2D.`, { ok: 'Setujui' })) return;
  API.mutate({ label: 'Setujui invoice', apply: () => Store.upsert('invoice', { id: i.id, status: 'Disetujui' }), rollback: o => Store.upsert('invoice', o), run: () => API.call('approveInvoice', { id: i.id, keputusan: 'setuju' }), onSuccess: r => Store.upsert('invoice', r.data.invoice) });
};
Act['inv.reject'] = async el => {
  const i = Store.byId('invoice', el.dataset.id);
  const why = await UI.confirm('Tolak invoice?', `Invoice <b>${E(i.nomor_invoice)}</b> akan dikembalikan ke vendor/Pejabat Pengadaan.`, { danger: true, ok: 'Tolak', input: { label: 'Alasan penolakan', required: true, textarea: true, placeholder: 'mis. Faktur beda nominal, selisih PPN…' } });
  if (!why) return;
  API.mutate({ label: 'Tolak invoice', apply: () => Store.upsert('invoice', { id: i.id, status: 'Ditolak', catatan: why }), rollback: o => Store.upsert('invoice', o), run: () => API.call('approveInvoice', { id: i.id, keputusan: 'tolak', catatan: why }), onSuccess: r => Store.upsert('invoice', r.data.invoice) });
};
Act['inv.pay'] = el => {
  const i = Store.byId('invoice', el.dataset.id);
  const v = Store.vendor(i.vendor_id) || {};
  const m = UI.modal({ title: 'Catat Pembayaran (SP2D)', sub: E(i.nomor_invoice) + ' · ' + E(v.nama || ''), body: `<div class="statline mb"><div><div class="k">Netto ditransfer</div><div class="v num">${RP(i.netto)}</div></div><div><div class="k">Rekening tujuan</div><div class="small mono">${E(v.bank || '-')} ${E(v.no_rekening || '')}<br>${E(v.nama_rekening || '')}</div></div></div><div class="form-grid"><div class="field"><label>Nomor SP2D <span class="req">*</span></label><input class="input mono" id="sp-no" placeholder="902/BLUD/IX/${YEAR}"></div><div class="field"><label>Tanggal Bayar</label><input class="input" type="date" id="sp-tgl" value="${UI.iso()}"></div></div>`, foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-success" id="sp-ok">${I('check')} Tandai Dibayar</button>` });
  m.q('#sp-ok').onclick = () => {
    const no = m.q('#sp-no').value.trim(); if (!no) { m.q('#sp-no').classList.add('invalid'); return; }
    const tgl = m.q('#sp-tgl').value;
    API.mutate({ label: 'Catat pembayaran', apply: () => Store.upsert('invoice', { id: i.id, status: 'Dibayar', no_sp2d: no, tgl_bayar: tgl }), rollback: o => Store.upsert('invoice', o), run: () => API.call('payInvoice', { id: i.id, no_sp2d: no, tgl_bayar: tgl }), onSuccess: r => { Store.upsert('invoice', r.data.invoice); if (r.data.po) Store.upsert('po', r.data.po); } });
    m.close();
  };
};
function invDrawer(id, onClose) {
  const i = Store.byId('invoice', id); if (!i) return;
  const v = Store.vendor(i.vendor_id) || {}, p = Store.po(i.po_id) || {}, b = Store.byId('bast', i.bast_id) || {};
  const hasTpl = S.templates.some(t => t.jenis === 'INVOICE' && t.status === 'Aktif');
  const m = UI.modal({
    drawer: true, onClose, title: `<span class="mono">${E(i.nomor_invoice || 'Invoice')}</span>`, sub: E(v.nama || ''),
    body: `<div class="row">${CHIP(i.status)}<span class="spacer"></span><b class="num" style="font-size:18px;color:var(--primary-deep)">${RP(i.netto)}</b></div>
      <div class="grid g2 mt" style="gap:12px">${[['TANGGAL', TGL(i.tanggal, 1)], ['JATUH TEMPO', TGL(i.jatuh_tempo, 1)], ['NO. E-FAKTUR', i.no_faktur], ['SUMBER DANA', i.sumber_dana], ['REFERENSI PO', p.nomor_po], ['REFERENSI BAST', b.nomor_bast], ['NO. SP2D', i.no_sp2d], ['TANGGAL BAYAR', TGL(i.tgl_bayar)]].map(([k, x]) => `<div><div class="mono xs muted">${k}</div><div class="small mono">${E(x || '-')}</div></div>`).join('')}</div>
      <h3 class="mt">Rincian Perhitungan</h3><table class="tbl"><tbody><tr><td>DPP (nilai barang diterima)</td><td class="num">${RP(i.dpp)}</td></tr><tr><td>PPN ${E(S.settings.PPN_RATE)}%</td><td class="num">${RP(i.ppn)}</td></tr><tr><td>Bruto (DPP + PPN)</td><td class="num">${RP(i.dpp + i.ppn)}</td></tr><tr><td>Potongan PPN (wapu BLUD)</td><td class="num">− ${RP(i.ppn)}</td></tr><tr><td>Potongan PPh 22 ${E(S.settings.PPH22_RATE)}%</td><td class="num">− ${RP(i.pph)}</td></tr></tbody><tfoot><tr><td>Netto ditransfer</td><td class="num">${RP(i.netto)}</td></tr></tfoot></table>
      <h3 class="mt">Rekening Tujuan</h3><div class="act-item small mono">${E(v.bank || '-')} · ${E(v.no_rekening || '-')}<br>a.n. ${E(v.nama_rekening || '-')}</div>
      ${i.catatan ? `<p class="small mt"><b>Catatan:</b> ${E(i.catatan)}</p>` : ''}
      ${i.file_id ? `<a class="file-row" target="_blank" rel="noopener" href="${UI.driveUrl(i.file_id)}">${I('pdf', 'fi')}<span class="small" style="flex:1">Scan faktur / kuitansi</span>${I('ext')}</a>` : ''}
      ${i.doc_file_id ? `<a class="file-row" target="_blank" rel="noopener" href="${UI.driveUrl(i.doc_file_id)}">${I('pdf', 'fi')}<span class="small" style="flex:1">Kuitansi resmi (PDF)</span>${I('ext')}</a>` : ''}`,
    foot: `${can('genDoc') && hasTpl ? `<button class="btn btn-outline" data-act="doc.gen" data-jenis="INVOICE" data-id="${i.id}">${I('doc')} Generate Kuitansi</button>` : ''}<span class="spacer"></span>${can('invApprove') && i.status === 'Menunggu Verifikasi' ? `<button class="btn btn-outline-danger" data-act="inv.reject" data-id="${i.id}">Tolak</button><button class="btn btn-success" data-act="inv.approve" data-id="${i.id}">Setujui</button>` : ''}${can('invPay') && i.status === 'Disetujui' ? `<button class="btn" data-act="inv.pay" data-id="${i.id}">${I('money')} Catat SP2D</button>` : ''}`
  });
  m.el.addEventListener('click', e => { if (e.target.closest('[data-act^="inv."]')) m.close(); });
}

/* =====================================================================
   KONTRAK
   ===================================================================== */
Pages.kontrak = {
  title: 'Kontrak', deps: ['kontrak', 'vendors', 'po'],
  render(el) {
    const list = S.kontrak.slice().sort((a, b) => (b.created_at || '') > (a.created_at || '') ? 1 : -1);
    el.innerHTML = pageHead({ eyebrow: `<span class="tag">Surat Perjanjian / SPK</span> • TA ${YEAR}`, title: 'Kontrak Pengadaan', sub: 'Surat perjanjian kerja untuk paket bernilai besar, dengan klausul jaminan, sanksi keterlambatan, dan persetujuan PPK.', actions: can('kontrakEdit') ? `<button class="btn" data-act="k.edit">${I('plus')} Buat Kontrak</button>` : '' }) +
      `<div class="grid g4 mb">${kpi({ lbl: 'Kontrak Aktif', val: S.kontrak.filter(k => k.status === 'Aktif').length, ico: 'contract', ic: 'g' })}${kpi({ lbl: 'Menunggu Approval', val: S.kontrak.filter(k => k.status === 'Menunggu Approval').length, ico: 'hourglass', ic: 'a' })}${kpi({ lbl: 'Nilai Kontrak Aktif', val: RP(S.kontrak.filter(k => k.status === 'Aktif').reduce((a, k) => a + k.nilai, 0)), ico: 'wallet', accent: true })}${kpi({ lbl: 'Berakhir ≤ 30 Hari', val: S.kontrak.filter(k => k.status === 'Aktif' && UI.daysTo(k.tgl_selesai) <= 30).length, ico: 'clock', ic: 'r' })}</div>
      <div class="card pad-0">${kontrakTable(list)}</div>`;
  }
};
function kontrakTable(list) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nomor</th><th>Judul Pekerjaan</th><th>Vendor</th><th>Periode</th><th class="num">Nilai</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(k => `<tr><td class="mono small">${E(k.nomor || '(menunggu nomor)')}</td><td>${E(k.judul)}<div class="sub">${E((Store.po(k.po_id) || {}).nomor_po || '')}</div></td><td>${E(vName(k.vendor_id))}</td><td class="small">${TGL(k.tgl_mulai)} – ${TGL(k.tgl_selesai)}</td><td class="num">${RP(k.nilai)}</td><td>${CHIP(k.status)}</td>
    <td class="row" style="gap:4px">${can('kontrakApprove') && k.status === 'Menunggu Approval' ? `<button class="btn btn-success btn-xs" data-act="k.approve" data-id="${k.id}">Sahkan</button><button class="btn btn-outline-danger btn-xs" data-act="k.reject" data-id="${k.id}">Tolak</button>` : ''}${can('kontrakEdit') && ['Draft', 'Ditolak'].includes(k.status) ? `<button class="btn btn-soft btn-xs" data-act="k.edit" data-id="${k.id}">Edit</button>` : ''}${can('genDoc') && k.status === 'Aktif' && S.templates.some(t => t.jenis === 'KONTRAK' && t.status === 'Aktif') ? `<button class="icon-btn" data-act="doc.gen" data-jenis="KONTRAK" data-id="${k.id}" title="Generate dokumen">${I('doc')}</button>` : ''}${k.doc_file_id ? `<a class="icon-btn" target="_blank" rel="noopener" href="${UI.driveUrl(k.doc_file_id)}">${I('pdf')}</a>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${UI.empty('Belum ada kontrak', 'contract')}</td></tr>`}
  </tbody></table></div>`;
}
Act['k.edit'] = el => {
  const k = el.dataset.id ? Store.byId('kontrak', el.dataset.id) : { id: UI.uid() };
  const m = UI.modal({ title: el.dataset.id ? 'Edit Kontrak' : 'Buat Kontrak', size: 'lg', body: `<form class="form-grid" id="kf"><div class="field full"><label>Judul Pekerjaan <span class="req">*</span></label><input class="input" name="judul" value="${E(k.judul || '')}"></div>
    <div class="field"><label>Vendor <span class="req">*</span></label><select class="select" name="vendor_id">${UI.opt(S.vendors.filter(v => v.status !== 'Nonaktif').map(v => ({ v: v.id, l: v.nama })), k.vendor_id, 'Pilih vendor')}</select></div><div class="field"><label>Referensi PO</label><select class="select" name="po_id">${UI.opt(S.po.filter(p => ACTIVE_PO(p)).map(p => ({ v: p.id, l: p.nomor_po + ' — ' + vName(p.vendor_id) })), k.po_id, '(opsional)')}</select></div>
    <div class="field"><label>Nilai Kontrak (Rp) <span class="req">*</span></label><input class="input mono" name="nilai" inputmode="numeric" value="${k.nilai || ''}"></div><div></div><div class="field"><label>Tanggal Mulai</label><input class="input" type="date" name="tgl_mulai" value="${E(k.tgl_mulai || UI.iso())}"></div><div class="field"><label>Tanggal Selesai</label><input class="input" type="date" name="tgl_selesai" value="${E(k.tgl_selesai || '')}"></div>
    <div class="field full"><label>Catatan / Klausul Khusus</label><textarea class="textarea" name="catatan">${E(k.catatan || '')}</textarea></div></form>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-outline" data-sub="0">Simpan Draft</button><button class="btn" data-sub="1">Ajukan ke PPK</button>` });
  m.qa('[data-sub]').forEach(b => b.onclick = () => {
    const x = UI.formData(m.q('#kf')); x.nilai = Number(String(x.nilai).replace(/\D/g, '')) || 0;
    if (!x.judul || !x.vendor_id || !x.nilai) { UI.toast('Judul, vendor, dan nilai wajib diisi', 'err'); return; }
    const payload = { ...k, ...x, submit: b.dataset.sub === '1' };
    const existed = Store.byId('kontrak', k.id);
    API.mutate({ label: 'Simpan kontrak', apply: () => Store.upsert('kontrak', { ...k, ...x, status: payload.submit ? 'Menunggu Approval' : 'Draft', created_at: k.created_at || new Date().toISOString() }), rollback: o => existed ? Store.upsert('kontrak', o) : Store.remove('kontrak', k.id), run: () => API.call('saveKontrak', payload), onSuccess: r => Store.upsert('kontrak', r.data.kontrak) });
    m.close();
  });
};
async function decideK(id, keputusan) {
  const k = Store.byId('kontrak', id); let catatan = '';
  if (keputusan === 'tolak') { catatan = await UI.confirm('Tolak kontrak?', E(k.judul), { danger: true, ok: 'Tolak', input: { label: 'Alasan', required: true, textarea: true } }); if (!catatan) return; }
  else if (!await UI.confirm('Sahkan kontrak?', `<b>${E(k.judul)}</b> — ${RP(k.nilai)}`, { ok: 'Sahkan' })) return;
  API.mutate({ label: 'Keputusan kontrak', apply: () => Store.upsert('kontrak', { id, status: keputusan === 'setuju' ? 'Aktif' : 'Ditolak' }), rollback: o => Store.upsert('kontrak', o), run: () => API.call('approveKontrak', { id, keputusan, catatan }), onSuccess: r => { Store.upsert('kontrak', r.data.kontrak); if (keputusan === 'setuju') genDocument('KONTRAK', id, { silent: true, manual: {} }); } });
}
Act['k.approve'] = el => decideK(el.dataset.id, 'setuju');
Act['k.reject'] = el => decideK(el.dataset.id, 'tolak');
