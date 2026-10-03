# VMS RSUD HAMBA — Frontend v1.1

Vendor Management System (Surat Pesanan → Approval PPK → BAPB → Invoice & SP2D) — HTML/CSS/JS vanilla, backend Google Apps Script (REST JSON).

- Satu-satunya file yang perlu diedit: `js/config.js` → isi `GAS_URL` dengan URL `/exec` Apps Script.
- Deploy: push isi folder ini (dengan `index.html` di root) ke GitHub Pages / Netlify / Vercel.
- Panduan lengkap: `PANDUAN-INSTALASI.md`.

Struktur:
- `index.html` · `css/style.css` · `assets/logo-rs.png` (logo kop bawaan)
- `templates/` — file Word template bawaan (SP, BAPB, BAST Hasil Pekerjaan, Invoice) + `Referensi_Penanda_Template.docx`; dipakai tombol *Pasang Template Bawaan* dan bisa diunduh Admin
- `js/config.js, ui.js, store.js, api.js, app.js`
- `js/doc-format.js` — format bawaan SP / BAPB / BAST Hasil Pekerjaan / Invoice + pratinjau & cetak PDF (dibangkitkan oleh `build.sh` dari paket sumber pengembang; untuk mengubah desain cukup lewat Kelola Template → Google Docs)
- `js/pages-utama.js` (dashboard, vendor, SP) · `js/pages-transaksi.js` (approval, BAPB, invoice) · `js/pages-admin.js` (template, laporan, pengaturan, Dokumen & TTD) · `js/pages-notif.js` (WhatsApp & notifikasi, CRM)
