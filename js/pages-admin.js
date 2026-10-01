/* ==========================================================================
   HALAMAN ADMIN & ANALITIK: Kelola Template (Google Docs), Laporan & Ekspor,
   Pengaturan Sistem (Pengguna, Aplikasi, Backup/Restore, Migrasi, Log).
   ========================================================================== */

/* =====================================================================
   KELOLA TEMPLATE DOKUMEN (gas-doc-engine)
   - Format bawaan: SP (PO), BAPB, BAST Hasil Pekerjaan, Invoice — langsung
     bisa dicetak/PDF dari browser tanpa setup apa pun.
   - "Pasang Template Bawaan" menyalin format bawaan menjadi Google Docs di
     Drive (folder Template_Docs) → desain bisa diubah bebas di Google Docs,
     penanda {{KUNCI}} tetap terisi otomatis saat generate PDF.
   - Template kustom: daftarkan Google Docs sendiri berisi {{KUNCI}} / [KUNCI].
   ===================================================================== */
const JENIS_DOK = [{ v: 'PO', l: 'Surat Pesanan (SP / PO)' }, { v: 'BAPB', l: 'Berita Acara Penerimaan Barang (BAPB)' }, { v: 'BASTP', l: 'BAST Hasil Pekerjaan' }, { v: 'INVOICE', l: 'Invoice / Tagihan' }, { v: 'CUSTOM', l: 'Dokumen Custom Lainnya' }];
const JENIS_CETAK = ['PO', 'BAPB', 'BASTP', 'INVOICE'];
const tok = p => '{{' + p + '}}';
Pages.template = {
  title: 'Kelola Template', roles: ['ADMIN'], deps: ['templates', 'po', 'bast', 'invoice'],
  render(el) {
    const st = ps('template', { draft: null, guide: false });
    const aktif = S.templates.filter(t => t.status === 'Aktif');
    const last = S.templates.map(t => t.last_scan).sort().pop();
    el.innerHTML = pageHead({
      eyebrow: `● Document Engine • ${E(S.settings.RS_NAMA || '')} v1.1`, title: 'Kelola Template Dokumen',
      sub: 'Format bawaan siap cetak/PDF. Desain dapat diubah di Google Docs memakai penanda <span class="code-pill">{{NAMA_KUNCI}}</span>, baris barang <span class="code-pill">{{#ITEM}}</span>, dan gambar TTD <span class="code-pill">{{TTD_PPK}}</span>.',
      actions: `<button class="btn btn-outline" data-act="tpl.guide">${I('braces')} Daftar Penanda</button><button class="btn btn-success" data-act="tpl.install">${I('down')} Pasang Template Bawaan</button><button class="btn" data-act="tpl.new">${I('plus')} Template Kustom</button>`
    }) + `<div class="grid g4 tpl-def">${JENIS_CETAK.map(j => { const t = aktif.find(x => DC.normJenis(x.jenis) === j); const custom = t && String(t.is_default) !== '1';
        return `<div class="card"><div class="card-head"><div class="ic">${I('doc')}</div><div style="flex:1;min-width:0"><h3>${E(DOC_LABEL[j] || j)}</h3><p class="ellipsis">${t ? (custom ? 'Desain kustom: ' + E(t.nama) : 'Template bawaan (Google Docs)') : 'Format bawaan (cetak browser)'}</p></div></div>
          <div class="row wrap" style="gap:6px">${t ? `<span class="chip ${custom ? 'st-blue' : 'st-green'} nodot">${custom ? 'Kustom aktif' : 'Docs aktif'}</span>` : '<span class="chip st-gray nodot">Bawaan</span>'}<span class="chip nodot">${S.settings.TTD_MODE === 'basah' ? 'TTD basah' : 'TTD gambar'}</span></div>
          <div class="row wrap mt" style="gap:6px"><button class="btn btn-outline btn-sm" data-act="tpl.sample" data-j="${j}">${I('eye')} Pratinjau</button>${t ? `<a class="btn btn-ghost btn-sm" href="${E(t.doc_url)}" target="_blank" rel="noopener">${I('ext')} Edit desain</a>` : ''}</div></div>`; }).join('')}</div>
    <div class="info-box mt">${I('info')}<span><b>Alur kustomisasi:</b> klik <b>Pasang Template Bawaan</b> → buka "Edit desain" (Google Docs) → ubah tata letak/teks sesuka hati, pertahankan penanda {{…}} → kembali ke sini, <b>Scan Ulang</b> → simpan. Tombol "PDF dari Template" pada dialog cetak akan memakai desain tersebut. ${last ? 'Scan terakhir ' + UI.ago(last) + '.' : ''}</span></div>
    ${st.guide ? `<div class="card mt" id="tpl-guide">${tplGuide()}</div>` : ''}
    <div class="card mt" id="tpl-panel">${tplPanel(st.draft)}</div>
    <div class="row mt" style="margin-top:28px"><h2 style="flex:1">Template Terdaftar <span class="chip st-blue nodot">${S.templates.length}</span></h2><span class="small muted hide-sm">Scan ulang setelah mengubah Google Docs</span></div>
    <div class="grid g2 mt-s">${S.templates.map(t => { const um = (t.placeholders || []).filter(p => !(t.mapping || {})[p]).length; return `<div class="card"><div class="card-head"><div class="ic">${I('doc')}</div><div style="flex:1;min-width:0"><h3>${E(t.nama)}${String(t.is_default) === '1' ? ' <span class="chip st-gray nodot">bawaan</span>' : ''}</h3><div class="mono xs muted ellipsis">${E(DOC_LABEL[DC.normJenis(t.jenis)] || t.jenis)} • <span style="color:var(--success-dark)">${(t.placeholders || []).length} penanda</span></div></div>${CHIP(t.status === 'Aktif' ? 'Aktif' : t.status === 'Draft' ? 'Menunggu Verifikasi' : 'Nonaktif')}</div>
      <div class="row wrap mono xs">${(t.placeholders || []).slice(0, 8).map(p => `<span class="tag-mini">${E(tok(p))}</span>`).join('')}${(t.placeholders || []).length > 8 ? `<span class="muted">+${t.placeholders.length - 8}</span>` : ''}</div>
      <div class="row mono xs muted mt-s">${I('clock')} ${UI.tglJam(t.last_scan)}${um ? ` · <span style="color:var(--warn)">${um} belum di-map</span>` : ''}</div>
      <div class="row wrap mt" style="gap:6px"><a class="btn btn-ghost btn-sm" href="${E(t.doc_url)}" target="_blank" rel="noopener">${I('ext')} Google Docs</a><span class="spacer"></span><button class="btn btn-outline btn-sm" data-act="tpl.rescan" data-id="${t.id}">${I('refresh')} Scan Ulang</button><button class="btn btn-sm ${um ? 'btn-danger' : ''}" data-act="tpl.edit" data-id="${t.id}">${I('sliders')} Mapping</button>${t.status !== 'Aktif' ? `<button class="btn btn-soft btn-sm" data-act="tpl.activate" data-id="${t.id}">Aktifkan</button>` : ''}<button class="icon-btn" data-act="tpl.del" data-id="${t.id}" title="Hapus">${I('trash')}</button></div></div>`; }).join('') || `<div class="card span-all">${UI.empty('Belum ada template Google Docs. Dokumen tetap bisa dicetak dengan format bawaan. Klik "Pasang Template Bawaan" untuk mulai mengubah desain.', 'doc')}</div>`}</div>`;
  }
};
function tplGuide() {
  const cat = DC.CATALOG;
  return `<div class="card-head"><div class="ic">${I('braces')}</div><div style="flex:1"><h3>Daftar Penanda (Placeholder)</h3><p>Ketik penanda di Google Docs persis seperti di bawah. Format lama <span class="code-pill">[KUNCI]</span> tetap didukung.</p></div><button class="icon-btn" data-act="tpl.guide">${I('x')}</button></div>
    <div class="grid g2" style="gap:14px">${Object.keys(cat).map(g => `<div><div class="mono xs muted" style="letter-spacing:.06em">${E(g.toUpperCase())}</div><div class="stack mt-s" style="gap:4px">${Object.keys(cat[g]).map(k => `<div class="row small" style="gap:8px;align-items:flex-start"><button class="code-pill" data-act="tpl.copy" data-v="${E(g === 'Baris berulang' ? '{{#ITEM}} … {{/ITEM}}' : '{{' + k + '}}')}" title="Salin">${E(g === 'Baris berulang' ? '{{#ITEM}}' : '{{' + k + '}}')}</button><span class="muted">${E(cat[g][k])}</span></div>`).join('')}</div></div>`).join('')}</div>
    <h3 class="mt">Pengubah format</h3><div class="row wrap mt-s mono xs" style="gap:6px">${['{{TOTAL|rupiah}}', '{{TOTAL|terbilang:rupiah}}', '{{TANGGAL_SP|tanggal}}', '{{NAMA_PPK|kapital}}', '{{NIP_PPK|nip}}', '{{KEGIATAN|bawaan:-}}', '{{TTD_PPK|lebar:120}}', '{{LOGO|lebar:62}}'].map(x => `<span class="tag-mini">${E(x)}</span>`).join('')}</div>
    <p class="small muted mt-s">Baris tabel barang: buat <b>satu baris tabel</b> berisi <span class="code-pill">{{ITEM.NO}}</span> <span class="code-pill">{{ITEM.URAIAN}}</span> <span class="code-pill">{{ITEM.VOLUME}}</span> … — baris diulang otomatis untuk setiap barang. Bagian bersyarat: <span class="code-pill">{{?NO_FAKTUR}} … {{/NO_FAKTUR}}</span> hanya tampil bila ada nilainya.</p>`;
}
function srcOptions(sel) {
  const src = S.sources || {};
  return Object.keys(src).map(g => `<optgroup label="${E(g)}">${Object.keys(src[g]).map(k => `<option value="${E(k)}" ${k === sel ? 'selected' : ''}>${E(src[g][k])} — ${E(k)}</option>`).join('')}</optgroup>`).join('');
}
function srcType(k, p) {
  if (!k) return ['—', ''];
  if (k === 'auto') return [DC.IMAGE_KEYS[p] ? 'Gambar' : 'Otomatis', 'Sesuai nama kunci'];
  if (k === 'baris') return ['Baris berulang', 'Per item barang'];
  if (k === 'gambar') return ['Gambar', 'Logo / TTD PNG'];
  if (k.startsWith('tabel.')) return ['Tabel (format lama)', 'Tabel disisipkan'];
  if (k === 'manual') return ['Input Manual', 'Diisi saat generate'];
  if (k === 'kosong') return ['Kosong', '—'];
  if (/terbilang/i.test(k)) return ['Teks', 'Terbilang'];
  if (/tanggal|tgl|jatuh_tempo/i.test(k)) return ['Tanggal', 'DD MMMM YYYY'];
  if (/total|subtotal|ppn|pph|dpp|netto|nilai$|jumlah/i.test(k)) return ['Rupiah', 'Rp 1.234.567'];
  if (/nomor/i.test(k)) return ['Teks (kode)', 'Nomor dokumen'];
  return ['Teks', 'Teks'];
}
function tplPanel(d) {
  if (!d) return `<div class="card-head"><div class="ic">${I('scan')}</div><div style="flex:1"><h3>Daftarkan Template Kustom (Google Docs)</h3><p>Penanda <span class="code-pill">{{KUNCI}}</span> atau <span class="code-pill">[KUNCI]</span> pada dokumen dipindai otomatis</p></div></div>
    <div class="grid tpl-reg" style="gap:14px"><div class="field"><label>URL Google Docs<span class="hint" style="color:var(--success-dark)">Akun pemilik script harus punya akses</span></label><div class="input-ic">${I('link')}<input class="input mono" id="tp-url" placeholder="https://docs.google.com/document/d/…/edit"></div></div>
      <div class="field"><label>Nama Template</label><input class="input" id="tp-nama" placeholder="SP Film Radiologi — desain 2026"></div><div class="field"><label>Jenis Dokumen</label><select class="select" id="tp-jenis">${UI.opt(JENIS_DOK, 'PO')}</select></div></div>
    <div class="row wrap mt"><span class="small muted row">${I('info')} Tip: salin template bawaan lalu ubah — lebih cepat daripada membuat dari nol.</span><span class="spacer"></span><button class="btn btn-success" data-act="tpl.scan">${I('scan')} Scan Penanda</button></div>`;
  const mapped = d.placeholders.filter(p => d.mapping[p] && d.mapping[p] !== 'manual').length;
  const unm = d.placeholders.filter(p => !d.mapping[p]);
  return `<div class="card-head"><div class="ic">${I('scan')}</div><div style="flex:1;min-width:0"><h3>${d.id ? 'Mapping: ' + E(d.nama) : 'Template Baru'}</h3><p class="ellipsis">${E(d.title || '')} · <a href="${E(d.doc_url)}" target="_blank" rel="noopener">buka dokumen</a></p></div><button class="icon-btn" data-act="tpl.close">${I('x')}</button></div>
    <div class="grid tpl-reg" style="gap:14px"><div class="field"><label>URL Google Docs</label><input class="input mono" value="${E(d.doc_url)}" disabled></div><div class="field"><label>Nama Template</label><input class="input" id="tp-nama" value="${E(d.nama)}" data-in="tpl.f" data-f="nama"></div><div class="field"><label>Jenis Dokumen</label><select class="select" data-ch="tpl.f" data-f="jenis">${UI.opt(JENIS_DOK, d.jenis === 'CUSTOM' ? 'CUSTOM' : DC.normJenis(d.jenis))}</select></div></div>
    <div class="card tint mt" style="padding:16px">
      <div class="card row wrap" style="padding:10px 14px"><span style="color:var(--success)">${I('check')}</span><b class="small" style="flex:1">${d.placeholders.length} penanda terdeteksi</b><span class="chip st-blue nodot">${mapped} terhubung</span><span class="chip ${unm.length ? 'st-amber' : 'st-green'} nodot">${unm.length ? unm.length + ' belum' : 'Siap'}</span></div>
      ${d.added && d.added.length ? `<div class="info-box mt-s" style="background:var(--success-tint)">${I('plus')}<span>Penanda baru: <b class="mono">${d.added.map(E).join(', ')}</b></span></div>` : ''}${d.removed && d.removed.length ? `<div class="info-box mt-s" style="background:var(--warn-tint)">${I('alert')}<span>Tidak lagi ada di dokumen: <b class="mono">${d.removed.map(E).join(', ')}</b></span></div>` : ''}
      <div class="card pad-0 mt"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Penanda</th><th>Tipe</th><th style="min-width:260px">Sumber Data</th><th>Format</th><th>Status</th></tr></thead><tbody>
      ${d.placeholders.map(p => { const k = d.mapping[p] || ''; const [tp, fm] = srcType(k, p); return `<tr><td><span class="code-pill">${E(tok(p))}</span></td><td class="mono xs">${tp}</td><td><select class="select input-sm" data-ch="tpl.map" data-p="${E(p)}"><option value="">— pilih sumber —</option>${srcOptions(k)}</select></td><td class="mono xs">${fm}</td><td>${!k ? '<span class="chip st-red">Belum</span>' : k === 'manual' ? '<span class="chip st-amber">Manual</span>' : k === 'kosong' ? '<span class="chip st-gray">Kosong</span>' : '<span class="chip st-green">Otomatis</span>'}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="row small mt" style="color:${unm.length ? 'var(--warn-text)' : 'var(--success-dark)'}">${I(unm.length ? 'alert' : 'check')} ${unm.length ? 'Lengkapi mapping sebelum mengaktifkan template.' : 'Semua penanda terhubung. Penanda "Manual" ditanyakan saat generate PDF.'}</div>
      <div class="row wrap mt" style="gap:8px"><button class="btn btn-outline" data-act="tpl.preview">${I('eye')} Contoh Nilai</button><span class="spacer"></span><button class="btn btn-outline" data-act="tpl.save" data-st="Draft">Simpan Draft</button><button class="btn btn-success" data-act="tpl.save" data-st="Aktif">${I('check')} Simpan & Aktifkan</button></div></div>`;
}
const tplRefresh = () => { const p = document.getElementById('tpl-panel'); if (p) p.innerHTML = tplPanel(ps('template').draft); };
Act['tpl.new'] = () => { ps('template').draft = null; tplRefresh(); const u = document.getElementById('tp-url'); if (u) { u.scrollIntoView({ behavior: 'smooth', block: 'center' }); u.focus(); } };
Act['tpl.guide'] = () => { const s = ps('template'); s.guide = !s.guide; App.refreshCurrent(); if (s.guide) setTimeout(() => { const g = document.getElementById('tpl-guide'); if (g) g.scrollIntoView({ behavior: 'smooth' }); }, 30); };
Act['tpl.copy'] = el => { try { navigator.clipboard.writeText(el.dataset.v); UI.toast('Disalin: ' + el.dataset.v, 'ok', 1500); } catch (e) { } };
Act['tpl.close'] = () => { ps('template').draft = null; tplRefresh(); };
Act['tpl.f'] = el => { ps('template').draft[el.dataset.f] = el.value; };
Act['tpl.map'] = el => { ps('template').draft.mapping[el.dataset.p] = el.value; tplRefresh(); };
/** Contoh data terbaru per jenis → id rekaman untuk pratinjau */
function sampleRef(j) {
  if (j === 'PO') return (S.po.find(p => ACTIVE_PO(p)) || S.po[0] || {}).id;
  if (j === 'BAPB' || j === 'BASTP') return (S.bast.find(b => b.status === 'Ditandatangani') || S.bast[0] || {}).id;
  if (j === 'INVOICE') return (S.invoice[0] || {}).id;
}
Act['tpl.sample'] = el => { const id = sampleRef(el.dataset.j); if (!id) { UI.toast('Belum ada data ' + (DOC_LABEL[el.dataset.j] || el.dataset.j) + ' untuk contoh pratinjau', 'warn'); return; } Doc.open(el.dataset.j, id); };
Act['tpl.install'] = async el => {
  const ada = S.templates.filter(t => String(t.is_default) === '1').length;
  if (!await UI.confirm('Pasang template bawaan?', `Format bawaan SP, BAPB, BAST Hasil Pekerjaan, dan Invoice akan disalin menjadi <b>4 file Google Docs</b> di folder <b>Template_Docs</b> Drive Anda, lalu diaktifkan (kecuali jenis yang sudah memakai template kustom).${ada ? '<br><br><span class="muted">Sudah ada ' + ada + ' template bawaan terpasang — salinan baru akan dibuat.</span>' : ''}`, { ok: 'Pasang' })) return;
  UI.busy(el, true);
  try {
    const r = await API.call('installDefaultTemplates', { templates: Doc.installPayload(), logo: await Doc.logoDataUrl(), aktifkan: true }, { timeout: 240000 });
    S.templates = r.data.templates; if (r.data.settings) S.settings = r.data.settings; Store.upsertMany('templates', []);
    UI.toast(r.message, 'ok', 5000); App.refreshCurrent();
  } catch (e) { UI.toast('Gagal memasang: ' + e.message, 'err', 8000); }
  UI.busy(el, false);
};
async function doScan(url, jenis, base, btn) {
  UI.busy(btn, true);
  try {
    const r = await API.call('scanTemplate', { url, jenis, id: base && base.id }, { timeout: 120000 });
    ps('template').draft = Object.assign({ nama: r.data.title, jenis, status: 'Aktif' }, base || {}, { doc_url: base ? base.doc_url : url, doc_id: r.data.doc_id, title: r.data.title, placeholders: r.data.placeholders, mapping: r.data.mapping, hash: r.data.hash, added: base ? r.data.added : [], removed: base ? r.data.removed : [] });
    tplRefresh(); document.getElementById('tpl-panel').scrollIntoView({ behavior: 'smooth' });
    UI.toast(r.data.placeholders.length + ' penanda terdeteksi', 'ok');
  } catch (e) { UI.toast(e.message, 'err', 6000); UI.busy(btn, false); }
}
Act['tpl.scan'] = el => {
  const url = document.getElementById('tp-url').value.trim(); if (!url) { UI.toast('Tempel URL Google Docs', 'err'); return; }
  const nm = document.getElementById('tp-nama').value.trim();
  doScan(url, document.getElementById('tp-jenis').value, null, el).then(() => { const d = ps('template').draft; if (d && nm) { d.nama = nm; tplRefresh(); } });
};
Act['tpl.rescan'] = el => { const t = Store.byId('templates', el.dataset.id); doScan(t.doc_url, t.jenis, JSON.parse(JSON.stringify(t)), el); };
Act['tpl.edit'] = el => { const t = Store.byId('templates', el.dataset.id); ps('template').draft = JSON.parse(JSON.stringify({ ...t, mapping: t.mapping || {}, placeholders: t.placeholders || [] })); tplRefresh(); document.getElementById('tpl-panel').scrollIntoView({ behavior: 'smooth' }); };
Act['tpl.activate'] = el => { const t = Store.byId('templates', el.dataset.id); saveTpl({ ...JSON.parse(JSON.stringify(t)), status: 'Aktif' }); };
Act['tpl.del'] = async el => {
  const t = Store.byId('templates', el.dataset.id);
  if (!await UI.confirm('Hapus template?', `Template <b>${E(t.nama)}</b> dihapus dari sistem (file Google Docs tidak dihapus). Dokumen tetap bisa dicetak dengan format bawaan.`, { danger: true, ok: 'Hapus' })) return;
  API.mutate({ label: 'Hapus template', apply: () => Store.remove('templates', t.id), rollback: o => Store.upsert('templates', o), run: () => API.call('deleteTemplate', { id: t.id }) });
};
function saveTpl(d) {
  const unm = (d.placeholders || []).filter(p => !(d.mapping || {})[p]);
  if (d.status === 'Aktif' && unm.length) { UI.toast('Penanda belum di-mapping: ' + unm.join(', '), 'err'); return false; }
  const id = d.id || UI.uid();
  const payload = { id, nama: d.nama, jenis: d.jenis, doc_url: d.doc_url, doc_id: d.doc_id, placeholders: d.placeholders, mapping: d.mapping, hash: d.hash, status: d.status, bidang: d.bidang };
  const existed = Store.byId('templates', id), nj = DC.normJenis(d.jenis);
  API.mutate({
    label: 'Simpan template', apply: () => { if (d.status === 'Aktif' && d.jenis !== 'CUSTOM') S.templates.filter(t => DC.normJenis(t.jenis) === nj && t.id !== id && t.status === 'Aktif').forEach(t => Store.upsert('templates', { id: t.id, status: 'Nonaktif' })); return Store.upsert('templates', { ...(existed || {}), ...payload, last_scan: new Date().toISOString() }); },
    rollback: o => existed ? Store.upsert('templates', o) : Store.remove('templates', id), run: () => API.call('saveTemplate', payload), onSuccess: r => { S.templates = r.data.templates; Store.upsertMany('templates', []); }
  });
  return true;
}
Act['tpl.save'] = el => {
  const d = ps('template').draft; d.status = el.dataset.st;
  const nm = document.getElementById('tp-nama'); if (nm) d.nama = nm.value.trim() || d.nama;
  if (!d.nama) { UI.toast('Isi nama template', 'err'); return; }
  if (saveTpl(d)) { ps('template').draft = null; tplRefresh(); }
};
Act['tpl.preview'] = () => {
  const d = ps('template').draft, j = DC.normJenis(d.jenis), id = sampleRef(j === 'CUSTOM' ? 'PO' : j);
  const c = id ? Doc.ctx(j === 'CUSTOM' ? 'PO' : j, id) : null;
  const val = p => {
    const k = d.mapping[p];
    if (k === 'manual') return '<i class="muted">(diisi manual saat generate)</i>';
    if (k === 'kosong') return '<i class="muted">(kosong)</i>';
    if (p.charAt(0) === '#' || p.indexOf('.') > 0 || k === 'baris') return '<i class="muted">(baris per item barang' + (c ? ': ' + (c.ROWS.ITEM || []).length + ' baris' : '') + ')</i>';
    if (DC.IMAGE_KEYS[p] || k === 'gambar') return '<i class="muted">(gambar)</i>';
    if (k && (k.indexOf('.') > 0)) return '<i class="muted">(kunci format lama — diisi server)</i>';
    if (!c) return '<span class="muted">— belum ada data contoh —</span>';
    const v = DC.value(c, p, d.mapping, {}).d;
    return v !== '' && v != null ? E(v) : '<span style="color:var(--danger)">— kosong pada data contoh —</span>';
  };
  UI.modal({ title: 'Contoh Nilai Penanda', sub: c ? 'Dari data terbaru: ' + E(c.D.NOMOR || '') : 'Belum ada data contoh', size: 'lg', body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Penanda</th><th>Nilai</th></tr></thead><tbody>${d.placeholders.map(p => `<tr><td class="mono small">${E(tok(p))}</td><td>${val(p)}</td></tr>`).join('')}</tbody></table></div>`, foot: '<button class="btn" data-close>Tutup</button>' });
};

/* =====================================================================
   LAPORAN & ANALITIK
   ===================================================================== */
Pages.laporan = {
  title: 'Laporan Pengadaan', roles: CAN.report, deps: ['po', 'poDetail', 'bast', 'bastDetail', 'invoice', 'vendors'],
  render(el) {
    const st = ps('laporan', { year: YEAR, per: '', kat: '', dana: '', vendor: '', q: '' });
    const years = [...new Set(S.po.map(p => Number(String(p.tanggal).slice(0, 4))).filter(Boolean).concat([YEAR, YEAR - 1, YEAR - 2]))].sort((a, b) => b - a);
    const inPer = d => { if (!inYear(d, st.year)) return false; if (!st.per) return true; const m = monthOf(d); return st.per.startsWith('q') ? Math.floor(m / 3) === Number(st.per.slice(1)) : m === Number(st.per.slice(1)); };
    const po = S.po.filter(p => ACTIVE_PO(p) && inPer(p.tanggal) && (!st.kat || p.kategori === st.kat) && (!st.dana || p.sumber_dana === st.dana) && (!st.vendor || p.vendor_id === st.vendor));
    const ids = new Set(po.map(p => p.id));
    const allPOinPer = S.po.filter(p => inPer(p.tanggal) && ids.has(p.id) || (p.status === 'Menunggu Approval' && inPer(p.tanggal) && (!st.vendor || p.vendor_id === st.vendor)));
    const total = po.filter(p => p.status !== 'Menunggu Approval').reduce((a, p) => a + p.total, 0);
    const inv = S.invoice.filter(i => ids.has(i.po_id) && i.status !== 'Ditolak');
    const paid = inv.filter(i => i.status === 'Dibayar').reduce((a, i) => a + i.netto, 0), invTot = inv.reduce((a, i) => a + i.netto, 0);
    const bast = S.bast.filter(b => ids.has(b.po_id) && b.status === 'Ditandatangani');
    const withKirim = bast.filter(b => (Store.po(b.po_id) || {}).tgl_kirim);
    const onTime = withKirim.filter(b => b.tanggal <= Store.po(b.po_id).tgl_kirim).length;
    const dev = withKirim.length ? withKirim.reduce((a, b) => a + Math.max(0, (UI.toDate(b.tanggal) - UI.toDate(Store.po(b.po_id).tgl_kirim)) / 86400000), 0) / withKirim.length : 0;
    let hemat = 0, hps = 0;
    S.poDetail.forEach(d => { if (!ids.has(d.po_id) || !d.barang_id) return; const b = Store.byId('barang', d.barang_id); if (b && b.harga_hps) { hps += b.harga_hps * d.qty; hemat += (b.harga_hps - d.harga) * d.qty; } });
    const series = UI.BLN.map((l, i) => ({ l, v: po.filter(p => p.status !== 'Menunggu Approval' && monthOf(p.tanggal) === i && inYear(p.tanggal, st.year)).reduce((a, p) => a + p.total, 0) }));
    const lastM = st.year === YEAR ? new Date().getMonth() : 11;
    const cnt = s => po.filter(p => s.includes(p.status)).length;
    const lengkap = cnt(['BAST Terbit', 'Selesai']), parsial = cnt(['BAST Parsial']), belum = cnt(['Disetujui PPK']);
    const telat = po.filter(p => p.status === 'Disetujui PPK' && p.tgl_kirim && UI.daysTo(p.tgl_kirim) < 0).length;
    const approvedN = lengkap + parsial + belum;
    const cats = [...new Set(S.po.map(p => p.kategori).filter(Boolean))], danas = [...new Set(S.po.map(p => p.sumber_dana).filter(Boolean))];
    const ppk = S.users.find(u => u.role === 'PPK'), pgd = S.users.find(u => u.role === 'PENGADAAN');
    const needArchive = st.year < (S.cutoffYear || 0) && !S.loadedYears[st.year];
    el.innerHTML = pageHead({
      eyebrow: `Laporan & Analitik Pengadaan // BLUD ${E(S.settings.RS_NAMA || '')} ● TA ${st.year}`, title: 'Laporan & Analitik Pengadaan BLUD',
      sub: 'Rekapitulasi realisasi belanja farmasi, alkes, reagen & logistik, kepatuhan BAST fisik vs PO, serta audit efisiensi anggaran pengadaan.',
      actions: `<button class="btn btn-outline" data-act="lap.print">${I('print')} Cetak Laporan / PDF</button><button class="btn btn-success" data-act="lap.export">${I('down')} Ekspor ke Excel (.XLSX)</button>`
    }) + `<div class="card filters" style="align-items:flex-end">
      ${[['Periode Waktu', 'calendar', `<select class="select" data-ch="lap.f" data-f="per">${UI.opt([{ v: '', l: 'Satu Tahun' }, { v: 'q0', l: 'Triwulan I (Jan–Mar)' }, { v: 'q1', l: 'Triwulan II (Apr–Jun)' }, { v: 'q2', l: 'Triwulan III (Jul–Sep)' }, { v: 'q3', l: 'Triwulan IV (Okt–Des)' }].concat(UI.BULAN.map((b, i) => ({ v: 'm' + i, l: b }))), st.per)}</select>`],
        ['Tahun', 'calendar', `<select class="select" data-ch="lap.f" data-f="year">${UI.opt(years, st.year)}</select>`], ['Kategori Belanja', 'tag', `<select class="select" data-ch="lap.f" data-f="kat">${UI.opt(cats, st.kat, 'Semua Kategori')}</select>`],
        ['Sumber Dana', 'wallet', `<select class="select" data-ch="lap.f" data-f="dana">${UI.opt(danas, st.dana, 'Semua Sumber Dana')}</select>`], ['Vendor / Rekanan', 'building', `<select class="select" data-ch="lap.f" data-f="vendor">${UI.opt(S.vendors.map(v => ({ v: v.id, l: v.nama })), st.vendor, 'Semua Vendor')}</select>`]]
        .map(([l, ic, s]) => `<div class="field" style="flex:1;min-width:150px"><label class="small">${I(ic, '')} ${l}</label>${s}</div>`).join('')}
      <button class="btn btn-ghost" data-act="lap.reset">Reset Filter</button></div>
      ${needArchive ? `<div class="info-box mt">${I('db')}<span style="flex:1">Data tahun ${st.year} berada di arsip server (tidak dimuat saat aplikasi dibuka agar tetap cepat).</span><button class="btn btn-sm" data-act="lap.archive">Muat Data ${st.year}</button></div>` : ''}
    <div class="grid g4 mt">
      ${kpi({ lbl: 'Total Realisasi Pengadaan', val: RP(total), ico: 'bank', foot: `<span class="small muted" style="flex:1">Terbayar ${RP(paid, 1)}</span><span class="chip st-green nodot">${invTot ? Math.round(paid / invTot * 100) : 0}% Lunas</span>`, bar: invTot ? paid / invTot * 100 : 0 })}
      ${kpi({ lbl: 'Total Paket PO', val: po.length + ' Paket PO', ico: 'box', foot: `<span class="small">● ${cnt(['Selesai'])} Selesai • ${cnt(['Disetujui PPK', 'BAST Parsial', 'BAST Terbit'])} Proses • <span style="color:var(--danger)">${cnt(['Menunggu Approval'])} Approval</span></span>`, bar: po.length ? cnt(['Selesai']) / po.length * 100 : 0 })}
      ${kpi({ lbl: 'Kepatuhan BAST vs PO', val: `<span style="color:var(--success-dark)">${withKirim.length ? (onTime / withKirim.length * 100).toFixed(1) : '100'}% Tepat Waktu</span>`, ico: 'shield', ic: 'g', foot: `<span class="small" style="flex:1">Deviasi: +${dev.toFixed(1)} hari</span><span class="chip ${dev > 7 ? 'st-red' : 'st-blue'} nodot">${dev > 7 ? 'Perlu Perhatian' : 'Audit Aman'}</span>`, bar: withKirim.length ? onTime / withKirim.length * 100 : 100 })}
      ${kpi({ lbl: 'Efisiensi vs HPS', val: RP(Math.max(0, hemat)), ico: 'trend', foot: `<span class="small muted" style="flex:1">Hemat thd HPS RSUD</span><span class="chip st-green nodot">${hps ? (hemat / hps * 100).toFixed(1) : 0}% Efisiensi</span>`, bar: hps ? Math.max(0, hemat / hps * 100) * 5 : 0 })}
    </div>
    <div class="grid g-3-2 mt"><div class="card"><div class="card-head"><div style="flex:1"><h3>Tren Belanja & Serapan Bulanan</h3><p>Realisasi PO disetujui per bulan (Jan – ${UI.BLN[lastM]} ${st.year})</p></div><span class="legend"><span><i style="background:#3d6a8c"></i>Realisasi</span></span></div>
      ${UI.barChart(series.slice(0, lastM + 1))}<div class="statline mt-s"><div><div class="k">Rata-rata realisasi bulanan</div><div class="v num">${RP(series.slice(0, lastM + 1).reduce((a, s) => a + s.v, 0) / (lastM + 1))} / bulan</div></div></div></div>
    <div class="card"><div class="card-head"><div style="flex:1"><h3>Analisis Kepatuhan & Status BAST vs PO</h3><p>Validasi verifikasi fisik logistik vs pesanan pembelian</p></div></div>
      <div class="row wrap" style="gap:20px">${UI.donut([{ v: lengkap, c: '#006d38', l: 'BAST Lengkap' }, { v: parsial, c: '#1B4F72', l: 'Parsial' }, { v: belum - telat, c: '#9dcbf4', l: 'Menunggu kiriman' }, { v: telat, c: '#BA1A1A', l: 'Terlambat' }], (approvedN ? Math.round(lengkap / approvedN * 1000) / 10 : 0) + '%', 'BAST Selesai')}
        <div style="flex:1;min-width:200px">${[['BAST Lengkap & Sesuai', lengkap, '#006d38'], ['Kirim Bertahap / Parsial', parsial, '#1B4F72'], ['Menunggu Pengiriman', Math.max(0, belum - telat), '#9dcbf4'], ['Keterlambatan Vendor', telat, '#BA1A1A']].map(([l, n, c]) => `<div class="row small" style="margin:8px 0"><span style="width:10px;height:10px;border-radius:50%;background:${c}"></span><span style="flex:1;${c === '#BA1A1A' ? 'color:var(--danger)' : ''}">${l}</span><b class="mono">${n}</b><span class="mono xs muted">(${approvedN ? (n / approvedN * 100).toFixed(1) : 0}%)</span></div>`).join('')}</div></div>
      ${telat ? `<div class="info-box mt" style="background:var(--danger-tint);color:var(--danger)">${I('alert')}<span>${telat} paket melewati target tanggal kirim — pertimbangkan denda keterlambatan sesuai ketentuan kontrak BLUD.</span></div>` : ''}</div></div>
    <div class="card pad-0 mt"><div class="filters" style="padding:16px"><div style="flex:1"><h3>Laporan Kinerja Pengadaan per Rekanan Vendor</h3><p class="small muted" style="margin:2px 0 0">Evaluasi realisasi kontrak, penerimaan fisik BAST, dan tingkat keterbayaran</p></div><div class="input-ic" style="max-width:280px">${I('search')}<input class="input tinted" placeholder="Cari rekanan, NPWP…" value="${E(st.q)}" data-in="lap.q"></div></div>
      <div id="lap-vendor">${vendorPerf(po, st)}</div></div>
    <div class="grid g2 mt"><div class="card"><div class="card-head"><div class="ic" style="background:#d6f5df;color:var(--success)">${I('swap')}</div><div style="flex:1"><h3>Sinkronisasi & Integritas Data</h3><p>Status: Terverifikasi real-time (GAS Endpoint)</p></div><span class="chip st-blue nodot">VMS v1.0</span></div>
      <div class="act-item mono xs"><div class="row"><span style="flex:1">Versi data server:</span><b>${E(S.version)}</b></div><div class="row mt-s"><span style="flex:1">Sinkronisasi terakhir:</span><b>${UI.ago(new Date(Number(S.version) || Date.now()).toISOString())}</b></div><div class="row mt-s"><span style="flex:1">Data dimuat:</span><b>${S.po.length} PO · ${S.bast.length} BAST · ${S.invoice.length} Invoice</b></div></div></div>
    <div class="card"><div class="card-head"><div class="ic">${I('shield')}</div><div style="flex:1"><h3>Pengesahan Pejabat Pengadaan & PPK</h3><p>Penanggung jawab laporan</p></div></div>
      <div class="grid g2" style="gap:12px">${[['Pejabat Pembuat Komitmen (PPK)', ppk || { nama: S.settings.PPK_NAMA, nip: S.settings.PPK_NIP }], ['Pejabat Pengadaan Barang/Jasa', pgd || { nama: S.settings.PENGADAAN_NAMA, nip: S.settings.PENGADAAN_NIP }]].map(([l, u]) => `<div class="act-item" style="margin:0"><div class="xs">${l}</div><b>${E(u.nama || '-')}</b><div class="mono xs muted">NIP. ${E(u.nip || '-')}</div></div>`).join('')}</div></div></div>`;
    el._lap = po;
  }
};
function vendorPerf(po, st) {
  const q = (st.q || '').toLowerCase();
  const rows = S.vendors.filter(v => !q || (v.nama + ' ' + v.npwp).toLowerCase().includes(q)).map(v => {
    const p = po.filter(x => x.vendor_id === v.id); if (!p.length) return null;
    const nilai = p.reduce((a, x) => a + x.total, 0);
    const appr = p.filter(x => x.status !== 'Menunggu Approval'), done = p.filter(x => ['BAST Terbit', 'Selesai'].includes(x.status));
    const bs = S.bast.filter(b => b.vendor_id === v.id && b.status === 'Ditandatangani' && p.some(x => x.id === b.po_id));
    const ot = bs.filter(b => { const x = Store.po(b.po_id); return !x.tgl_kirim || b.tanggal <= x.tgl_kirim; }).length;
    const kond = S.bastDetail.filter(d => bs.some(b => b.id === d.bast_id));
    const good = kond.length ? kond.filter(d => /baik|segel/i.test(d.kondisi)).length / kond.length : 1;
    const otp = bs.length ? ot / bs.length : 1;
    const inv = S.invoice.filter(i => i.vendor_id === v.id && p.some(x => x.id === i.po_id) && i.status !== 'Ditolak');
    const pay = inv.reduce((a, i) => a + i.netto, 0), paid = inv.filter(i => i.status === 'Dibayar').reduce((a, i) => a + i.netto, 0);
    const score = otp * .6 + good * .4;
    const mutu = score >= .95 ? ['Mutu A (Sangat Baik)', 'st-green'] : score >= .85 ? ['Mutu A', 'st-green'] : score >= .7 ? ['Mutu B (Baik)', 'st-blue'] : ['Mutu C (Peringatan)', 'st-red'];
    return { v, n: p.length, nilai, done: done.length, appr: appr.length, otp, mutu, score, payPct: pay ? paid / pay : 0, pay };
  }).filter(Boolean).sort((a, b) => b.nilai - a.nilai);
  const T = rows.reduce((a, r) => ({ n: a.n + r.n, nilai: a.nilai + r.nilai, done: a.done + r.done, appr: a.appr + r.appr }), { n: 0, nilai: 0, done: 0, appr: 0 });
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama Rekanan & Kategori</th><th class="num">Total PO</th><th class="num">Nilai Kontrak</th><th>Realisasi BAST</th><th class="num">On-Time Delivery</th><th>Skor Mutu</th><th>Status Bayar SP2D</th></tr></thead><tbody>
  ${rows.map(r => `<tr><td>${vendorCell(r.v, `<span class="mono xs">NPWP: ${E(r.v.npwp)}</span> · ${E(r.v.kategori || '')}`)}</td><td class="num">${r.n} PO</td><td class="num">${RP(r.nilai)}</td><td><span class="chip st-blue nodot">${r.done} / ${r.appr} Selesai</span></td><td class="num" style="color:${r.otp < .9 ? 'var(--danger)' : 'var(--success-dark)'}">${Math.round(r.otp * 100)}%</td><td><span class="chip ${r.mutu[1]} nodot">${r.mutu[0]}</span></td><td style="min-width:130px"><div class="mono xs">${Math.round(r.payPct * 100)}% Terbayar</div><div class="prog-bar"><i class="${r.payPct >= .8 ? 'g' : r.payPct < .5 ? 'o' : ''}" style="width:${r.payPct * 100}%"></i></div></td></tr>`).join('') || `<tr><td colspan="7">${UI.empty('Tidak ada transaksi pada filter ini', 'chart')}</td></tr>`}
  </tbody>${rows.length ? `<tfoot><tr><td style="font-family:var(--serif);font-size:16px;color:var(--primary-deep)">TOTAL KESELURUHAN (${rows.length} REKANAN)</td><td class="num">${T.n} Paket</td><td class="num">${RP(T.nilai)}</td><td class="mono">${T.done} Selesai</td><td class="num">${rows.length ? Math.round(rows.reduce((a, r) => a + r.otp, 0) / rows.length * 100) : 0}% rata-rata</td><td class="mono xs">Indeks: ${(rows.reduce((a, r) => a + r.score, 0) / rows.length * 4).toFixed(2)} / 4.00</td><td></td></tr></tfoot>` : ''}</table></div>`;
}
Act['lap.f'] = el => { const s = ps('laporan'); s[el.dataset.f] = el.dataset.f === 'year' ? Number(el.value) : el.value; App.refreshCurrent(); };
Act['lap.reset'] = () => { PS.laporan = null; App.refreshCurrent(); };
Act['lap.q'] = UI.debounce(el => { const s = ps('laporan'); s.q = el.value; const box = document.getElementById('lap-vendor'); const sec = el.closest('section'); if (box && sec) box.innerHTML = vendorPerf(sec._lap || [], s); }, 150);
Act['lap.print'] = () => window.print();
Act['lap.archive'] = async el => {
  const y = ps('laporan').year; UI.busy(el, true);
  try { const r = await API.call('loadYear', { year: y }); Store.mergeYear(r.data, y); UI.toast('Data arsip ' + y + ' dimuat', 'ok'); } catch (e) { UI.toast(e.message, 'err'); UI.busy(el, false); }
};
Act['lap.export'] = () => {
  const sec = document.querySelector('section:not(.hidden)'); const po = (sec && sec._lap) || [];
  const st = ps('laporan');
  const perVendor = S.vendors.map(v => { const p = po.filter(x => x.vendor_id === v.id); return p.length ? { Vendor: v.nama, NPWP: v.npwp, Kategori: v.kategori, 'Jumlah PO': p.length, 'Nilai PO (Rp)': p.reduce((a, x) => a + x.total, 0), 'PO Selesai': p.filter(x => x.status === 'Selesai').length } : null; }).filter(Boolean);
  const perBulan = UI.BULAN.map((b, i) => { const p = po.filter(x => monthOf(x.tanggal) === i); return { Bulan: b + ' ' + st.year, 'Jumlah PO': p.length, 'Nilai (Rp)': p.reduce((a, x) => a + x.total, 0) }; });
  const bastVsPo = po.flatMap(p => Store.poItems(p.id).map(d => { const got = S.bastDetail.filter(x => x.po_detail_id === d.id && (Store.byId('bast', x.bast_id) || {}).status === 'Ditandatangani').reduce((a, x) => a + x.qty_diterima, 0); return { 'Nomor PO': p.nomor_po, Vendor: vName(p.vendor_id), Item: d.nama, 'Qty PO': d.qty, 'Qty Diterima': got, 'Belum Diterima': Math.max(0, d.qty - got), Satuan: d.satuan, 'Status PO': p.status }; }));
  UI.exportExcel('Laporan_Pengadaan_' + st.year + (st.per ? '_' + st.per : ''), { 'PO per Vendor': perVendor, 'Per Periode': perBulan, 'BAST vs PO': bastVsPo, 'Detail PO': po.map(poRow), 'Invoice': S.invoice.filter(i => po.some(p => p.id === i.po_id)).map(i => ({ 'No Invoice': i.nomor_invoice, Vendor: vName(i.vendor_id), Netto: i.netto, Status: i.status, SP2D: i.no_sp2d })) });
};

/* =====================================================================
   PENGATURAN SISTEM (ADMIN)
   ===================================================================== */
const SET_TABS = [{ id: 'users', l: 'Pengguna & Role' }, { id: 'app', l: 'Pengaturan Aplikasi' }, { id: 'dokumen', l: 'Dokumen & TTD' }, { id: 'backup', l: 'Backup & Restore' }, { id: 'migrasi', l: 'Migrasi Data' }, { id: 'log', l: 'Log Aktivitas' }, { id: 'sistem', l: 'Sistem & Performa' }];
const MIG_SHEETS = ['Users', 'Vendor', 'Barang_Jasa', 'Penerima', 'PO', 'PO_Detail', 'BAST', 'BAST_Detail', 'Invoice', 'Template_Dokumen', 'CRM_Kontak', 'Log_Aktivitas'];
Pages.pengaturan = {
  title: 'Pengaturan Sistem', roles: ['ADMIN'], deps: ['users', 'vendors', 'penerima'],
  render(el, param) {
    const st = ps('pengaturan', { tab: 'users', mig: { sheets: MIG_SHEETS.filter(s => s !== 'Log_Aktivitas'), overwrite: false, src: '' } });
    if (param && SET_TABS.some(t => t.id === param)) st.tab = param;
    el.innerHTML = pageHead({ eyebrow: `<span class="tag navy">Administrasi Sistem</span> • VMS ${E(S.settings.RS_NAMA || '')}`, title: 'Pengaturan Sistem', sub: 'Manajemen pengguna & role, konfigurasi aplikasi, backup/restore database, migrasi data, dan audit trail.' }) +
      tabsBar('set.tab', SET_TABS, st.tab) + `<div id="set-body">${setBody(st)}</div>`;
    if (st.tab === 'backup') loadBackups(); if (st.tab === 'log') loadLogs(); if (st.tab === 'sistem') sysPing(); if (st.tab === 'dokumen') loadLogoPrev();
  }
};
function setBody(st) {
  if (st.tab === 'users') {
    const q = (st.uq || '').toLowerCase();
    const list = S.users.filter(u => !q || (u.nama + ' ' + u.email + ' ' + u.role).toLowerCase().includes(q)).sort((a, b) => a.role.localeCompare(b.role) || a.nama.localeCompare(b.nama));
    return `<div class="card pad-0"><div class="filters" style="padding:14px 16px"><div class="input-ic">${I('search')}<input class="input tinted" placeholder="Cari nama, email, role" value="${E(st.uq || '')}" data-in="usr.q"></div><button class="btn" data-act="usr.edit">${I('plus')} Tambah Pengguna</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Vendor Terkait</th><th>Login Terakhir</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map(u => `<tr><td><b>${E(u.nama)}</b><div class="sub">${E(u.jabatan || '')}${u.nip ? ' · NIP ' + E(u.nip) : ''}</div></td><td class="mono small">${E(u.email)}</td><td><span class="chip ${u.role === 'ADMIN' ? 'st-red' : u.role === 'PPK' ? 'st-green' : u.role === 'VENDOR' ? 'st-gray' : 'st-blue'} nodot">${E(ROLE_LABEL[u.role] || u.role)}</span></td><td class="small">${E(u.vendor_id ? vName(u.vendor_id) : '-')}</td><td class="small muted">${u.last_login ? UI.ago(u.last_login) : 'Belum pernah'}</td><td>${CHIP(u.status)}${String(u.must_change) === '1' ? '<div class="xs muted">wajib ganti password</div>' : ''}</td>
      <td class="row" style="gap:2px"><button class="icon-btn" data-act="usr.edit" data-id="${u.id}" title="Edit">${I('edit')}</button><button class="icon-btn" data-act="usr.reset" data-id="${u.id}" title="Reset password">${I('key')}</button></td></tr>`).join('')}</tbody></table></div></div>
      <div class="card mt"><h3>Matriks Hak Akses (RBAC)</h3><p class="small muted">Diberlakukan di server (Apps Script) — bukan hanya di tampilan.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Modul</th><th>Admin</th><th>PPK</th><th>Pejabat Pengadaan</th><th>PPTK</th><th>Vendor</th></tr></thead><tbody>
      ${[['Kelola Data Vendor', 'CRUD', 'Lihat', 'CRUD', 'Lihat', 'Profil sendiri'], ['Buat/Edit PO', 'CRUD', 'Lihat', 'CRUD', 'Lihat', 'PO miliknya'], ['Approval PO', '—', 'Setujui/Tolak', '—', '—', '—'], ['Input BAPB (Penerimaan)', 'CRUD', 'Lihat', 'Lihat', 'CRUD', 'BAPB miliknya'], ['WhatsApp & CRM', 'Penuh', 'CRM (lihat)', 'Penuh', '—', '—'], ['Invoice & Pembayaran', 'Buat & Bayar', 'Setujui & Bayar', 'Buat', 'Lihat', 'Status'], ['Kelola Template', 'CRUD', '—', '—', '—', '—'], ['Laporan & Ekspor', 'Penuh', 'Lihat', 'Lihat', 'Lihat', '—'], ['Pengguna, Backup, Migrasi', 'Penuh', '—', '—', '—', '—']].map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'small' : ''}">${i && c === '—' ? '<span class="muted">—</span>' : E(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }
  if (st.tab === 'app') {
    const s = S.settings;
    const f = (k, l, h, o = {}) => `<div class="field ${o.full ? 'full' : ''}"><label>${l}</label><input class="input ${o.mono ? 'mono' : ''}" name="${k}" value="${E(s[k] || '')}" ${o.type ? `type="${o.type}"` : ''}>${h ? `<span class="help">${h}</span>` : ''}</div>`;
    return `<form id="setf" class="grid g2"><div class="card"><div class="card-head"><div class="ic">${I('building')}</div><h3>Identitas Instansi (kop dokumen)</h3></div><div class="form-grid">${f('RS_NAMA', 'Nama Singkat RS', '')}${f('RS_NAMA_LENGKAP', 'Nama Lengkap RS', '')}${f('PEMDA', 'Pemerintah Daerah', '', { full: 1 })}${f('RS_ALAMAT', 'Alamat', '', { full: 1 })}${f('PPK_NAMA', 'Nama PPK', 'Dipakai di dokumen jika akun PPK tidak ada')}${f('PPK_NIP', 'NIP PPK', '', { mono: 1 })}${f('PENGADAAN_NAMA', 'Nama Pejabat Pengadaan', '')}${f('PENGADAAN_NIP', 'NIP Pejabat Pengadaan', '', { mono: 1 })}</div></div>
      <div class="stack"><div class="card"><div class="card-head"><div class="ic">${I('money')}</div><h3>Pajak & Aturan Transaksi</h3></div><div class="form-grid">${f('PPN_RATE', 'Tarif PPN (%)', 'Berlaku untuk PO & invoice baru', { mono: 1 })}${f('PPH22_RATE', 'Tarif PPh 22 (%)', '', { mono: 1 })}${f('MIN_FOTO_BAST', 'Minimal foto BAPB', 'Wajib saat BAPB disahkan', { mono: 1 })}${f('SESSION_HOURS', 'Lama sesi login (jam)', '', { mono: 1 })}</div></div>
      <div class="card"><div class="card-head"><div class="ic">${I('mail')}</div><h3>Notifikasi, Performa & Backup</h3></div><div class="form-grid">${f('NOTIF_EMAIL', 'Email notifikasi (1=aktif, 0=mati)', 'WhatsApp diatur di menu WhatsApp & Notifikasi', { mono: 1 })}${f('APP_URL', 'URL aplikasi (GitHub Pages)', 'Tautan pada email notifikasi')}${f('BOOT_TAHUN', 'Tahun lalu yang dimuat', 'Data lebih lama dimuat saat diminta (menjaga kecepatan)', { mono: 1 })}${f('BACKUP_KEEP', 'Jumlah backup disimpan', '', { mono: 1 })}${f('BACKUP_JAM', 'Jam backup harian (WIB)', 'Pasang ulang trigger setelah mengubah', { mono: 1 })}</div></div></div></form>
      <div class="sticky-bar"><span class="small muted">Perubahan berlaku untuk seluruh pengguna setelah disimpan.</span><span class="spacer"></span><button class="btn" data-act="set.save">${I('check')} Simpan Pengaturan</button></div>`;
  }
  if (st.tab === 'dokumen') return setDokumen();
  if (st.tab === 'backup') return `<div class="grid g3"><div class="card"><div class="card-head"><div class="ic" style="background:#d6f5df;color:var(--success)">${I('db')}</div><div style="flex:1"><h3>Backup Sekarang</h3><p>Salinan penuh spreadsheet database ke folder Backup_Database di Drive</p></div></div><button class="btn btn-success" style="width:100%" data-act="bk.now">${I('db')} Buat Backup</button><div class="small muted mt-s" id="bk-last"></div></div>
      <div class="card"><div class="card-head"><div class="ic">${I('clock')}</div><div style="flex:1"><h3>Backup Otomatis</h3><p>Harian pukul ${E(S.settings.BACKUP_JAM || 1)}:00 WIB, menyimpan ${E(S.settings.BACKUP_KEEP || 30)} salinan terakhir</p></div></div><button class="btn btn-outline" style="width:100%" data-act="bk.trig">${I('refresh')} Pasang Ulang Trigger Otomatis</button><div class="xs muted mt-s">Trigger: backup harian, email notifikasi (1 mnt), warmup cache (10 mnt), housekeeping, invalidasi cache saat sheet diedit manual.</div></div>
      <div class="card"><div class="card-head"><div class="ic">${I('down')}</div><div style="flex:1"><h3>Export JSON</h3><p>Seluruh tabel dalam satu file portabel (tanpa hash password)</p></div></div><button class="btn btn-outline" style="width:100%" data-act="bk.json">${I('down')} Unduh Export JSON</button></div></div>
      <div class="card pad-0 mt"><div class="row" style="padding:16px"><h3 style="flex:1">Riwayat Backup di Google Drive</h3><button class="btn btn-ghost btn-sm" data-act="bk.list">${I('refresh')} Muat ulang</button></div><div id="bk-list"><div class="skel" style="height:120px;margin:0 16px 16px"></div></div></div>
      <div class="info-box mt">${I('info')}<span><b>Restore</b> mengganti isi sheet terpilih dengan isi backup. Sistem otomatis membuat backup <i>pre-restore</i> terlebih dahulu sehingga restore dapat dibatalkan dengan me-restore backup tersebut.</span></div>`;
  if (st.tab === 'migrasi') {
    const m = st.mig;
    return `<div class="grid g-3-2"><div class="card"><div class="card-head"><div class="ic">${I('swap')}</div><div style="flex:1"><h3>Import dari Aplikasi / Spreadsheet Lama</h3><p>Sumber hanya DIBACA — app lama tidak diubah sama sekali</p></div></div>
      <div class="field"><label>URL / ID Spreadsheet sumber <span class="hint">milik akun yang sama dengan script</span></label><input class="input mono" id="mg-src" value="${E(m.src)}" placeholder="https://docs.google.com/spreadsheets/d/…/edit" data-in="mg.src"></div>
      <div class="mono xs mt" style="letter-spacing:.06em">SHEET YANG DIIMPOR (berurutan: master → relasi)</div>
      <div class="grid g3 mt-s" style="gap:6px">${MIG_SHEETS.map(s => `<label class="check small"><input type="checkbox" data-ch="mg.sheet" value="${s}" ${m.sheets.includes(s) ? 'checked' : ''}>${s}</label>`).join('')}</div>
      <label class="check act-item mt"><input type="checkbox" data-ch="mg.ow" ${m.overwrite ? 'checked' : ''}><span class="small"><b>Timpa data yang sudah ada</b><br>Default mati: data yang sudah ada hanya diperbarui status/field penting (keputusan di app baru tidak ditimpa).</span></label>
      <div class="row mt"><button class="btn btn-outline" data-act="mg.scan">${I('scan')} Pindai (Dry-run)</button><span class="spacer"></span><button class="btn" data-act="mg.run">${I('swap')} Jalankan Import</button></div>
      <div id="mg-res" class="mt"></div></div>
      <div class="stack"><div class="card"><h3>Prinsip Migrasi Aman</h3>${[['Idempoten', 'Upsert berdasar kunci alami (email, NPWP, nomor SP/BAPB/invoice). Import 2× = tanpa data dobel.'], ['Baca per nama header', 'Urutan & nama kolom boleh berbeda (alias otomatis: "Nama Perusahaan" → nama, "No HP" → telepon).'], ['Remap relasi', 'ID vendor/PO lama dipetakan ke ID baru bila berbeda.'], ['Aman untuk angka 0', 'Nomor telepon/NIP dinormalisasi agar angka 0 di depan tidak hilang.'], ['Auto-backup', 'Backup pre-import dibuat otomatis sebelum import nyata.']].map(([a, b]) => `<div class="act-item"><b class="small">${a}</b><div class="xs muted">${b}</div></div>`).join('')}</div>
      <div class="card"><h3>Checklist Cutover</h3><ol class="small" style="padding-left:18px;line-height:24px;margin:8px 0 0"><li>Pindai (dry-run) → periksa angka & peringatan</li><li>Jalankan Import → cek vendor, PO, dan akun</li><li>Uji login dengan 1 akun tiap role</li><li>Tepat sebelum pindah: <b>Jalankan Import sekali lagi</b> (delta sync)</li><li>Umumkan alamat baru, arsipkan deployment lama</li></ol><p class="xs muted">Sesi login lama tidak ikut pindah — pengguna cukup login ulang. Akun ADMIN lama tidak diimpor.</p></div>
      <div class="card"><h3>Import CSV Cepat</h3><p class="small muted">Untuk data dari luar (Excel/marketplace).</p><div class="row"><button class="btn btn-soft btn-sm" data-act="vendor.importcsv">Rekanan (CSV)</button><button class="btn btn-soft btn-sm" data-act="brg.import">Master Barang (CSV)</button></div></div></div></div>`;
  }
  if (st.tab === 'log') return `<div class="card pad-0"><div class="filters" style="padding:14px 16px"><div class="input-ic">${I('search')}<input class="input tinted" id="log-q" placeholder="Cari aksi, email, nomor dokumen…" value="${E(st.lq || '')}"></div><button class="btn btn-soft" data-act="log.load">${I('refresh')} Muat</button><button class="btn btn-soft" data-act="log.export">${I('excel')} Ekspor</button></div><div id="log-body"><div class="skel" style="height:200px;margin:0 16px 16px"></div></div></div>`;
  if (st.tab === 'sistem') return `<div class="grid g2"><div class="card"><div class="card-head"><div class="ic">${I('trend')}</div><h3>Kesehatan & Performa</h3></div><div id="sys-ping" class="stack"><div class="skel" style="height:80px"></div></div>
      <div class="info-box mt">${I('info')}<span>Arsitektur instan: SPA (navigasi 0 ms) · optimistic UI + antrean sinkron · cache lokal (buka ulang instan) · CacheService server (write-through) · batch read/write Sheets · polling versi ringan tiap ${Math.round((window.VMS_CONFIG.POLL_MS || 45000) / 1000)} dtk.</span></div></div>
    <div class="card"><div class="card-head"><div class="ic">${I('gear')}</div><h3>Pemeliharaan</h3></div><div class="stack"><div class="row"><div style="flex:1"><b class="small">Bersihkan cache server</b><div class="xs muted">Gunakan setelah mengedit Google Sheets secara manual</div></div><button class="btn btn-outline btn-sm" data-act="sys.cache">Bersihkan</button></div>
      <div class="row"><div style="flex:1"><b class="small">Muat ulang seluruh data</b><div class="xs muted">Ambil data terbaru dari server</div></div><button class="btn btn-outline btn-sm" data-act="me.refresh">Muat ulang</button></div>
      <div class="row"><div style="flex:1"><b class="small">Hapus cache perangkat ini</b><div class="xs muted">Menghapus data lokal browser lalu keluar</div></div><button class="btn btn-outline-danger btn-sm" data-act="sys.local">Hapus & keluar</button></div></div>
      <div class="act-item mono xs mt"><div>Frontend: ${E(location.origin + location.pathname)}</div><div style="word-break:break-all">Backend: ${E(window.VMS_CONFIG.GAS_URL)}</div></div></div></div>`;
  return '';
}
const setRefresh = () => { const b = document.getElementById('set-body'); if (b) b.innerHTML = setBody(ps('pengaturan')); };
Act['set.tab'] = el => { ps('pengaturan').tab = el.dataset.v; App.clearParam('pengaturan'); App.refreshCurrent(); };
Act['usr.q'] = UI.debounce(el => { ps('pengaturan').uq = el.value; setRefresh(); const i = document.querySelector('[data-in="usr.q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200);
Act['usr.edit'] = el => {
  const u = el.dataset.id ? Store.byId('users', el.dataset.id) : { id: UI.uid(), role: 'PENGADAAN', status: 'Aktif' };
  const m = UI.modal({ title: el.dataset.id ? 'Edit Pengguna' : 'Tambah Pengguna', size: 'lg', body: `<form class="form-grid" id="uf"><div class="field"><label>Nama Lengkap <span class="req">*</span></label><input class="input" name="nama" value="${E(u.nama || '')}"></div><div class="field"><label>Email <span class="req">*</span></label><input class="input" name="email" type="email" value="${E(u.email || '')}"></div>
    <div class="field"><label>Role</label><select class="select" name="role" id="uf-role">${UI.opt(Object.keys(ROLE_LABEL).map(r => ({ v: r, l: ROLE_LABEL[r] })), u.role)}</select></div><div class="field" id="uf-vwrap"><label>Vendor terkait</label><select class="select" name="vendor_id">${UI.opt(S.vendors.map(v => ({ v: v.id, l: v.nama })), u.vendor_id, 'Pilih vendor')}</select></div>
    <div class="field"><label>NIP</label><input class="input mono" name="nip" value="${E(u.nip || '')}"></div><div class="field"><label>Jabatan</label><input class="input" name="jabatan" value="${E(u.jabatan || '')}"></div><div class="field"><label>Telepon</label><input class="input mono" name="telepon" value="${E(u.telepon || '')}"></div><div class="field"><label>Status</label><select class="select" name="status">${UI.opt(['Aktif', 'Nonaktif'], u.status)}</select></div></form>${el.dataset.id ? '' : '<p class="small muted mt">Password sementara dibuat otomatis dan dikirim ke email pengguna.</p>'}`, foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn" id="uok">Simpan</button>` });
  const tog = () => m.q('#uf-vwrap').style.visibility = m.q('#uf-role').value === 'VENDOR' ? 'visible' : 'hidden'; m.q('#uf-role').onchange = tog; tog();
  m.q('#uok').onclick = async () => {
    const x = UI.formData(m.q('#uf')); if (!x.nama || !x.email) { UI.toast('Nama & email wajib', 'err'); return; }
    UI.busy(m.q('#uok'), true);
    try { const r = await API.call('saveUser', { ...u, ...x }); Store.upsert('users', r.data.user); m.close(); if (r.data.password) showPass(r.data.user.email, r.data.password); else UI.toast('Pengguna disimpan', 'ok'); }
    catch (e) { UI.toast(e.message, 'err'); UI.busy(m.q('#uok'), false); }
  };
};
function showPass(email, pass) { UI.modal({ title: 'Password sementara', body: `<div class="act-item"><div class="mono small">Email: <b>${E(email)}</b></div><div class="mono small">Password: <b>${E(pass)}</b></div></div><p class="small muted">Pengguna wajib mengganti password saat login pertama. Informasi ini juga dikirim ke email pengguna.</p>`, foot: '<button class="btn" data-close>Tutup</button>' }); }
Act['usr.reset'] = async el => {
  const u = Store.byId('users', el.dataset.id);
  if (!await UI.confirm('Reset password?', `Password <b>${E(u.email)}</b> akan diganti password sementara baru. Sesi aktif pengguna akan berakhir.`, { ok: 'Reset' })) return;
  try { const r = await API.call('resetPassword', { id: u.id }); Store.upsert('users', { id: u.id, must_change: '1' }); showPass(r.data.email, r.data.password); } catch (e) { UI.toast(e.message, 'err'); }
};
Act['set.save'] = el => {
  const x = UI.formData(document.getElementById('setf'));
  const old = { ...S.settings };
  API.mutate({ label: 'Simpan pengaturan', apply: () => { Object.assign(S.settings, x); Store.persist(); App.renderTopbar(); }, rollback: () => { S.settings = old; }, run: () => API.call('saveSettings', x), onSuccess: r => { S.settings = r.data; Store.persist(); } });
};
/* ---------- Tab "Dokumen & TTD": kop, format nomor, mode TTD, master penerima, spesimen pejabat ---------- */
const ROMAWI_FMT = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function fmtNomorPreview(fmt, n = 7) {
  const d = new Date(), y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0');
  return String(fmt || '').replace(/\{URUT4\}/g, String(n).padStart(4, '0')).replace(/\{URUT3\}/g, String(n).padStart(3, '0')).replace(/\{URUT\}/g, n).replace(/\{TAHUN\}/g, y).replace(/\{BULAN_ROMAWI\}/g, ROMAWI_FMT[d.getMonth()]).replace(/\{BULAN\}/g, m);
}
function setDokumen() {
  const s = S.settings;
  const f = (k, l, h, o = {}) => `<div class="field ${o.full ? 'full' : ''}"><label>${l}</label><input class="input ${o.mono ? 'mono' : ''}" name="${k}" value="${E(s[k] || '')}" ${o.fmt ? 'data-in="set.fmt"' : ''}>${h ? `<span class="help" ${o.fmt ? `id="fp-${k}"` : ''}>${h}</span>` : ''}</div>`;
  const sel = (k, l, opts, h) => `<div class="field"><label>${l}</label><select class="select" name="${k}">${UI.opt(opts, s[k] || opts[0].v)}</select>${h ? `<span class="help">${h}</span>` : ''}</div>`;
  const pj = (S.penerima || []).slice().sort((a, b) => (a.ruangan || '').localeCompare(b.ruangan || '') || a.nama.localeCompare(b.nama));
  const pejabat = S.users.filter(u => ['PPK', 'PPTK', 'PENGADAAN', 'ADMIN'].includes(u.role) && u.status !== 'Nonaktif').sort((a, b) => a.role.localeCompare(b.role));
  return `<form id="setf" class="grid g2">
    <div class="card"><div class="card-head"><div class="ic">${I('building')}</div><div style="flex:1"><h3>Kop Dokumen</h3><p>Dipakai SP, BAPB, BAST Hasil Pekerjaan & Invoice</p></div></div>
      <div class="row wrap mb" style="gap:14px;align-items:center"><div class="logo-box" id="logo-prev"><img src="${E(DEFAULT_LOGO())}" alt="Logo"></div><div class="stack" style="gap:6px"><b class="small">Logo kop</b><span class="xs muted">PNG/JPG, latar transparan disarankan</span><div class="row wrap" style="gap:6px"><label class="btn btn-outline btn-sm">${I('upload')} Ganti logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-ch="set.logo"></label>${s.LOGO_FILE_ID ? `<button type="button" class="btn btn-ghost btn-sm" data-act="set.logodel">Pakai logo bawaan</button>` : ''}</div></div></div>
      <div class="form-grid">${f('KOP_INSTANSI', 'Kop baris 1', '', { full: 1 })}${f('KOP_JUDUL', 'Kop baris 2', '', { full: 1 })}${f('KOP_NAMA', 'Kop baris 3 (nama RS)', '', { full: 1 })}${f('KOP_ALAMAT', 'Alamat', '', { full: 1 })}${f('KOP_KONTAK', 'Telepon / Fax', '', { full: 1 })}${f('KOP_LAMAN', 'Laman & Pos-el', '', { full: 1 })}${f('RS_NAMA_DOK', 'Nama RS di badan dokumen', '')}${f('RS_KOTA', 'Kota penandatanganan', '')}</div></div>
    <div class="stack">
      <div class="card"><div class="card-head"><div class="ic">${I('pen')}</div><div style="flex:1"><h3>Tanda Tangan & Kertas</h3><p>Ganti teks "VALIDATED/DISETUJUI" dengan TTD gambar atau kosong untuk TTD basah</p></div></div>
        <div class="form-grid">${sel('TTD_MODE', 'Mode tanda tangan', [{ v: 'gambar', l: 'TTD gambar (PNG spesimen) otomatis' }, { v: 'basah', l: 'Dikosongkan — TTD basah setelah cetak' }], 'Tetap bisa diubah per dokumen saat mencetak')}${sel('KERTAS', 'Ukuran kertas', [{ v: 'F4', l: 'F4 / Folio (215 × 330 mm)' }, { v: 'A4', l: 'A4 (210 × 297 mm)' }])}</div></div>
      <div class="card"><div class="card-head"><div class="ic">${I('braces')}</div><div style="flex:1"><h3>Format Penomoran</h3><p>Token: <span class="code-pill">{URUT}</span> <span class="code-pill">{URUT4}</span> <span class="code-pill">{TAHUN}</span> <span class="code-pill">{BULAN}</span> <span class="code-pill">{BULAN_ROMAWI}</span></p></div></div>
        <div class="form-grid">${[['FMT_NOMOR_PO', 'Nomor Surat Pesanan'], ['FMT_NOMOR_BAPB', 'Nomor BAPB'], ['FMT_NOMOR_BASTP', 'Nomor BAST Hasil Pekerjaan'], ['FMT_NOMOR_INV', 'Nomor Invoice']].map(([k, l]) => f(k, l, 'Contoh: ' + E(fmtNomorPreview(s[k])), { full: 1, mono: 1, fmt: 1 })).join('')}</div></div>
      <div class="card"><div class="card-head"><div class="ic">${I('file')}</div><h3>Isian Bawaan Surat Pesanan</h3></div>
        <div class="form-grid">${f('DEFAULT_KEGIATAN', 'Kegiatan', '', { full: 1 })}${f('DEFAULT_SUB_KEGIATAN', 'Sub kegiatan', '', { full: 1 })}${f('DEFAULT_WAKTU', 'Waktu penyelesaian (hari)', '', { mono: 1 })}</div></div>
    </div></form>
    <div class="grid g2 mt">
      <div class="card pad-0"><div class="row wrap" style="padding:14px 16px;gap:8px"><div style="flex:1;min-width:200px"><h3>Penanggung Jawab Ruangan / Penerima</h3><p class="small muted" style="margin:2px 0 0">Penanda tangan BAPB. Simpan spesimen TTD agar terisi otomatis.</p></div><button class="btn btn-sm" data-act="pj.edit">${I('plus')} Tambah</button></div>
        <div class="tbl-wrap"><table class="tbl tbl-cards"><thead><tr><th>Nama / NIP</th><th>Ruangan</th><th>TTD</th><th></th></tr></thead><tbody>
        ${pj.map(x => `<tr><td data-l="Nama"><b class="small">${E(x.nama)}</b><div class="sub mono">${E(x.nip || '')}</div><div class="sub">${E(x.jabatan || '')}</div></td><td class="small" data-l="Ruangan">${E(x.ruangan || '-')}${x.status === 'Nonaktif' ? ' <span class="chip st-gray nodot">Nonaktif</span>' : ''}</td><td data-l="TTD">${x.ttd_file_id ? '<span class="chip st-green nodot">Ada</span>' : '<span class="chip st-gray nodot">Belum</span>'}</td><td class="row" style="gap:2px"><button class="icon-btn" data-act="pj.edit" data-id="${x.id}" title="Edit">${I('edit')}</button>${can('admin') ? `<button class="icon-btn" data-act="pj.del" data-id="${x.id}" title="Hapus">${I('trash')}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="4">${UI.empty('Belum ada data. Penerima baru juga bisa ditambahkan langsung dari form BAPB.', 'user')}</td></tr>`}</tbody></table></div></div>
      <div class="card pad-0"><div style="padding:14px 16px"><h3>Spesimen TTD Pejabat</h3><p class="small muted" style="margin:2px 0 0">PPK (SP, BASTP, Invoice) dan PPTK (Mengetahui BAPB). Pejabat juga bisa mengunggah sendiri lewat menu profil → "TTD Saya".</p></div>
        <div class="tbl-wrap"><table class="tbl tbl-cards"><thead><tr><th>Pejabat</th><th>Role</th><th>TTD</th><th></th></tr></thead><tbody>
        ${pejabat.map(u => `<tr><td data-l="Nama"><b class="small">${E(u.nama)}</b><div class="sub mono">${E(u.nip || '')}</div></td><td data-l="Role"><span class="chip nodot">${E(ROLE_LABEL[u.role] || u.role)}</span></td><td data-l="TTD">${u.ttd_file_id ? '<span class="chip st-green nodot">Ada</span>' : '<span class="chip st-gray nodot">Belum</span>'}</td><td><button class="btn btn-outline btn-xs" data-act="usr.ttd" data-id="${u.id}">${I('pen')} Atur</button></td></tr>`).join('')}</tbody></table></div></div>
    </div>
    <div class="sticky-bar"><span class="small muted hide-sm">Berlaku untuk semua dokumen yang dicetak setelah disimpan.</span><span class="spacer"></span><button class="btn btn-outline" data-act="go" data-href="template">${I('doc')} Kelola Template</button><button class="btn" data-act="set.save">${I('check')} Simpan Pengaturan</button></div>`;
}
function loadLogoPrev() {
  const id = S.settings.LOGO_FILE_ID, box = document.getElementById('logo-prev'); if (!id || !box) return;
  DocImg.load([id]).then(m => { if (m[id] && document.body.contains(box)) box.innerHTML = `<img src="${m[id]}" alt="Logo">`; });
}
Act['set.fmt'] = el => { const h = document.getElementById('fp-' + el.name); if (h) h.textContent = 'Contoh: ' + fmtNomorPreview(el.value); };
Act['set.logo'] = async el => {
  const f = el.files[0]; if (!f) return;
  try {
    const c = await UI.compressImage(f, 600, .92);
    const b64 = /png/.test(f.type) ? await UI.readB64(f) : c.base64;
    const r = await API.call('saveTtd', { target: 'logo', base64: b64 });
    S.settings.LOGO_FILE_ID = r.data.file_id; Store.persist(); UI.toast('Logo kop diperbarui', 'ok'); setRefresh(); loadLogoPrev();
  } catch (e) { UI.toast('Gagal mengunggah logo: ' + e.message, 'err'); }
};
Act['set.logodel'] = async () => {
  try { await API.call('saveTtd', { target: 'logo', remove: true }); S.settings.LOGO_FILE_ID = ''; Store.persist(); UI.toast('Kembali memakai logo bawaan', 'ok'); setRefresh(); } catch (e) { UI.toast(e.message, 'err'); }
};
/** Modal TTD (dipakai untuk pejabat & penerima) */
function ttdModal({ title, sub, spesimen, onSave }) {
  const m = UI.modal({ title, sub, body: `<div id="tm-ttd"></div><p class="xs muted mt-s">TTD disimpan sebagai PNG di folder privat Google Drive. Dokumen yang sudah disahkan sebelumnya tetap memakai TTD lama.</p>`, foot: `${spesimen ? `<button class="btn btn-ghost" style="color:var(--danger)" id="tm-del">Hapus spesimen</button>` : ''}<span class="spacer"></span><button class="btn btn-outline" data-close>Batal</button><button class="btn" id="tm-ok">${I('check')} Simpan</button>` });
  const p = UI.ttdPicker(m.q('#tm-ttd'), { spesimen, modes: ['pad', 'upload'], value: 'pad' });
  m.q('#tm-ok').onclick = async () => { const t = p.get(); if (t.mode !== 'gambar') { UI.toast('Gambar atau unggah TTD terlebih dahulu', 'err'); return; } UI.busy(m.q('#tm-ok'), true); try { await onSave(t.base64); m.close(); } catch (e) { UI.toast(e.message, 'err'); UI.busy(m.q('#tm-ok'), false); } };
  if (spesimen) m.q('#tm-del').onclick = async () => { try { await onSave(null); m.close(); } catch (e) { UI.toast(e.message, 'err'); } };
}
Act['usr.ttd'] = el => {
  const u = Store.byId('users', el.dataset.id);
  ttdModal({ title: 'Spesimen TTD', sub: E(u.nama) + ' · ' + E(ROLE_LABEL[u.role] || u.role), spesimen: u.ttd_file_id, onSave: async b64 => {
    const r = await API.call('saveTtd', b64 ? { target: u.id === S.user.id ? 'me' : 'user', id: u.id, base64: b64 } : { target: u.id === S.user.id ? 'me' : 'user', id: u.id, remove: true });
    Store.upsert('users', { id: u.id, ttd_file_id: r.data.file_id }); if (u.id === S.user.id) { S.user.ttd_file_id = r.data.file_id; Store.persist(); }
    UI.toast(r.message, 'ok'); setRefresh();
  } });
};
Act['pj.edit'] = el => {
  const x = el.dataset.id ? Store.byId('penerima', el.dataset.id) : { id: UI.uid(), status: 'Aktif', jabatan: 'Penanggung Jawab Ruangan' };
  const m = UI.modal({ title: el.dataset.id ? 'Edit Penanggung Jawab' : 'Tambah Penanggung Jawab Ruangan', size: 'lg', body: `<form class="form-grid" id="pjf"><div class="field"><label>Nama lengkap & gelar <span class="req">*</span></label><input class="input" name="nama" value="${E(x.nama || '')}"></div><div class="field"><label>NIP</label><input class="input mono" name="nip" inputmode="numeric" value="${E(x.nip || '')}"></div>
    <div class="field"><label>Jabatan</label><input class="input" name="jabatan" value="${E(x.jabatan || '')}"></div><div class="field"><label>Ruangan / Unit</label><input class="input" name="ruangan" value="${E(x.ruangan || '')}" placeholder="Instalasi Farmasi"></div>
    <div class="field"><label>No. WhatsApp</label><input class="input mono" name="telepon" inputmode="tel" value="${E(x.telepon || '')}"></div><div class="field"><label>Status</label><select class="select" name="status">${UI.opt(['Aktif', 'Nonaktif'], x.status)}</select></div></form>
    <div class="mono xs mt" style="letter-spacing:.06em">SPESIMEN TANDA TANGAN (OPSIONAL)</div><div id="pj-ttd" class="mt-s"></div>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn" id="pj-ok">${I('check')} Simpan</button>` });
  const p = UI.ttdPicker(m.q('#pj-ttd'), { spesimen: x.ttd_file_id || '', modes: x.ttd_file_id ? ['spesimen', 'pad', 'upload'] : ['pad', 'upload'], value: x.ttd_file_id ? 'spesimen' : 'pad' });
  m.q('#pj-ok').onclick = async () => {
    const d = UI.formData(m.q('#pjf')); if (!d.nama) { UI.toast('Nama wajib diisi', 'err'); return; }
    const t = p.get(); UI.busy(m.q('#pj-ok'), true);
    try { const r = await API.call('savePenerima', { ...x, ...d, ttd_base64: t.mode === 'gambar' ? t.base64 : '' }); Store.upsert('penerima', r.data.penerima); UI.toast(r.message, 'ok'); m.close(); setRefresh(); }
    catch (e) { UI.toast(e.message, 'err'); UI.busy(m.q('#pj-ok'), false); }
  };
};
Act['pj.del'] = async el => {
  const x = Store.byId('penerima', el.dataset.id);
  if (!await UI.confirm('Hapus penanggung jawab?', `<b>${E(x.nama)}</b> dihapus dari master. BAPB lama tidak berubah.`, { danger: true, ok: 'Hapus' })) return;
  API.mutate({ label: 'Hapus penerima', apply: () => Store.remove('penerima', x.id), rollback: o => Store.upsert('penerima', o), run: () => API.call('deletePenerima', { id: x.id }), onSuccess: () => setRefresh() });
};

// --- Backup
async function loadBackups() {
  try {
    const r = await API.call('listBackups');
    const box = document.getElementById('bk-list'); if (!box) return;
    const lb = document.getElementById('bk-last'); if (lb) lb.textContent = r.data.last ? 'Backup terakhir: ' + UI.tglJam(r.data.last) + ' (' + UI.ago(r.data.last) + ')' : 'Belum ada backup';
    box.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama File</th><th>Dibuat</th><th>Jenis</th><th></th></tr></thead><tbody>${r.data.backups.map(b => `<tr><td class="mono small">${E(b.name)}</td><td class="small">${UI.tglJam(b.created)} <span class="muted">(${UI.ago(b.created)})</span></td><td>${/json/.test(b.type || b.name) ? '<span class="chip st-gray nodot">JSON</span>' : /pre-/.test(b.name) ? '<span class="chip st-amber nodot">Otomatis (pra-aksi)</span>' : /auto/.test(b.name) ? '<span class="chip st-green nodot">Harian</span>' : '<span class="chip st-blue nodot">Manual</span>'}</td>
      <td class="row" style="gap:4px"><a class="icon-btn" href="${E(b.url)}" target="_blank" rel="noopener" title="Buka">${I('ext')}</a>${/json/.test(b.type || b.name) ? '' : `<button class="btn btn-outline btn-xs" data-act="bk.restore" data-id="${b.id}" data-name="${E(b.name)}">Restore</button>`}</td></tr>`).join('') || `<tr><td>${UI.empty('Belum ada backup', 'db')}</td></tr>`}</tbody></table></div>`;
  } catch (e) { const box = document.getElementById('bk-list'); if (box) box.innerHTML = `<div class="err" style="padding:16px">${E(e.message)}</div>`; }
}
Act['bk.list'] = loadBackups;
Act['bk.now'] = async el => { UI.busy(el, true); try { const r = await API.call('backupNow', { label: 'manual' }, { timeout: 120000 }); UI.toast(r.message, 'ok'); loadBackups(); } catch (e) { UI.toast(e.message, 'err'); } UI.busy(el, false); };
Act['bk.trig'] = async el => { UI.busy(el, true); try { const r = await API.call('installTriggers'); UI.toast(r.message, 'ok'); } catch (e) { UI.toast(e.message, 'err'); } UI.busy(el, false); };
Act['bk.json'] = async el => { UI.busy(el, true); try { const r = await API.call('exportJson', { download: true }, { timeout: 120000 }); UI.downloadText(r.data.name, JSON.stringify(r.data.dump, null, 1), 'application/json'); UI.toast('Export tersimpan di Drive & diunduh', 'ok'); loadBackups(); } catch (e) { UI.toast(e.message, 'err'); } UI.busy(el, false); };
Act['bk.restore'] = async el => {
  const id = el.dataset.id; UI.busy(el, true);
  let prev; try { prev = await API.call('restoreBackup', { id, dryRun: true }, { timeout: 120000 }); } catch (e) { UI.toast(e.message, 'err'); UI.busy(el, false); return; }
  UI.busy(el, false);
  const rep = prev.data.report;
  const m = UI.modal({ title: 'Restore dari backup', sub: E(el.dataset.name), size: 'lg', body: `<div class="info-box mb" style="background:var(--warn-tint);color:var(--warn-text)">${I('alert')}<span>Isi sheet terpilih akan <b>diganti</b> dengan isi backup. Backup kondisi saat ini dibuat otomatis sebelum restore.</span></div>
    <table class="tbl"><thead><tr><th></th><th>Sheet</th><th class="num">Baris saat ini</th><th class="num">Baris di backup</th></tr></thead><tbody>${Object.keys(rep).map(k => `<tr><td><input type="checkbox" value="${k}" ${rep[k].missing ? 'disabled' : 'checked'} class="rs-chk"></td><td class="mono small">${k}</td><td class="num">${rep[k].missing ? '-' : rep[k].current}</td><td class="num">${rep[k].missing ? '<span class="muted">tidak ada</span>' : rep[k].rows}</td></tr>`).join('')}</tbody></table>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-danger" id="rs-ok">Restore Sekarang</button>` });
  m.q('#rs-ok').onclick = async () => {
    const sheets = m.qa('.rs-chk:checked').map(c => c.value); if (!sheets.length) return;
    UI.busy(m.q('#rs-ok'), true);
    try { await API.call('restoreBackup', { id, sheets }, { timeout: 300000 }); m.close(); UI.toast('Restore selesai, memuat data…', 'ok'); await App.refreshData(); loadBackups(); }
    catch (e) { UI.toast(e.message, 'err'); UI.busy(m.q('#rs-ok'), false); }
  };
};
// --- Migrasi
Act['mg.src'] = el => { ps('pengaturan').mig.src = el.value; };
Act['mg.sheet'] = el => { const m = ps('pengaturan').mig; m.sheets = el.checked ? [...new Set(m.sheets.concat(el.value))] : m.sheets.filter(s => s !== el.value); };
Act['mg.ow'] = el => { ps('pengaturan').mig.overwrite = el.checked; };
function migReport(d) {
  const r = d.report;
  return `<div class="card flat"><div class="row"><b style="flex:1">${d.dryRun ? 'Hasil Pindai (dry-run — belum ada yang ditulis)' : 'Hasil Import'}</b><span class="mono xs muted">Sumber: ${E(d.source.name)}</span></div>
    <div class="tbl-wrap mt-s"><table class="tbl"><thead><tr><th>Data</th><th class="num">Di app lama</th><th class="num">Ditambah</th><th class="num">Diperbarui</th><th class="num">Dilewati</th></tr></thead><tbody>${Object.keys(r).map(k => `<tr><td class="mono small">${k}</td>${r[k].missing ? '<td colspan="4" class="muted small">Sheet tidak ditemukan di sumber</td>' : `<td class="num">${r[k].source}</td><td class="num" style="color:var(--success-dark)">${r[k].inserted}</td><td class="num" style="color:var(--primary)">${r[k].updated}</td><td class="num muted">${r[k].skipped}</td>`}</tr>`).join('')}</tbody></table></div>
    ${d.warnings.map(w => `<div class="info-box mt-s" style="background:var(--warn-tint);color:var(--warn-text)">${I('alert')}<span>${E(w)}</span></div>`).join('')}</div>`;
}
Act['mg.scan'] = async el => {
  const m = ps('pengaturan').mig; if (!m.src) { UI.toast('Isi URL/ID spreadsheet sumber', 'err'); return; }
  UI.busy(el, true); document.getElementById('mg-res').innerHTML = '<div class="skel" style="height:140px"></div>';
  try { const r = await API.call('importScan', { source: m.src, sheets: m.sheets, overwrite: m.overwrite }, { timeout: 300000 }); document.getElementById('mg-res').innerHTML = migReport(r.data); }
  catch (e) { document.getElementById('mg-res').innerHTML = `<div class="err">${E(e.message)}</div>`; }
  UI.busy(el, false);
};
Act['mg.run'] = async el => {
  const m = ps('pengaturan').mig; if (!m.src) { UI.toast('Isi URL/ID spreadsheet sumber', 'err'); return; }
  if (!await UI.confirm('Jalankan import?', `Data dari sheet <b>${m.sheets.join(', ')}</b> akan digabungkan ke database. Backup pre-import dibuat otomatis. Proses aman diulang (idempoten).`, { ok: 'Jalankan Import' })) return;
  UI.busy(el, true); document.getElementById('mg-res').innerHTML = '<div class="skel" style="height:140px"></div>';
  try { const r = await API.call('importRun', { source: m.src, sheets: m.sheets, overwrite: m.overwrite }, { timeout: 330000 }); document.getElementById('mg-res').innerHTML = migReport(r.data); UI.toast('Import selesai, memuat data terbaru…', 'ok'); App.refreshData(true); }
  catch (e) { document.getElementById('mg-res').innerHTML = `<div class="err">${E(e.message)}</div>`; }
  UI.busy(el, false);
};
// --- Log
let LOGS = [];
async function loadLogs() {
  const q = (document.getElementById('log-q') || {}).value || '';
  ps('pengaturan').lq = q;
  try {
    const r = await API.call('getLogs', { limit: 500, q }); LOGS = r.data;
    const b = document.getElementById('log-body'); if (!b) return;
    b.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Entitas</th><th>Detail</th></tr></thead><tbody>${LOGS.map(l => `<tr><td class="mono xs">${UI.tglJam(l.ts)}</td><td class="small">${E(l.user_email)}<div class="xs muted">${E(l.role)}</div></td><td><span class="chip ${/TOLAK|HAPUS|RESTORE/.test(l.aksi) ? 'st-red' : /SETUJU|TTD|BAYAR/.test(l.aksi) ? 'st-green' : 'st-blue'} nodot">${E(l.aksi)}</span></td><td class="mono xs">${E(l.entitas)}</td><td class="small" style="max-width:420px">${E(String(l.detail).slice(0, 200))}</td></tr>`).join('') || `<tr><td>${UI.empty('Tidak ada log')}</td></tr>`}</tbody></table></div>`;
  } catch (e) { const b = document.getElementById('log-body'); if (b) b.innerHTML = `<div class="err" style="padding:16px">${E(e.message)}</div>`; }
}
Act['log.load'] = loadLogs;
Act['log.export'] = () => UI.exportExcel('Log_Aktivitas_' + UI.iso(), { Log: LOGS.map(l => ({ Waktu: l.ts, Email: l.user_email, Role: l.role, Aksi: l.aksi, Entitas: l.entitas, Ref: l.ref_id, Detail: l.detail })) });
// --- Sistem
async function sysPing() {
  const t0 = performance.now(); const p = await API.ping(); const t1 = performance.now();
  let t2 = t1; try { await API.call('version'); t2 = performance.now(); } catch (e) { }
  const box = document.getElementById('sys-ping'); if (!box) return;
  const bytes = (() => { try { return (localStorage.getItem('vms_state_v1') || '').length; } catch (e) { return 0; } })();
  box.innerHTML = `<div class="grid g2" style="gap:10px">${[['Status server', p && p.success ? '<span style="color:var(--success-dark)">● Online</span>' : '<span style="color:var(--danger)">● Tidak terjangkau</span>'], ['Latensi ping', Math.round(t1 - t0) + ' ms'], ['Latensi API (auth+cache)', Math.round(t2 - t1) + ' ms'], ['Cache lokal', UI.fsize(bytes * 2)], ['Versi data', E(S.version)], ['Antrean sinkron', API.status().pending + ' request']].map(([k, v]) => `<div class="act-item" style="margin:0"><div class="mono xs muted">${k}</div><b class="mono">${v}</b></div>`).join('')}</div>`;
}
Act['sys.cache'] = async el => { UI.busy(el, true); try { await API.call('clearCache'); UI.toast('Cache server dibersihkan', 'ok'); App.refreshData(true); } catch (e) { UI.toast(e.message, 'err'); } UI.busy(el, false); };
Act['sys.local'] = async () => { if (await UI.confirm('Hapus cache perangkat?', 'Data lokal di browser ini dihapus dan Anda akan keluar.', { danger: true, ok: 'Hapus & keluar' })) App.logout(); };
