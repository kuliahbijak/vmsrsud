/* ==========================================================================
   DOC-FORMAT — format dokumen bawaan (SP, BAPB/Surat Penerimaan Barang, BASTP,
   Invoice) + renderer {{placeholder}} + pratinjau & cetak/PDF instan di browser.
   - Desain bawaan = HTML di bawah (DOC_TPL). Admin dapat memasangnya sebagai
     Google Docs (Kelola Template → Pasang Template Bawaan) lalu mengubah desain
     sesuka hati; PDF resmi kemudian dibuat server dari template Docs tersebut.
   - Data dokumen disusun oleh DOC-CORE yang SAMA dengan backend (DocEngine.gs).
   ========================================================================== */
/* ===== DOC-CORE v1.1 — DIBAGI backend (DocEngine.gs) & frontend (js/doc-format.js) =====
   Satu sumber kebenaran untuk: daftar kunci placeholder, format tanggal/angka/terbilang,
   pengubah {{KUNCI|pengubah}}, dan penyusunan data dokumen (SP, BAPB, BASTP, INVOICE).
   Berkas ini disalin otomatis ke kedua sisi — ubah di shared/doccore.js lalu jalankan build. */
var DC = (function () {
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  var APPROVED_PO = { 'Disetujui PPK': 1, 'BAST Parsial': 1, 'BAST Terbit': 1, 'Selesai': 1 };

  function toDate(s) {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s) ? null : s;
    s = String(s);
    var d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
    return isNaN(d) ? null : d;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function tgl(s) { var d = toDate(s); return d ? pad2(d.getDate()) + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : ''; }
  function tglAngka(s) { var d = toDate(s); return d ? d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() : ''; }
  function addDays(s, n) { var d = toDate(s); if (!d) return ''; d = new Date(d.getTime()); d.setDate(d.getDate() + (Number(n) || 0)); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function ribuan(n) {
    n = Number(n) || 0;
    var neg = n < 0; n = Math.abs(n);
    var bulat = Math.floor(n), des = Math.round((n - bulat) * 100);
    var s = String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (des) s += ',' + (des < 10 ? '0' + des : String(des)).replace(/0$/, '');
    return (neg ? '-' : '') + s;
  }
  function terbilang(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    var s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    function t(x) {
      if (x < 12) return s[x];
      if (x < 20) return t(x - 10) + ' belas';
      if (x < 100) return t(Math.floor(x / 10)) + ' puluh ' + t(x % 10);
      if (x < 200) return 'seratus ' + t(x - 100);
      if (x < 1000) return t(Math.floor(x / 100)) + ' ratus ' + t(x % 100);
      if (x < 2000) return 'seribu ' + t(x - 1000);
      if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu ' + t(x % 1000);
      if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta ' + t(x % 1e6);
      if (x < 1e12) return t(Math.floor(x / 1e9)) + ' miliar ' + t(x % 1e9);
      return t(Math.floor(x / 1e12)) + ' triliun ' + t(x % 1e12);
    }
    return n === 0 ? 'nol' : t(n).replace(/\s+/g, ' ').trim();
  }
  function judul(s) { return String(s || '').toLowerCase().replace(/(^|\s|\()(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function rupiahTerbilang(n) { return judul(terbilang(n)) + ' Rupiah'; }
  function nip(s) { var d = String(s || '').replace(/\D/g, ''); return d.length === 18 ? d.slice(0, 8) + ' ' + d.slice(8, 14) + ' ' + d.slice(14, 15) + ' ' + d.slice(15) : String(s || ''); }
  function normJenis(j) { j = String(j || '').toUpperCase(); return j === 'BAST' ? 'BAPB' : j === 'INV' ? 'INVOICE' : j === 'SP' ? 'PO' : j; }

  /** Pengubah tampilan: kapital, kecil, judul, rupiah, ribuan, terbilang[:rupiah], tanggal, nip, bawaan:teks */
  function modify(disp, raw, mods) {
    var v = disp == null ? '' : String(disp);
    String(mods || '').split('|').forEach(function (p) {
      p = p.trim(); if (!p) return;
      var i = p.indexOf(':'), nama = (i > -1 ? p.slice(0, i) : p).toLowerCase(), arg = i > -1 ? p.slice(i + 1) : '';
      var num = Number(raw); var isNum = raw !== '' && raw != null && !isNaN(num);
      if (nama === 'bawaan') { if (v === '') v = arg; }
      else if (nama === 'kapital') v = v.toUpperCase();
      else if (nama === 'kecil') v = v.toLowerCase();
      else if (nama === 'judul') v = judul(v);
      else if (nama === 'rupiah') v = 'Rp ' + ribuan(isNum ? num : String(v).replace(/\./g, '').replace(',', '.'));
      else if (nama === 'ribuan') v = ribuan(isNum ? num : v);
      else if (nama === 'terbilang') v = arg === 'rupiah' ? rupiahTerbilang(isNum ? num : 0) : judul(terbilang(isNum ? num : 0));
      else if (nama === 'tanggal') v = tgl(raw || v);
      else if (nama === 'nip') v = nip(raw || v);
      else if (nama === 'lebar' || nama === 'tinggi') { /* khusus gambar */ }
    });
    return v;
  }

  /** Katalog kunci standar (untuk UI mapping & tebakan otomatis). Label · grup */
  var CATALOG = {
    'Kop & Instansi': { KOP_INSTANSI: 'Kop baris 1 (Pemerintah ...)', KOP_JUDUL: 'Kop baris 2', KOP_NAMA: 'Kop baris 3 (nama RS)', KOP_ALAMAT: 'Alamat kop', KOP_KONTAK: 'Telepon/Fax', KOP_LAMAN: 'Laman & Pos-el', RS_NAMA: 'Nama singkat RS', RS_NAMA_DOK: 'Nama RS (badan dokumen)', RS_KOTA: 'Kota penandatanganan', PEMDA: 'Pemerintah daerah', TANGGAL_HARI_INI: 'Tanggal hari ini', TAHUN: 'Tahun dokumen' },
    'Dokumen (umum)': { NOMOR: 'Nomor dokumen ini', TANGGAL: 'Tanggal dokumen ini', HARI: 'Nama hari dokumen', TGL_TERBILANG: 'Tanggal terbilang (tiga)', BULAN: 'Nama bulan', BULAN_ROMAWI: 'Bulan romawi', TAHUN_TERBILANG: 'Tahun terbilang', TANGGAL_ANGKA: 'Tanggal angka (3/3/2026)' },
    'Surat Pesanan (SP/PO)': { NOMOR_SP: 'Nomor SP', TANGGAL_SP: 'Tanggal SP', KEGIATAN: 'Kegiatan', SUB_KEGIATAN: 'Sub kegiatan', PEKERJAAN: 'Pekerjaan / paket', KODE_REKENING: 'Kode rekening', UNIT: 'Unit pemesan', KATEGORI: 'Kategori', SUMBER_DANA: 'Sumber dana', RUJUKAN: 'Rujukan / e-Katalog', KETERANGAN: 'Keterangan', NILAI_SP: 'Total nilai SP', NILAI_SP_TERBILANG: 'Total SP terbilang', TGL_DITERIMA: 'Tanggal barang diterima', WAKTU_PENYELESAIAN: 'Waktu penyelesaian (hari)', WAKTU_TERBILANG: 'Waktu terbilang', TGL_SELESAI: 'Tanggal selesai', ALAMAT_KIRIM: 'Alamat pengiriman' },
    'Nilai (mengikuti jenis dokumen)': { JUMLAH: 'Jumlah sebelum pajak / DPP', PPN_PERSEN: 'Tarif PPN %', PPN: 'PPN', TOTAL: 'Total termasuk PPN', TOTAL_TERBILANG: 'Total terbilang', PPH22_PERSEN: 'Tarif PPh 22 %', PPH22: 'PPh 22', NETTO: 'Netto dibayar', NETTO_TERBILANG: 'Netto terbilang' },
    'Penyedia / Vendor': { NAMA_PENYEDIA: 'Nama perusahaan', ALAMAT_PENYEDIA: 'Alamat', TELEPON_PENYEDIA: 'Telepon', EMAIL_PENYEDIA: 'Email', NPWP_PENYEDIA: 'NPWP', NIB_PENYEDIA: 'NIB', NAMA_PIMPINAN: 'Nama pimpinan / penanda tangan', JABATAN_PIMPINAN: 'Jabatan pimpinan', BANK: 'Bank', NO_REKENING: 'No. rekening', NAMA_REKENING: 'Nama rekening' },
    'Pejabat': { NAMA_PPK: 'Nama PPK', NIP_PPK: 'NIP PPK', JABATAN_PPK: 'Jabatan PPK', PPTK_NAMA: 'Nama PPTK', PPTK_NIP: 'NIP PPTK', PPTK_JABATAN: 'Jabatan PPTK', PENERIMA_NAMA: 'Nama Penanggung Jawab Ruangan', PENERIMA_NIP: 'NIP Penanggung Jawab', PENERIMA_JABATAN: 'Jabatan Penanggung Jawab', RUANGAN: 'Ruangan / instalasi' },
    'Penerimaan (BAPB / BASTP)': { NOMOR_BAPB: 'Nomor BAPB', TANGGAL_BAPB: 'Tanggal BAPB', NOMOR_BASTP: 'Nomor BAST Hasil Pekerjaan', NO_PESANAN: 'No. pesanan (rujukan/SP)', TGL_PESANAN: 'Tanggal pesanan', NO_SURAT_JALAN: 'No. surat jalan', KESIMPULAN: 'Kesimpulan pemeriksaan', CATATAN_PENERIMAAN: 'Catatan pemeriksaan' },
    'Invoice': { NOMOR_INVOICE: 'Nomor invoice', TANGGAL_INVOICE: 'Tanggal invoice', NO_FAKTUR: 'No. e-Faktur', JATUH_TEMPO: 'Jatuh tempo', NO_SP2D: 'No. SP2D', TTD_NAMA: 'Nama penanda tangan penagih', TTD_JABATAN: 'Jabatan penanda tangan penagih' },
    'Gambar & TTD': { LOGO: 'Logo kop (gambar)', TTD_PPK: 'TTD PPK (gambar)', TTD_PPTK: 'TTD PPTK (gambar)', TTD_PENERIMA: 'TTD Penanggung Jawab Ruangan (gambar)', TTD_PENYEDIA: 'TTD Penyedia (gambar)', TTD_1: 'TTD slot 1', TTD_2: 'TTD slot 2' },
    'Baris berulang': { ITEM: 'Baris barang {{#ITEM}} · kolom {{ITEM.NO}} {{ITEM.URAIAN}} {{ITEM.SPESIFIKASI}} {{ITEM.VOLUME}} {{ITEM.SATUAN}} {{ITEM.HARGA}} {{ITEM.JUMLAH}} {{ITEM.LOT}} {{ITEM.EXP}} {{ITEM.KONDISI}} {{ITEM.QTY_PO}}' }
  };
  var IMAGE_KEYS = { LOGO: 1, TTD_PPK: 1, TTD_PPTK: 1, TTD_PENERIMA: 1, TTD_PENYEDIA: 1, TTD_1: 1, TTD_2: 1, TTD_3: 1 };
  /** Slot TTD per jenis dokumen (urut kiri→kanan) */
  var SLOTS = {
    PO: [['TTD_PPK', 'PPK']],
    BAPB: [['TTD_PENERIMA', 'Penanggung Jawab Ruangan'], ['TTD_PPTK', 'PPTK (Mengetahui)']],
    BASTP: [['TTD_PENYEDIA', 'Penyedia (Pihak Pertama)'], ['TTD_PPK', 'PPK (Pihak Kedua)']],
    INVOICE: [['TTD_PENYEDIA', 'Penyedia (Penagih)'], ['TTD_PPK', 'PPK (Setuju dibayar)']]
  };
  function isKnown(k) { for (var g in CATALOG) if (CATALOG[g][k]) return true; return false; }

  /**
   * Susun data dokumen.
   * inp = { jenis, settings, po, poItems[], vendor, bast, bastItems[], inv, users[], ttd: 'gambar'|'basah'|{TTD_PPK:false,...}, now }
   * hasil: { D: tampilan, R: mentah, ROWS: {ITEM:[...]}, IMG: {kunci: fileId}, signers: [{key,label,fileId}] }
   */
  function build(inp) {
    var s = inp.settings || {}, po = inp.po || {}, v = inp.vendor || {}, b = inp.bast || null, inv = inp.inv || null;
    var users = inp.users || [], jenis = normJenis(inp.jenis);
    var D = {}, R = {}, ROWS = {}, IMG = {};
    function put(k, disp, raw) { D[k] = disp == null ? '' : String(disp); R[k] = raw === undefined ? D[k] : raw; }
    function money(k, n) { n = Math.round(Number(n) || 0); put(k, ribuan(n), n); }
    function date(k, d) { put(k, tgl(d), d || ''); }
    function user(id) { for (var i = 0; i < users.length; i++) if (users[i].id === id && id) return users[i]; return null; }
    function firstRole(r, nama) {
      for (var i = 0; i < users.length; i++) if (users[i].role === r && nama && users[i].nama === nama) return users[i];
      for (var j = 0; j < users.length; j++) if (users[j].role === r && users[j].status !== 'Nonaktif') return users[j];
      return null;
    }
    // --- Kop & umum
    ['KOP_INSTANSI', 'KOP_JUDUL', 'KOP_NAMA', 'KOP_ALAMAT', 'KOP_KONTAK', 'KOP_LAMAN', 'RS_NAMA', 'RS_NAMA_LENGKAP', 'RS_NAMA_DOK', 'RS_KOTA', 'RS_ALAMAT', 'PEMDA']
      .forEach(function (k) { put(k, s[k] || ''); });
    if (!D.RS_NAMA_DOK) put('RS_NAMA_DOK', s.RS_NAMA_LENGKAP || s.RS_NAMA || '');
    var now = inp.now || new Date();
    date('TANGGAL_HARI_INI', now);
    // --- Penyedia
    put('NAMA_PENYEDIA', v.nama || '');
    var al = [v.alamat || ''];
    [v.kota, v.provinsi].forEach(function (x) { if (x && String(al[0]).toLowerCase().indexOf(String(x).toLowerCase()) === -1) al.push(x); });
    put('ALAMAT_PENYEDIA', al.filter(Boolean).join(', '));
    put('TELEPON_PENYEDIA', v.telepon || ''); put('EMAIL_PENYEDIA', v.email || ''); put('NPWP_PENYEDIA', v.npwp || ''); put('NIB_PENYEDIA', v.nib || '');
    put('NAMA_PIMPINAN', v.pic_nama || ''); put('JABATAN_PIMPINAN', v.pic_jabatan || 'Direktur');
    put('BANK', v.bank || ''); put('NO_REKENING', v.no_rekening || ''); put('NAMA_REKENING', v.nama_rekening || '');
    // --- SP / PO
    put('NOMOR_SP', po.nomor_po || ''); put('NOMOR_PO', po.nomor_po || '');
    date('TANGGAL_SP', po.tanggal); date('TANGGAL_PO', po.tanggal);
    put('KEGIATAN', po.kegiatan || s.DEFAULT_KEGIATAN || ''); put('SUB_KEGIATAN', po.sub_kegiatan || s.DEFAULT_SUB_KEGIATAN || '');
    put('PEKERJAAN', po.paket || po.kategori || ''); put('KODE_REKENING', po.kode_rekening || '');
    put('UNIT', po.unit || ''); put('KATEGORI', po.kategori || ''); put('SUMBER_DANA', po.sumber_dana || ''); put('RUJUKAN', po.rujukan || ''); put('KETERANGAN', po.keterangan || '');
    money('NILAI_SP', po.total); put('NILAI_SP_TERBILANG', rupiahTerbilang(po.total), po.total || 0);
    var waktu = Number(po.waktu_penyelesaian) || 0;
    put('WAKTU_PENYELESAIAN', waktu ? String(waktu) : '', waktu); put('WAKTU_TERBILANG', waktu ? judul(terbilang(waktu)) : '', waktu);
    date('TGL_DITERIMA', po.tgl_kirim || (waktu ? addDays(po.tanggal, waktu) : ''));
    date('TGL_SELESAI', po.tgl_kirim || (waktu ? addDays(po.tanggal, waktu) : ''));
    put('ALAMAT_KIRIM', po.alamat_kirim || [D.RS_NAMA_DOK, D.KOP_ALAMAT, D.KOP_KONTAK].filter(Boolean).join(' '));
    // --- Pejabat: PPK (yang menyetujui SP / invoice), fallback pengaturan
    var ppk = user(inv && inv.ppk_id) || user(po.ppk_id) || firstRole('PPK', po.disetujui_oleh) || { nama: s.PPK_NAMA || '', nip: s.PPK_NIP || '' };
    put('NAMA_PPK', ppk.nama || s.PPK_NAMA || ''); put('NIP_PPK', ppk.nip || s.PPK_NIP || ''); put('JABATAN_PPK', 'Pejabat Pembuat Komitmen (PPK)');
    // --- Item & nilai per jenis dokumen
    var ppnRate = Number(s.PPN_RATE) || 0, pphRate = Number(s.PPH22_RATE) || 0;
    put('PPN_PERSEN', String(ppnRate).replace('.', ','), ppnRate); put('PPH22_PERSEN', String(pphRate).replace('.', ','), pphRate);
    var items = [];
    if (jenis === 'PO' || !b) {
      items = (inp.poItems || []).map(function (x, i) {
        return { NO: String(i + 1), URAIAN: x.nama || '', SPESIFIKASI: x.spesifikasi || '', VOLUME: ribuan(x.qty), SATUAN: x.satuan || '', HARGA: ribuan(x.harga), JUMLAH: ribuan(x.subtotal || x.qty * x.harga), QTY_PO: ribuan(x.qty), LOT: '', EXP: '', KONDISI: '', _raw: { VOLUME: x.qty, HARGA: x.harga, JUMLAH: x.subtotal || x.qty * x.harga } };
      });
      money('JUMLAH', po.subtotal); money('PPN', po.ppn); money('TOTAL', po.total); put('TOTAL_TERBILANG', rupiahTerbilang(po.total), po.total || 0);
    } else {
      items = (inp.bastItems || []).filter(function (x) { return Number(x.qty_diterima) > 0; }).map(function (x, i) {
        var j = Math.round((Number(x.qty_diterima) || 0) * (Number(x.harga) || 0));
        return { NO: String(i + 1), URAIAN: x.nama || '', SPESIFIKASI: x.catatan || '', VOLUME: ribuan(x.qty_diterima), SATUAN: x.satuan || '', HARGA: ribuan(x.harga), JUMLAH: ribuan(j), QTY_PO: ribuan(x.qty_po), LOT: x.lot || '', EXP: x.exp || '', KONDISI: x.kondisi || '', _raw: { VOLUME: x.qty_diterima, HARGA: x.harga, JUMLAH: j } };
      });
      var dpp = items.reduce(function (a, x) { return a + x._raw.JUMLAH; }, 0);
      var ppn = Math.round(dpp * ppnRate / 100), pph = Math.round(dpp * pphRate / 100);
      if (inv) { dpp = inv.dpp; ppn = inv.ppn; pph = inv.pph; }
      money('JUMLAH', dpp); money('DPP', dpp); money('PPN', ppn); money('TOTAL', dpp + ppn); put('TOTAL_TERBILANG', rupiahTerbilang(dpp + ppn), dpp + ppn);
      money('PPH22', pph); money('NETTO', inv ? inv.netto : dpp - pph); put('NETTO_TERBILANG', rupiahTerbilang(inv ? inv.netto : dpp - pph), inv ? inv.netto : dpp - pph);
      money('NILAI_DITERIMA', dpp + ppn); put('NILAI_DITERIMA_TERBILANG', rupiahTerbilang(dpp + ppn), dpp + ppn);
    }
    ROWS.ITEM = items;
    // --- Penerimaan (BAPB / BASTP)
    if (b) {
      put('NOMOR_BAPB', b.nomor_bast || ''); put('NOMOR_BASTP', b.nomor_bastp || ''); date('TANGGAL_BAPB', b.tanggal);
      put('NO_PESANAN', po.rujukan || po.nomor_po || ''); date('TGL_PESANAN', po.tanggal);
      put('NO_SURAT_JALAN', b.no_surat_jalan || ''); put('KESIMPULAN', b.kesimpulan || ''); put('CATATAN_PENERIMAAN', b.catatan || '');
      put('PENERIMA_NAMA', b.penerima_nama || ''); put('PENERIMA_NIP', b.penerima_nip || '');
      put('RUANGAN', b.ruangan || ''); put('PENERIMA_JABATAN', b.penerima_jabatan || ('Penanggung Jawab ' + (b.ruangan || 'Ruangan')));
      var pptk = user(b.pptk_id) || {};
      put('PPTK_NAMA', b.pptk_nama || pptk.nama || ''); put('PPTK_NIP', b.pptk_nip || pptk.nip || ''); put('PPTK_JABATAN', 'Pejabat Teknis Kegiatan');
    }
    // --- Invoice
    if (inv) {
      put('NOMOR_INVOICE', inv.nomor_invoice || ''); date('TANGGAL_INVOICE', inv.tanggal); put('NO_FAKTUR', inv.no_faktur || '');
      date('JATUH_TEMPO', inv.jatuh_tempo); put('NO_SP2D', inv.no_sp2d || '');
      put('TTD_NAMA', inv.ttd_nama || v.pic_nama || ''); put('TTD_JABATAN', inv.ttd_jabatan || v.pic_jabatan || 'Direktur');
    }
    // --- Kunci sistem "dokumen ini" (doc-engine): NOMOR, TANGGAL, HARI, ...
    var docNo = { PO: po.nomor_po, BAPB: b && b.nomor_bast, BASTP: b && b.nomor_bastp, INVOICE: inv && inv.nomor_invoice }[jenis] || po.nomor_po || '';
    var docTgl = { PO: po.tanggal, BAPB: b && b.tanggal, BASTP: b && b.tanggal, INVOICE: inv && inv.tanggal }[jenis] || po.tanggal || now;
    var dd = toDate(docTgl) || now;
    put('NOMOR', docNo || ''); date('TANGGAL', docTgl);
    put('HARI', HARI[dd.getDay()]); put('TGL_TERBILANG', terbilang(dd.getDate()), dd.getDate()); put('BULAN', BULAN[dd.getMonth()]);
    put('BULAN_ROMAWI', ROMAWI[dd.getMonth()]); put('TAHUN', String(dd.getFullYear())); put('TAHUN_TERBILANG', terbilang(dd.getFullYear()), dd.getFullYear());
    put('TANGGAL_ANGKA', tglAngka(docTgl));

    // --- Gambar: logo + TTD (aturan kapan TTD boleh dibubuhkan)
    IMG.LOGO = s.LOGO_FILE_ID || '';
    var signed = b && b.status === 'Ditandatangani';
    var ttd = {
      TTD_PPK: (jenis === 'PO' ? APPROVED_PO[po.status] : jenis === 'BASTP' ? signed : jenis === 'INVOICE' ? (inv && (inv.status === 'Disetujui' || inv.status === 'Dibayar')) : false) ? (ppk.ttd_file_id || '') : '',
      TTD_PPTK: signed ? (b.pptk_ttd_file_id || b.ttd_file_id || (user(b.pptk_id) || {}).ttd_file_id || '') : '',
      TTD_PENERIMA: signed ? (b.penerima_ttd_file_id || '') : '',
      TTD_PENYEDIA: jenis === 'INVOICE' ? ((inv && inv.ttd_file_id) || '') : jenis === 'BASTP' && signed ? (v.ttd_file_id || '') : ''
    };
    var mode = inp.ttd || s.TTD_MODE || 'gambar';
    Object.keys(ttd).forEach(function (k) {
      var on = mode === 'basah' ? false : typeof mode === 'object' ? mode[k] !== false : true;
      IMG[k] = on ? ttd[k] : '';
    });
    var slots = SLOTS[jenis] || [];
    var signers = slots.map(function (sl, i) { IMG['TTD_' + (i + 1)] = IMG[sl[0]]; return { key: sl[0], label: sl[1], fileId: ttd[sl[0]] || '' }; });
    return { jenis: jenis, D: D, R: R, ROWS: ROWS, IMG: IMG, signers: signers };
  }

  /** Nilai satu kunci (dengan mapping admin & isian manual) */
  function value(ctx, key, mapping, manual) {
    var src = mapping && mapping[key];
    if (src === 'kosong') return { d: '', r: '' };
    if (src === 'manual') { var m = (manual || {})[key]; return { d: m == null ? '' : String(m), r: m }; }
    var k = src && src !== 'auto' && src !== 'baris' && src !== 'gambar' && ctx.D[src] !== undefined ? src : key;
    if (ctx.D[k] !== undefined) return { d: ctx.D[k], r: ctx.R[k] };
    var mv = (manual || {})[key];
    return { d: mv == null ? '' : String(mv), r: mv };
  }

  /** Penanda: {{ #?/ KUNCI | pengubah }} */
  var TOKEN = /\{\{\s*([#?\/]?)\s*([A-Za-z][A-Za-z0-9_.]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g;
  function scan(text) {
    var out = [], m; TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(String(text || '')))) out.push({ jenis: m[1] || '', kunci: m[2].toUpperCase(), pengubah: (m[3] || '').trim(), mentah: m[0] });
    return out;
  }
  function tebakTipe(k) {
    if (/^(TGL|TANGGAL)_/.test(k)) return 'tanggal';
    if (/(JUMLAH|NOMINAL|TOTAL|BIAYA|HARGA|NILAI)/.test(k)) return 'angka';
    if (/(ALAMAT|KETERANGAN|CATATAN|URAIAN)/.test(k)) return 'area';
    return 'teks';
  }
  function label(k) { return String(k).replace(/^(TGL|TANGGAL)_/, 'Tanggal ').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }); }

  return {
    BULAN: BULAN, HARI: HARI, ROMAWI: ROMAWI, CATALOG: CATALOG, IMAGE_KEYS: IMAGE_KEYS, SLOTS: SLOTS, TOKEN: TOKEN,
    toDate: toDate, tgl: tgl, ribuan: ribuan, terbilang: terbilang, judul: judul, rupiahTerbilang: rupiahTerbilang, nip: nip,
    normJenis: normJenis, modify: modify, isKnown: isKnown, build: build, value: value, scan: scan, tebakTipe: tebakTipe, label: label, addDays: addDays
  };
})();
/* ===== /DOC-CORE ===== */

const DOC_LABEL = { PO: 'Surat Pesanan (SP)', BAPB: 'BAPB · Surat Penerimaan Barang', BASTP: 'BAST Hasil Pekerjaan (BASTP)', INVOICE: 'Invoice / Tagihan' };

/* ---------- Format bawaan (inline style agar sama di browser & saat diimpor ke Google Docs) ---------- */
const DOC_TPL = (() => {
  const F = "font-family:'Times New Roman',Times,serif;font-size:11.5pt;line-height:1.35;color:#000";
  const NB = 'border:none;padding:1pt 3pt;vertical-align:top';
  const BD = 'border:1px solid #000;padding:2pt 4pt;vertical-align:top';
  const TH = 'border:1px solid #000;padding:2pt 4pt;font-weight:bold;text-align:center;vertical-align:middle';
  const kop = `<table style="width:100%;border-collapse:collapse;margin:0"><tr>
<td style="width:78pt;border:none;text-align:center;vertical-align:middle;padding:0 4pt 2pt 0">{{LOGO|lebar:62}}</td>
<td style="border:none;text-align:center;vertical-align:middle;padding:0 0 2pt 0;font-family:Arial,Helvetica,sans-serif">
<p style="margin:0;font-size:12.5pt;font-weight:bold">{{KOP_INSTANSI}}</p>
<p style="margin:0;font-size:16.5pt;font-weight:bold;letter-spacing:.6pt">{{KOP_JUDUL}}</p>
<p style="margin:0;font-size:16.5pt;font-weight:bold;letter-spacing:1.2pt">{{KOP_NAMA}}</p>
<p style="margin:0;font-size:9.5pt">{{KOP_ALAMAT}}</p>
<p style="margin:0;font-size:9.5pt">{{KOP_KONTAK}}</p>
<p style="margin:0;font-size:9pt;font-style:italic">{{KOP_LAMAN}}</p></td></tr></table>
<p style="margin:2pt 0 12pt;border-top:3pt double #000;font-size:2pt;line-height:2pt">&nbsp;</p>`;
  const judul = (t, no) => `<p style="text-align:center;margin:0;font-weight:bold;text-decoration:underline">${t}</p>
<p style="text-align:center;margin:0 0 12pt;font-weight:bold">${no}</p>`;
  const kv = (rows, w1 = 110) => `<table style="width:100%;border-collapse:collapse;margin:0 0 8pt">${rows.map(r => `<tr><td style="${NB};width:18pt">${r[0]}</td><td style="${NB};width:${w1}pt">${r[1]}</td><td style="${NB};width:8pt">:</td><td style="${NB};text-align:justify">${r[2]}</td></tr>`).join('')}</table>`;
  const ttdBlok = (key) => `<p style="margin:2pt 0;min-height:46pt;height:auto">{{${key}}}</p>`;
  const wrap = body => `<div style="${F}">${body}</div>`;

  const PO = wrap(kop + judul('SURAT PESANAN (SP)', 'Nomor : {{NOMOR_SP}}') + `
<p style="margin:0 0 4pt">Penyedia :</p>
${kv([['1.', 'Nama Perusahaan', '{{NAMA_PENYEDIA}}'], ['2.', 'Alamat', '{{ALAMAT_PENYEDIA}}'], ['3.', 'Nomor Telepon', '{{TELEPON_PENYEDIA}}']])}
<p style="margin:0 0 4pt">Dengan ini kami bermaksud untuk memesan barang/jasa untuk :</p>
${kv([['1.', 'Kegiatan', '{{KEGIATAN}}'], ['2.', 'Sub Kegiatan', '{{SUB_KEGIATAN}}'], ['3.', 'Pekerjaan', '{{PEKERJAAN}}'], ['4.', 'Kode rekening', '{{KODE_REKENING}}']], 92)}
<p style="margin:0">Sebagai berikut :</p>
<p style="margin:0 0 4pt">1.&nbsp;&nbsp;Rincian Barang.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 6pt">
<tr><td style="${TH};width:24pt">No</td><td style="${TH}">Uraian Barang/ Jasa</td><td style="${TH};width:46pt">Volume</td><td style="${TH};width:46pt">Satuan</td><td style="${TH};width:78pt">Harga Satuan</td><td style="${TH};width:86pt">Jumlah</td></tr>
<tr><td style="${BD};text-align:center">{{#ITEM}}{{ITEM.NO}}</td><td style="${BD}">{{ITEM.URAIAN}}</td><td style="${BD};text-align:center">{{ITEM.VOLUME}}</td><td style="${BD};text-align:center">{{ITEM.SATUAN}}</td><td style="${BD};text-align:right">{{ITEM.HARGA}}</td><td style="${BD};text-align:right">{{ITEM.JUMLAH}}</td></tr>
<tr><td colspan="5" style="${BD};text-align:right;font-weight:bold">Jumlah</td><td style="${BD};text-align:right;font-weight:bold">{{JUMLAH}}</td></tr>
<tr><td colspan="5" style="${BD};text-align:right;font-weight:bold">PPN {{PPN_PERSEN}}%</td><td style="${BD};text-align:right;font-weight:bold">{{PPN}}</td></tr>
<tr><td colspan="5" style="${BD};text-align:right;font-weight:bold">Jumlah Total</td><td style="${BD};text-align:right;font-weight:bold">{{TOTAL}}</td></tr>
</table>
${kv([['2.', 'Tanggal barang diterima', '<b>{{TGL_DITERIMA}}</b>;'], ['3.', 'Waktu penyelesaian', 'selama {{WAKTU_PENYELESAIAN}} ({{WAKTU_TERBILANG}}) hari kalender;'], ['4.', 'Pekerjaan selesai', 'harus sudah selesai pada tanggal {{TGL_SELESAI}};'], ['5.', 'Alamat pengiriman', '{{ALAMAT_KIRIM}}.']], 122)}
<p style="margin:0 0 14pt;text-align:justify">Demikianlah surat ini kami kirimkan. Kami menunggu kiriman barang/jasa dari Saudara. Atas perhatian dan kerja sama Saudara kami ucapkan terima kasih.</p>
<table style="width:100%;border-collapse:collapse"><tr><td style="${NB};width:52%"></td><td style="${NB};text-align:center">
<p style="margin:0">{{RS_KOTA}}, {{TANGGAL_SP}}</p><p style="margin:0">Pejabat Pembuat Komitmen (PPK)</p><p style="margin:0">{{RS_NAMA_DOK}}</p>
${ttdBlok('TTD_PPK')}
<p style="margin:0;text-decoration:underline">{{NAMA_PPK}}</p><p style="margin:0">NIP. {{NIP_PPK|nip}}</p></td></tr></table>`);

  const BAPB = wrap(kop + `<p style="text-align:center;margin:0;font-weight:bold;text-decoration:underline">SURAT PENERIMAAN BARANG</p>
<p style="text-align:center;margin:0 0 14pt">NOMOR : {{NOMOR_BAPB}}</p>
<p style="margin:0 0 6pt;text-align:justify">Pada hari ini <b>{{HARI}}</b> tanggal <b>{{TGL_TERBILANG}}</b> bulan <b>{{BULAN}}</b> tahun <b>{{TAHUN_TERBILANG}} ({{TANGGAL_ANGKA}})</b>, bertempat di {{RS_NAMA_DOK}} dengan ini telah menerima pengiriman barang sesuai pesanan nomor : <b>{{NO_PESANAN}}</b> tanggal <b>{{TGL_PESANAN}}</b>, dengan rincian sebagai berikut:</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 14pt">
<tr><td style="${TH};width:24pt">No</td><td style="${TH}">Nama Barang</td><td style="${TH};width:56pt">Vol</td><td style="${TH};width:70pt">Satuan</td></tr>
<tr><td style="${BD};text-align:center">{{#ITEM}}{{ITEM.NO}}</td><td style="${BD}">{{ITEM.URAIAN}}</td><td style="${BD}">{{ITEM.VOLUME}}</td><td style="${BD}">{{ITEM.SATUAN}}</td></tr>
</table>
<p style="margin:0 0 22pt;text-align:justify">Demikian Surat Penerimaan Barang ini dibuat sebagai bentuk pertanggungjawaban atas barang yang kami terima sesuai dengan Surat Pesanan <i>(Faktur Pengiriman Terlampir)</i>.</p>
<table style="width:100%;border-collapse:collapse;text-align:center">
<tr><td style="${BD};width:50%;text-align:center"></td><td style="${BD};text-align:center">Mengetahui,</td></tr>
<tr><td style="${BD};text-align:center">{{PENERIMA_JABATAN}}</td><td style="${BD};text-align:center">{{PPTK_JABATAN}}</td></tr>
<tr><td style="${BD};text-align:center;height:56pt">{{TTD_PENERIMA}}</td><td style="${BD};text-align:center">{{TTD_PPTK}}</td></tr>
<tr><td style="${BD};text-align:center">{{PENERIMA_NAMA}}</td><td style="${BD};text-align:center">{{PPTK_NAMA}}</td></tr>
<tr><td style="${BD};text-align:center">{{?PENERIMA_NIP}}NIP. {{PENERIMA_NIP|nip}}{{/PENERIMA_NIP}}</td><td style="${BD};text-align:center">{{?PPTK_NIP}}NIP. {{PPTK_NIP|nip}}{{/PPTK_NIP}}</td></tr>
</table>`);

  const BASTP = wrap(kop + judul('BERITA ACARA SERAH TERIMA HASIL PEKERJAAN (BASTP)', 'Nomor : {{NOMOR_BASTP}}') + `
<p style="margin:0 0 4pt;text-align:justify">Pada hari ini <b>{{HARI}}</b> tanggal <b>{{TGL_TERBILANG|judul}}</b> bulan <b>{{BULAN}}</b> Tahun <b>{{TAHUN_TERBILANG|judul}}</b> yang bertanda tangan di bawah ini :</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 8pt">
<tr><td style="${NB};width:18pt">1.</td><td style="${NB};width:96pt">Nama Penyedia</td><td style="${NB};width:8pt">:</td><td style="${NB}">{{NAMA_PENYEDIA}}</td></tr>
<tr><td style="${NB}"></td><td style="${NB}">Nama Pimpinan</td><td style="${NB}">:</td><td style="${NB}">{{NAMA_PIMPINAN}}</td></tr>
<tr><td style="${NB}"></td><td style="${NB}">Jabatan</td><td style="${NB}">:</td><td style="${NB}">{{JABATAN_PIMPINAN}}</td></tr>
<tr><td style="${NB}"></td><td style="${NB}">Alamat</td><td style="${NB}">:</td><td style="${NB}">{{ALAMAT_PENYEDIA}}</td></tr>
<tr><td style="${NB}"></td><td colspan="3" style="${NB}">Dalam hal ini selaku <b><i>Pihak Pertama.</i></b></td></tr>
<tr><td style="${NB};padding-top:8pt">2.</td><td style="${NB};padding-top:8pt">Nama</td><td style="${NB};padding-top:8pt">:</td><td style="${NB};padding-top:8pt">{{NAMA_PPK}}</td></tr>
<tr><td style="${NB}"></td><td style="${NB}">NIP</td><td style="${NB}">:</td><td style="${NB}">{{NIP_PPK}}</td></tr>
<tr><td style="${NB}"></td><td style="${NB}">Jabatan</td><td style="${NB}">:</td><td style="${NB}">{{JABATAN_PPK}}</td></tr>
<tr><td style="${NB}"></td><td colspan="3" style="${NB}">Dalam hal ini selaku <b><i>Pihak Kedua.</i></b></td></tr></table>
<p style="margin:0 0 4pt">Dengan ini menyatakan dengan sebenarnya bahwa :</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 4pt">
<tr><td style="${NB};width:18pt">1.</td><td style="${NB};text-align:justify"><b><i>PIHAK KEDUA</i></b> telah melakukan pemeriksaan hasil pekerjaan pengadaan barang/jasa yang dilaksanakan oleh <b><i>PIHAK PERTAMA</i></b> sesuai dengan ketentuan yang tercantum dalam Surat Pesanan Nomor : {{NOMOR_SP}} Tanggal {{TANGGAL_SP}} Senilai Rp {{TOTAL}} ({{TOTAL_TERBILANG}}).</td></tr>
<tr><td style="${NB}">2.</td><td style="${NB};text-align:justify">Berdasarkan hasil pemeriksaan sebagaimana klausul nomor 1, <b><i>PIHAK PERTAMA menyerahkan</i></b> hasil pekerjaan pengadaan barang/jasa kepada Pejabat Pembuat Komitmen (PPK) dan Pejabat Pembuat Komitmen (PPK) telah menerima hasil pekerjaan pengadaan Barang/Jasa dari <b><i>PIHAK PERTAMA</i></b>.</td></tr></table>
<p style="margin:0 0 14pt;text-align:justify">Demikian berita acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
<table style="width:100%;border-collapse:collapse;text-align:center">
<tr><td style="${NB};width:50%"></td><td style="${NB};text-align:center">{{RS_KOTA}}, {{TANGGAL_BAPB}}</td></tr>
<tr><td style="${NB};text-align:center">Pihak Pertama<br>Penyedia :<br>{{NAMA_PENYEDIA}}</td><td style="${NB};text-align:center">Pihak Kedua<br>Pejabat Pembuat Komitmen (PPK)<br>{{RS_NAMA_DOK}}</td></tr>
<tr><td style="${NB};text-align:center;height:58pt">{{TTD_PENYEDIA}}</td><td style="${NB};text-align:center">{{TTD_PPK}}</td></tr>
<tr><td style="${NB};text-align:center"><u>{{NAMA_PIMPINAN}}</u><br>{{JABATAN_PIMPINAN}}</td><td style="${NB};text-align:center"><u>{{NAMA_PPK}}</u><br>Nip. {{NIP_PPK}}</td></tr></table>`);

  const INVOICE = wrap(`<table style="width:100%;border-collapse:collapse"><tr>
<td style="${NB};padding:0"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15pt;font-weight:bold">{{NAMA_PENYEDIA|kapital}}</p>
<p style="margin:0;font-size:9.5pt">{{ALAMAT_PENYEDIA}}</p><p style="margin:0;font-size:9.5pt">Telp. {{TELEPON_PENYEDIA}} · {{EMAIL_PENYEDIA}}</p><p style="margin:0;font-size:9.5pt">NPWP {{NPWP_PENYEDIA}}</p></td>
<td style="${NB};width:150pt;text-align:right;vertical-align:middle;padding:0"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22pt;font-weight:bold;letter-spacing:2pt">INVOICE</p><p style="margin:0;font-size:10pt">Tagihan Pembayaran</p></td></tr></table>
<p style="margin:3pt 0 10pt;border-top:3pt double #000;font-size:2pt;line-height:2pt">&nbsp;</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 10pt"><tr>
<td style="${NB};width:52%">Kepada Yth.<br><b>Pejabat Pembuat Komitmen (PPK)</b><br>{{RS_NAMA_DOK}}<br>{{KOP_ALAMAT}}</td>
<td style="${NB}"><table style="width:100%;border-collapse:collapse">
<tr><td style="${NB};width:76pt">No. Invoice</td><td style="${NB};width:6pt">:</td><td style="${NB}"><b>{{NOMOR_INVOICE}}</b></td></tr>
<tr><td style="${NB}">Tanggal</td><td style="${NB}">:</td><td style="${NB}">{{TANGGAL_INVOICE}}</td></tr>
<tr><td style="${NB}">Jatuh Tempo</td><td style="${NB}">:</td><td style="${NB}">{{JATUH_TEMPO}}</td></tr>
<tr><td style="${NB}">No. SP</td><td style="${NB}">:</td><td style="${NB}">{{NOMOR_SP}}</td></tr>
<tr><td style="${NB}">No. BAPB</td><td style="${NB}">:</td><td style="${NB}">{{NOMOR_BAPB}}</td></tr>
<tr><td style="${NB}">No. e-Faktur</td><td style="${NB}">:</td><td style="${NB}">{{NO_FAKTUR|bawaan:-}}</td></tr></table></td></tr></table>
<p style="margin:0 0 6pt;text-align:justify">Dengan hormat, bersama ini kami sampaikan tagihan atas pekerjaan <b>{{PEKERJAAN}}</b> sesuai Surat Pesanan dan Berita Acara Penerimaan Barang tersebut di atas, dengan rincian sebagai berikut:</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 6pt">
<tr><td style="${TH};width:24pt">No</td><td style="${TH}">Uraian Barang/ Jasa</td><td style="${TH};width:46pt">Volume</td><td style="${TH};width:46pt">Satuan</td><td style="${TH};width:78pt">Harga Satuan</td><td style="${TH};width:86pt">Jumlah</td></tr>
<tr><td style="${BD};text-align:center">{{#ITEM}}{{ITEM.NO}}</td><td style="${BD}">{{ITEM.URAIAN}}</td><td style="${BD};text-align:center">{{ITEM.VOLUME}}</td><td style="${BD};text-align:center">{{ITEM.SATUAN}}</td><td style="${BD};text-align:right">{{ITEM.HARGA}}</td><td style="${BD};text-align:right">{{ITEM.JUMLAH}}</td></tr>
<tr><td colspan="5" style="${BD};text-align:right;font-weight:bold">Jumlah (DPP)</td><td style="${BD};text-align:right;font-weight:bold">{{JUMLAH}}</td></tr>
<tr><td colspan="5" style="${BD};text-align:right;font-weight:bold">PPN {{PPN_PERSEN}}%</td><td style="${BD};text-align:right;font-weight:bold">{{PPN}}</td></tr>
<tr><td colspan="5" style="${BD};text-align:right;font-weight:bold">Total Tagihan</td><td style="${BD};text-align:right;font-weight:bold">{{TOTAL}}</td></tr></table>
<p style="margin:0 0 6pt"><i>Terbilang: {{TOTAL_TERBILANG}}</i></p>
<table style="width:100%;border-collapse:collapse;margin:0 0 8pt;font-size:10pt"><tr><td style="${BD}">Potongan oleh Bendahara BLUD (wajib pungut): PPN Rp {{PPN}} · PPh 22 ({{PPH22_PERSEN}}%) Rp {{PPH22}} → <b>Netto ditransfer Rp {{NETTO}}</b></td></tr></table>
<p style="margin:0 0 14pt">Pembayaran mohon ditransfer ke rekening <b>{{BANK}}</b> nomor <b>{{NO_REKENING}}</b> atas nama <b>{{NAMA_REKENING}}</b>.</p>
<table style="width:100%;border-collapse:collapse;text-align:center">
<tr><td style="${NB};width:50%;text-align:center">Setuju dibayar,<br>Pejabat Pembuat Komitmen (PPK)</td><td style="${NB};text-align:center">{{TANGGAL_INVOICE}}<br>Hormat kami,<br>{{NAMA_PENYEDIA}}</td></tr>
<tr><td style="${NB};text-align:center;height:58pt">{{TTD_PPK}}</td><td style="${NB};text-align:center">{{TTD_PENYEDIA}}</td></tr>
<tr><td style="${NB};text-align:center"><u>{{NAMA_PPK}}</u><br>NIP. {{NIP_PPK|nip}}</td><td style="${NB};text-align:center"><u>{{TTD_NAMA}}</u><br>{{TTD_JABATAN}}</td></tr></table>`);
  return { PO, BAPB, BASTP, INVOICE };
})();

/* ---------- Gambar (TTD & logo): cache perangkat + endpoint 'images' ---------- */
const DocImg = (() => {
  const mem = {};
  const LS = 'vms_img_';
  const get = id => { if (mem[id]) return mem[id]; try { const v = localStorage.getItem(LS + id); if (v) return (mem[id] = v); } catch (e) { } return null; };
  async function load(ids) {
    ids = [...new Set(ids.filter(Boolean))];
    const miss = ids.filter(id => !get(id));
    if (miss.length) {
      try {
        const r = await API.call('images', { ids: miss }, { timeout: 45000 });
        Object.keys(r.data || {}).forEach(id => { mem[id] = r.data[id]; try { localStorage.setItem(LS + id, r.data[id]); } catch (e) { } });
      } catch (e) { console.warn('Gagal memuat gambar TTD:', e.message); }
    }
    const out = {}; ids.forEach(id => { const v = get(id); if (v) out[id] = v; }); return out;
  }
  function forget(id) { delete mem[id]; try { localStorage.removeItem(LS + id); } catch (e) { } }
  return { load, get, forget, put: (id, url) => { mem[id] = url; try { localStorage.setItem(LS + id, url); } catch (e) { } } };
})();
const DEFAULT_LOGO = () => new URL('assets/logo-rs.png', location.href).href;

/* ---------- Renderer HTML ({{...}} semantik sama dengan DocEngine.gs) ---------- */
const DocRender = (() => {
  const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])).replace(/\n/g, '<br>');
  const rowRe = /<tr\b[^>]*>(?:(?!<\/tr>)[\s\S])*?\{\{\s*#\s*([A-Za-z0-9_]+)\s*\}\}[\s\S]*?<\/tr>/g;
  function rows(html, ctx) {
    return html.replace(rowRe, (tr, key) => {
      const list = (ctx.ROWS || {})[key.toUpperCase()] || [];
      return list.map((it, i) => tr.replace(DC.TOKEN, (m, j, k, mods) => {
        k = k.toUpperCase();
        if (j === '#') return '';
        if (k === 'NO') return String(i + 1);
        if (k.indexOf(key.toUpperCase() + '.') === 0) { const f = k.slice(key.length + 1); return escH(DC.modify(it[f], (it._raw || {})[f] !== undefined ? it._raw[f] : it[f], mods)); }
        return m;
      })).join('');
    });
  }
  /** opt: { images: {fileId: dataUrl}, mapping, manual } */
  function render(html, ctx, opt = {}) {
    let out = rows(html, ctx);
    const val = k => DC.value(ctx, k, opt.mapping, opt.manual);
    // blok bersyarat {{?X}}…{{/X}}
    out = out.replace(/\{\{\s*\?\s*([A-Za-z0-9_.]+)\s*\}\}([\s\S]*?)\{\{\s*\/\s*\1\s*\}\}/g, (m, k, inner) => String(val(k.toUpperCase()).d || '').trim() ? inner : '');
    return out.replace(DC.TOKEN, (m, j, k, mods) => {
      k = k.toUpperCase();
      if (j) return '';
      if (DC.IMAGE_KEYS[k]) {
        const id = ctx.IMG[k], lw = /lebar\s*:\s*(\d+)/.exec(mods || ''), w = lw ? +lw[1] : (k === 'LOGO' ? 62 : 120);
        const src = k === 'LOGO' ? (id && opt.images && opt.images[id]) || DEFAULT_LOGO() : id && opt.images && opt.images[id];
        if (src) return `<img src="${src}" alt="" style="max-width:${w}pt;max-height:${k === 'LOGO' ? 78 : 58}pt;width:auto;height:auto;vertical-align:middle">`;
        return k === 'LOGO' ? '' : '<span style="display:inline-block;height:46pt"></span>';
      }
      if (k.indexOf('.') > 0) return '';
      const v = val(k); return escH(DC.modify(v.d, v.r, mods));
    });
  }
  return { render, escH };
})();

/* ---------- Data dokumen dari Store (lokal, instan) ---------- */
const Doc = (() => {
  const S = Store.S;
  function refs(jenis, id) {
    jenis = DC.normJenis(jenis);
    let po = null, bast = null, inv = null;
    if (jenis === 'PO') po = Store.po(id);
    if (jenis === 'BAPB' || jenis === 'BASTP') { bast = Store.byId('bast', id); po = bast && Store.po(bast.po_id); }
    if (jenis === 'INVOICE') { inv = Store.byId('invoice', id); bast = inv && Store.byId('bast', inv.bast_id); po = inv && Store.po(inv.po_id); }
    return { jenis, po, bast, inv };
  }
  function ctx(jenis, id, ttd) {
    const r = refs(jenis, id); if (!r.po) return null;
    return DC.build({ jenis: r.jenis, settings: S.settings, po: r.po, poItems: Store.poItems(r.po.id), vendor: Store.vendor(r.po.vendor_id) || {}, bast: r.bast, bastItems: r.bast ? Store.bastItems(r.bast.id) : [], inv: r.inv, users: S.users, ttd });
  }
  function activeTpl(jenis) { return S.templates.find(t => DC.normJenis(t.jenis) === DC.normJenis(jenis) && t.status === 'Aktif'); }
  function pageCss() {
    const a4 = String(S.settings.KERTAS || 'F4').toUpperCase() === 'A4';
    return `@page{size:${a4 ? '210mm 297mm' : '215mm 330mm'};margin:12mm 15mm 12mm 20mm}html,body{margin:0;background:#fff}body{padding:0}img{image-rendering:auto}table{page-break-inside:auto}tr{page-break-inside:avoid}
      @media screen{body{padding:14mm 15mm 14mm 20mm;width:${a4 ? 210 : 215}mm;box-sizing:border-box;min-height:${a4 ? 297 : 330}mm}}`;
  }
  async function html(jenis, id, ttd) {
    const c = ctx(jenis, id, ttd); if (!c) return null;
    const ids = Object.values(c.IMG).filter(Boolean);
    const images = await DocImg.load(ids);
    return { ctx: c, html: DocRender.render(DOC_TPL[c.jenis], c, { images }) };
  }
  function frameDoc(inner, title) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${DocRender.escH(title || 'Dokumen')}</title><style>${pageCss()}</style></head><body>${inner}</body></html>`;
  }
  function mount(iframe, inner, title) {
    iframe.srcdoc = frameDoc(inner, title);
    iframe.onload = () => { try { const d = iframe.contentDocument; const h = d.documentElement.scrollHeight; iframe.style.height = h + 'px'; fit(iframe); } catch (e) { } };
  }
  function fit(iframe) {
    const box = iframe.parentElement; if (!box) return;
    const w = box.clientWidth - 2, natural = iframe.offsetWidth || 812;
    const s = Math.min(1, w / natural);
    iframe.style.transform = `scale(${s})`; iframe.style.transformOrigin = 'top left';
    box.style.height = (iframe.offsetHeight * s + 4) + 'px';
  }
  function docNo(c) { return c.D.NOMOR || c.D.NOMOR_SP || 'Dokumen'; }

  /** Dialog pratinjau + cetak/PDF. jenis: PO | BAPB | BASTP | INVOICE */
  async function open(jenis, id) {
    jenis = DC.normJenis(jenis);
    const base = ctx(jenis, id); if (!base) { UI.toast('Data dokumen tidak ditemukan', 'err'); return; }
    const mode = S.settings.TTD_MODE === 'basah' ? 'basah' : 'gambar';
    const on = {}; base.signers.forEach(s => on[s.key] = mode !== 'basah');
    const tpl = activeTpl(jenis), custom = tpl && String(tpl.is_default) !== '1';
    const canGen = can('genDoc') && !!tpl;
    const m = UI.modal({
      title: UI.icon('print') + ' ' + DOC_LABEL[jenis], sub: DocRender.escH(docNo(base)), size: 'xl',
      body: `<div class="doc-opts"><div class="doc-ttd"><b class="small">Tanda tangan:</b>${base.signers.map(s => `<label class="check small"><input type="checkbox" data-sk="${s.key}" ${on[s.key] ? 'checked' : ''} ${s.fileId ? '' : 'disabled'}><span>${DocRender.escH(s.label)}${s.fileId ? '' : ' <span class="muted">(belum ada TTD / belum disahkan)</span>'}</span></label>`).join('')}
        <span class="xs muted">Tidak dicentang = tempat dikosongkan untuk <b>TTD basah</b>.</span></div>
        ${custom ? `<div class="info-box mt-s">${UI.icon('info')}<span>Template aktif memakai <b>desain kustom</b> (${DocRender.escH(tpl.nama)}). Pratinjau di bawah adalah format bawaan; gunakan <b>PDF dari Template</b> untuk desain kustom.</span></div>` : ''}</div>
        <div class="doc-preview"><iframe class="doc-frame" title="Pratinjau dokumen"></iframe></div>`,
      foot: `<span class="xs muted doc-hint">Pilih "Simpan sebagai PDF" pada dialog cetak untuk mengunduh PDF.</span><span class="spacer"></span>${canGen ? `<button class="btn btn-outline" data-gen>${UI.icon('doc')} PDF dari Template (Drive)</button>` : ''}<button class="btn" data-print>${UI.icon('print')} Cetak / Simpan PDF</button>`
    });
    const frame = m.q('.doc-frame');
    const ttdOpt = () => { const o = {}; base.signers.forEach(s => o[s.key] = !!on[s.key]); return o; };
    const draw = async () => { const r = await html(jenis, id, ttdOpt()); if (r && document.body.contains(m.el)) mount(frame, r.html, docNo(r.ctx)); };
    m.qa('[data-sk]').forEach(cb => cb.onchange = () => { on[cb.dataset.sk] = cb.checked; draw(); });
    m.q('[data-print]').onclick = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { UI.toast('Cetak gagal: ' + e.message, 'err'); } };
    if (canGen) m.q('[data-gen]').onclick = async e => { const b = e.currentTarget; UI.busy(b, true); await genDocument(jenis, id, { ttd: ttdOpt() }); UI.busy(b, false); };
    window.addEventListener('resize', () => fit(frame));
    frame.srcdoc = frameDoc('<p style="font-family:sans-serif;color:#777;padding:40px">Menyiapkan dokumen…</p>');
    draw();
  }
  /** Pratinjau tertanam (mis. layar Approval) */
  async function embed(el, jenis, id) {
    el.innerHTML = '<div class="doc-preview"><iframe class="doc-frame" title="Pratinjau"></iframe></div>';
    const r = await html(jenis, id);
    const fr = el.querySelector('.doc-frame'); if (r && fr) mount(fr, r.html, docNo(r.ctx));
  }
  /** HTML bawaan untuk dipasang sebagai Google Docs (dibungkus dokumen lengkap) */
  function installPayload() {
    const out = {}; Object.keys(DOC_TPL).forEach(k => out[k] = `<!doctype html><html><head><meta charset="utf-8"></head><body>${DOC_TPL[k]}</body></html>`);
    return out;
  }
  async function logoDataUrl() {
    try { const b = await (await fetch(DEFAULT_LOGO())).blob(); return await UI.readB64(b); } catch (e) { return ''; }
  }
  return { ctx, html, open, embed, activeTpl, installPayload, logoDataUrl, refs, fit };
})();
Act['doc.open'] = el => Doc.open(el.dataset.jenis, el.dataset.id);
