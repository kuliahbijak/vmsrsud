# Panduan Instalasi — VMS RSUD HAMBA v1.1

**Vendor Management System** · Frontend di GitHub Pages · Backend Google Apps Script (REST API JSON) · Database Google Sheets · Berkas Google Drive · Template Google Docs

> **Yang baru di v1.1:** format bawaan **Surat Pesanan (SP)**, **BAPB / Surat Penerimaan Barang**, **BAST Hasil Pekerjaan** dan **Invoice** yang langsung bisa dicetak/PDF dan bisa diubah desainnya di Google Docs · tanda tangan **gambar PNG** atau **TTD basah** (menggantikan teks hijau "VALIDATED/DISETUJUI") · BAPB ditandatangani **Penanggung Jawab Ruangan / Penerima** · invoice bertanda tangan · modul **WhatsApp (Fonnte) & CRM Kontak** · tampilan HP (navigasi bawah) · modul Kontrak dihapus.

---

## 0. Isi paket

| Berkas | Untuk apa | Cara pakai |
|---|---|---|
| `Kode.gs` | Router API, login & RBAC, data layer + cache, setup | Tempel ke editor Apps Script |
| `Modul.gs` | Vendor, Surat Pesanan, Approval, BAPB, Invoice, TTD spesimen, notifikasi | Tempel ke editor Apps Script |
| `DocEngine.gs` | Mesin dokumen (gas-doc-engine): template Google Docs → PDF, pasang template bawaan | Tempel ke editor Apps Script |
| `Notifikasi.gs` | Antrean WhatsApp (Fonnte) + Email, blast per batch, deteksi nomor WA | Tempel ke editor Apps Script |
| `CRM.gs` | CRM Kontak (sinkron, tag, opt-out, gabung duplikat, riwayat) | Tempel ke editor Apps Script |
| `Migrasi.gs` | Import/migrasi, backup, restore, trigger, data demo | Tempel ke editor Apps Script |
| `appsscript.json` | Manifest (zona waktu, izin, pengaturan web app) | Tempel ke editor Apps Script |
| `vms-rsud-hamba-frontend.zip` | Tampilan web (index.html, css/, js/, assets/) | Diekstrak, lalu di-push ke GitHub Pages |

> Berkas `.gs` **tidak** ikut masuk ZIP. Isi ZIP adalah **root repository**: `index.html` langsung di paling atas.

---

## ⬆️ Upgrade dari v1.0 (data lama tetap aman)

1. **Backup dulu**: *Pengaturan Sistem → Backup & Restore → Buat Backup*.
2. Di editor Apps Script: ganti isi `Kode`, `Modul`, `Migrasi` dan `appsscript.json` dengan versi baru, lalu **tambahkan 3 file skrip baru**: `DocEngine`, `Notifikasi`, `CRM` (klik **+** → *Skrip*, beri nama persis, tempel isinya).
3. Simpan, pilih fungsi **`setupAppEnvironment`** → ▶ **Jalankan**. Ini mode perbaikan: hanya menambah sheet baru (`Penerima`, `AntrianNotif`, `BlastWA`, `CRM_Kontak`, `CRM_Interaksi`), kolom baru, folder `🔒 TTD_Spesimen`, dan pengaturan baru. **Tidak ada data yang dihapus.**
4. Google akan meminta **izin baru** ("Terhubung ke layanan eksternal" — dipakai untuk mengimpor template bawaan ke Google Docs dan mengirim WhatsApp via Fonnte). Klik *Tinjau izin* → **Izinkan**.
5. Jalankan **`installTriggers`** sekali (atau *Pengaturan Sistem → Backup & Restore → Pasang Ulang Trigger*).
6. **Deploy → Kelola deployment → ✏️ → Versi: Versi baru → Deploy** (URL `/exec` tetap sama).
7. Frontend: ganti seluruh isi repo GitHub Pages dengan isi ZIP baru (**pertahankan `js/config.js` lama** atau isi ulang `GAS_URL`) → `git add . && git commit -m "v1.1" && git push`. Pengguna cukup memuat ulang (Ctrl+Shift+R); cache lokal lama dibuang otomatis.
8. Lanjutkan ke **bagian 4 (Dokumen & TTD)** dan **bagian 6 (WhatsApp & CRM)**.

Catatan upgrade:
- Data sheet `Kontrak` lama **tidak dihapus** dari spreadsheet — hanya modulnya yang tidak lagi tampil.
- Nama sheet internal `BAST` / `BAST_Detail` tetap; di aplikasi tampil sebagai **BAPB**. Nomor BAPB lama tetap, nomor baru mengikuti format di *Dokumen & TTD*.
- Template Google Docs v1.0 (placeholder `[NAMA]`) tetap berfungsi. Template berjenis `BAST` otomatis dibaca sebagai `BAPB`.

---

## 1. Backend — Google Apps Script (± 10 menit)

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `VMS RSUD HAMBA API`.
   - Gunakan akun Google **milik instansi** yang akan menjadi pemilik database dan folder Drive.
2. Buat 6 file skrip, lalu tempel isinya:
   - Ganti nama `Code.gs` → `Kode` → tempel isi **Kode.gs**
   - Klik **+** → *Skrip* → `Modul` → tempel **Modul.gs**
   - Klik **+** → *Skrip* → `DocEngine` → tempel **DocEngine.gs**
   - Klik **+** → *Skrip* → `Notifikasi` → tempel **Notifikasi.gs**
   - Klik **+** → *Skrip* → `CRM` → tempel **CRM.gs**
   - Klik **+** → *Skrip* → `Migrasi` → tempel **Migrasi.gs**
3. Tampilkan manifest: ⚙️ **Setelan proyek** → centang *Tampilkan file manifes "appsscript.json"* → buka `appsscript.json` → ganti seluruh isinya dengan **appsscript.json**.
4. Klik 💾 Simpan.
5. Pilih fungsi **`setupAppEnvironment`** di dropdown → ▶ **Jalankan** → *Tinjau izin* → pilih akun → *Lanjutan* → *Buka (tidak aman)* → **Izinkan**.
6. Buka **Log eksekusi**. Catat baris:
   ```
   👤 Akun ADMIN dibuat → email: ... | password sementara: ...
   ```
   Setup otomatis membuat:
   - Folder `📁 VMS_RSUD_HAMBA` (subfolder Vendor, Dokumen_Generate, Backup_Database, Exports, Template_Docs, 🔒 TTD_Spesimen)
   - Spreadsheet `🗃️ Database — VMS RSUD HAMBA` dengan seluruh sheet (termasuk Penerima, AntrianNotif, BlastWA, CRM_Kontak, CRM_Interaksi)
   - 5 trigger otomatis (antrean WhatsApp/email + sinkron CRM 1 mnt, pemanasan cache 10 mnt, backup harian, housekeeping, invalidasi cache saat sheet diedit manual)
   > `setupAppEnvironment()` **aman dijalankan ulang**: bila database sudah ada, ia hanya melengkapi sheet/kolom yang hilang (mode perbaikan).
7. *(Opsional, untuk UAT/pelatihan)* Jalankan **`seedDemoData`** sekali. Akun demo (password `Demo#2026`):
   `admin.demo@rsudhamba.id`, `ppk.demo@rsudhamba.id`, `pengadaan.demo@rsudhamba.id`, `pptk.demo@rsudhamba.id`. Nama rekanan demo seluruhnya fiktif. **Jangan jalankan di produksi.**
8. **Deploy** → **Deployment baru** → ikon ⚙️ → **Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   - Klik **Deploy** → salin **URL aplikasi web** (berakhiran `/exec`).
9. Uji di browser: buka `URL/exec` → harus tampil JSON `{"success":true,"app":"VMS RSUD HAMBA",...,"ready":true}`.

> **Setiap kali kode .gs diubah**: Deploy → *Kelola deployment* → ✏️ → Versi: **Versi baru** → Deploy. URL tetap sama.

---

## 2. Frontend — GitHub Pages

1. Ekstrak `vms-rsud-hamba-frontend.zip`. Anda akan mendapat folder berisi **`index.html`, `css/`, `js/`, `README.md`**.
   **Folder inilah yang di-`git init`** — jangan naik satu level, jangan masuk lebih dalam.
2. Edit `js/config.js` → ganti `GAS_URL` dengan URL `/exec` dari langkah 1.8.
3. Buat repository **Public** baru di GitHub (tanpa README).
4. Dari terminal di folder tersebut:
   ```bash
   dir            # (Mac/Linux: ls) → pastikan index.html terlihat di sini
   git init
   git add .
   git commit -m "Upload pertama VMS"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
   Saat diminta password, tempel **Personal Access Token** (github.com/settings/tokens → *classic* → centang `repo`). Layar memang tidak menampilkan karakter apa pun — itu normal.
5. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / `(root)` → **Save**. Centang **Enforce HTTPS**.
6. Tunggu 1–2 menit → buka `https://USERNAME.github.io/NAMA-REPO/`.
7. Login dengan akun ADMIN dari Log eksekusi → Anda akan diminta **mengganti password**.
8. Masuk **Pengaturan Sistem → Pengaturan Aplikasi**: isi identitas RS, nama/NIP PPK & Pejabat Pengadaan, dan **URL aplikasi** (alamat GitHub Pages, dipakai di email/WA notifikasi).
9. Masuk **Pengaturan Sistem → Dokumen & TTD**: periksa kop surat, logo, format nomor, dan mode tanda tangan (bagian 4).

**Update tampilan berikutnya:** `git add .` → `git commit -m "update"` → `git push`. Jika browser masih menampilkan versi lama: **Ctrl+Shift+R**.

> Tidak memakai GitHub? Folder yang sama bisa di-*drag & drop* ke Netlify Drop atau Vercel.

> Aplikasi responsif: di HP muncul **navigasi bawah** (Dashboard · SP · Approval/BAPB · Invoice · Menu), tabel berubah menjadi kartu, dialog muncul dari bawah layar.

---

## 3. Langkah awal setelah online

1. **Pengaturan Sistem → Pengguna & Role** → tambah akun PPK, Pejabat Pengadaan, PPTK (password sementara dikirim ke email/WA masing-masing).
2. **Pengaturan Sistem → Dokumen & TTD** → kop, logo, format nomor, master **Penanggung Jawab Ruangan**, spesimen TTD pejabat (bagian 4).
3. **Daftar Vendor → Tambah Vendor Baru** → akun Portal Rekanan dibuat otomatis dari email vendor. Kartu *5. Tanda Tangan Pimpinan* untuk TTD invoice/BASTP. Data banyak: **Import CSV**.
4. **Surat Pesanan → Master Barang/Jasa** → isi/import master barang beserta **Harga HPS**.
5. *(Opsional)* **WhatsApp & Notifikasi → Konfigurasi** → token Fonnte (bagian 6).

---

## 4. Dokumen: SP · BAPB · BAST Hasil Pekerjaan · Invoice

### 4.1 Alur & penanda tangan

| Dokumen | Dibuat dari | Penanda tangan | Kapan TTD PPK muncul |
|---|---|---|---|
| **Surat Pesanan (SP)** | Surat Pesanan (PO) | PPK | setelah SP disetujui PPK |
| **BAPB / Surat Penerimaan Barang** | Form *Penerimaan Barang (BAPB)* | **Penanggung Jawab Ruangan / Penerima** · Mengetahui **PPTK** | — |
| **BAST Hasil Pekerjaan (BASTP)** | BAPB yang disahkan (otomatis bernomor) | Penyedia (Pihak Pertama) · PPK (Pihak Kedua) | setelah BAPB disahkan |
| **Invoice / Tagihan** | Invoice | Penyedia (penagih) · "Setuju dibayar" PPK | setelah invoice disetujui |

Isian baru di form SP: **Kegiatan, Sub Kegiatan, Kode Rekening, Waktu Penyelesaian (hari), Tanggal barang diterima, Alamat pengiriman** (bawaan diatur di *Dokumen & TTD*).

### 4.2 Mencetak / menyimpan PDF (tanpa setup)

Tombol **Cetak SP / PDF**, **Cetak BAPB / PDF**, **Cetak BAST Hasil Pekerjaan**, **Cetak Invoice / PDF** membuka pratinjau dokumen (kertas F4/A4) berisi data yang sudah diinput:
- Centang/hapus centang tiap penanda tangan: **dicentang = TTD gambar dibubuhkan**, **tidak dicentang = tempat dikosongkan untuk TTD basah**.
- **Cetak / Simpan PDF** → pada dialog cetak pilih *Simpan sebagai PDF* (atau langsung ke printer). Atur margin "Default" dan matikan "Header & footer" bila muncul.
- **PDF dari Template (Drive)** (bila template Google Docs aktif) → PDF resmi tersimpan di folder rekanan/SP di Google Drive.

### 4.3 Tanda tangan gambar (PNG) atau TTD basah

- *Dokumen & TTD → Mode tanda tangan*: **TTD gambar** (bawaan) atau **Dikosongkan — TTD basah**. Teks hijau "VALIDATED/DISETUJUI" tidak dipakai lagi.
- **Spesimen pejabat**: tiap PPK/PPTK membuka menu profil (pojok kanan atas) → **TTD Saya** → gambar di layar atau unggah foto/scan (latar putih otomatis dibuat transparan). Admin juga bisa mengatur di *Dokumen & TTD → Spesimen TTD Pejabat*.
- **Penanggung Jawab Ruangan**: master di *Dokumen & TTD* (nama, NIP, jabatan, ruangan, spesimen TTD). Saat input BAPB, pilih penerima → TTD tersimpan / gambar di layar / unggah PNG / kosongkan. Penerima baru bisa langsung disimpan ke master.
- **Rekanan**: TTD pimpinan di form vendor atau saat membuat invoice (bisa disimpan sebagai spesimen).
- File TTD disimpan di folder privat `🔒 TTD_Spesimen` dan hanya dikirim ke pengguna yang berhak melihat dokumennya. TTD pada dokumen yang sudah disahkan **dibekukan** (mengganti spesimen tidak mengubah dokumen lama).

### 4.4 Mengubah desain (custom) — gas-doc-engine

1. **Kelola Template → Pasang Template Bawaan** → 4 Google Docs (SP, BAPB, BASTP, Invoice) dibuat di `📂 Template_Docs` dan langsung aktif.
2. Klik **Edit desain** → ubah tata letak, teks, tabel, logo sesuka hati di Google Docs. **Pertahankan penanda** `{{...}}`.
3. Kembali ke **Kelola Template → Scan Ulang → Mapping → Simpan & Aktifkan**.
4. Selanjutnya tombol **PDF dari Template (Drive)** memakai desain tersebut.

Penanda yang tersedia (lengkap: tombol **Daftar Penanda**):

```
{{NOMOR_SP}} {{TANGGAL_SP|tanggal}} {{NAMA_PENYEDIA}} {{KEGIATAN}} {{KODE_REKENING}}
{{TOTAL|rupiah}} {{TOTAL_TERBILANG}} {{NAMA_PPK}} {{NIP_PPK|nip}} {{TTD_PPK|lebar:120}}
{{NOMOR_BAPB}} {{PENERIMA_NAMA}} {{RUANGAN}} {{TTD_PENERIMA}} {{TTD_PPTK}}
{{NOMOR_BASTP}} {{TTD_PENYEDIA}} {{NOMOR_INVOICE}} {{NETTO|rupiah}} {{LOGO|lebar:62}}
```

- **Baris barang**: buat satu baris tabel berisi `{{ITEM.NO}} {{ITEM.URAIAN}} {{ITEM.VOLUME}} {{ITEM.SATUAN}} {{ITEM.HARGA}} {{ITEM.JUMLAH}}` — baris diulang otomatis per barang.
- **Bagian bersyarat**: `{{?NO_FAKTUR}} … {{/NO_FAKTUR}}` hanya tampil bila ada nilainya.
- **Pengubah**: `|rupiah` `|terbilang:rupiah` `|tanggal` `|kapital` `|nip` `|bawaan:-` `|lebar:120`.
- Penanda yang tidak dikenal sistem → mapping **Input manual saat generate** (ditanyakan saat membuat PDF).
- Template kustom milik sendiri: **Template Kustom** → tempel URL Google Docs → **Scan Penanda**. Format lama `[NAMA_PLACEHOLDER]` tetap didukung.
- Hapus template kustom kapan saja — dokumen tetap bisa dicetak dengan format bawaan.

---

## 5. Backup & Restore

| Fitur | Keterangan |
|---|---|
| Backup otomatis harian | Salinan spreadsheet di `📂 Backup_Database`, jam diatur di *Pengaturan Aplikasi* (default 01:00 WIB), menyimpan 30 salinan terakhir |
| Backup manual | *Pengaturan Sistem → Backup & Restore → Buat Backup* |
| Backup pra-aksi | Dibuat otomatis sebelum setiap **Import** dan **Restore** |
| Restore | Pilih backup → pratinjau jumlah baris → pilih sheet → *Restore Sekarang*. Isi sheet **diganti** dengan isi backup; ID folder/konfigurasi environment tidak ikut ditimpa |
| Export JSON | Seluruh tabel dalam satu file (tanpa hash password), tersimpan di Drive & diunduh |

Membatalkan restore: restore lagi dari backup bertanda **[pre-restore]**.

---

## 6. WhatsApp & Notifikasi + CRM Kontak

**Konfigurasi (Admin)** — *WhatsApp & Notifikasi → Konfigurasi*
1. Daftar di <https://fonnte.com>, hubungkan nomor WhatsApp instansi (scan QR), salin **token** perangkat.
2. Tempel token → aktifkan **WhatsApp** → **Simpan**. Token disimpan di *Script Properties* server, tidak pernah dikirim ke browser. **Cek perangkat** dan **Kirim tes** untuk memastikan.
3. **Matriks notifikasi**: nyalakan/matikan WA & email per kejadian (SP diajukan, SP terbit ke rekanan, BAPB, invoice, pembayaran, akun baru) dan ubah isi pesannya (variabel `{nama} {nomor} {nilai} {link} …`).
4. Pengiriman memakai **antrean** yang diproses trigger tiap 1 menit — tombol di aplikasi tetap instan. Tab **Antrean & Riwayat** menampilkan status Antri/Terkirim/Gagal; pesan gagal bisa diulang.

**Blast WhatsApp** — pilih penerima dari CRM (per segmen/status WA) atau tempel daftar `nomor|nama` → **Muat & Periksa** (nomor tidak valid, ganda, opt-out otomatis dibuang) → **Cek nomor WhatsApp** (opsional) → **Kirim Blast**. Dikirim per batch **10/20/50** dengan jeda acak (mis. `3-8` detik) agar nomor tidak diblokir; bisa **Dihentikan** kapan saja. Maks 5.000 nomor per blast.

**CRM Kontak** — gabungan otomatis Rekanan, Staf RSUD, Akun Rekanan, PJ Ruangan (+ import CSV kontak luar), disinkronkan tiap ±30 menit atau tombol **Sinkron**. Fitur: KPI (WA valid, email valid, duplikat, tak terjangkau), filter, tag massal, opt-out/opt-in, deteksi nomor WA, **gabungkan duplikat** (Admin), blast ke kontak terpilih, riwayat pesan & catatan interaksi per kontak. Mengubah WA/email di CRM ikut memperbarui data asal.

> Paket Fonnte gratis/murah mungkin tidak menyediakan fitur *validate* (cek nomor WA) — fitur lain tetap berjalan.

---

## 7. Migrasi dari aplikasi / spreadsheet lama

Modul: *Pengaturan Sistem → Migrasi Data*.

1. Tempel URL spreadsheet lama (harus bisa dibuka oleh akun pemilik script). Sumber **hanya dibaca**.
2. Centang sheet yang diimpor. Nama sheet & kolom lama dikenali lewat alias (mis. sheet `Rekanan` → Vendor, kolom `Nama Perusahaan` → nama, `No HP` → telepon).
3. **Pindai (Dry-run)** → tabel *Di app lama / Ditambah / Diperbarui / Dilewati* + daftar peringatan. Belum ada data yang ditulis.
4. **Jalankan Import** → backup pra-import otomatis → data digabung.
5. Aman diulang (idempoten): kunci alami = email (user), NPWP (vendor), kode/nama (barang), nomor SP/BAPB/invoice, NIP/nama (penerima). Sheet `Kontrak` di sumber dilewati (modul dihapus). ID lama dipetakan ulang ke ID baru pada relasi.

**Checklist cutover**
1. Pindai → Jalankan Import → cek vendor, PO, akun.
2. Uji login 1 akun per role.
3. Tepat sebelum pindah, **Jalankan Import sekali lagi** (delta sync).
4. Umumkan alamat baru; arsipkan deployment lama.

Catatan: sesi login lama tidak ikut pindah (pengguna cukup login ulang); akun ADMIN lama tidak diimpor; akun tanpa password dibuatkan password sementara (reset dari menu Pengguna); nomor telepon/NIP dinormalisasi agar angka 0 di depan tidak hilang.

---

## 8. Mengapa terasa instan

- **SPA**: seluruh halaman dimuat sekali; pindah menu tanpa request server (terukur ± 70–90 ms).
- **Optimistic UI**: klik Setujui/Simpan langsung mengubah tampilan (± 40 ms), sinkron ke server di latar lewat antrean berurutan; gagal → otomatis dikembalikan + pesan.
- **Cache lokal**: buka ulang aplikasi tampil dari data terakhir (± 350 ms), lalu diperbarui diam-diam.
- **Server**: CacheService *write-through* (baca tabel tanpa menyentuh Sheets), semua tulis *batch* `setValues`, audit log ditulis 1× per request, email/WA dikirim oleh trigger (tidak memperlambat klik), cache dipanaskan tiap 10 menit.
- **Tahan sinyal lemah**: request baca diulang otomatis (timeout bertahap); request simpan membawa `reqId` sehingga aman diulang tanpa data ganda. Server dibangunkan saat aplikasi dibuka (mengurangi *cold start*). Ketik `Perf.table()` di Console untuk melihat waktu tiap request.
- **Cetak dokumen** dirender di browser (tanpa menunggu Google Docs), gambar TTD di-cache di perangkat.
- **Login** langsung membawa seluruh data awal (hemat 1 round-trip). Pencarian & filter 100% lokal.
- Data tahun lama tidak dimuat saat startup (atur di *Tahun lalu yang dimuat*); bisa dimuat dari halaman **Laporan**.

---

## 9. Pemecahan masalah

| Gejala | Solusi |
|---|---|
| Login: "Server tidak terjangkau" | `GAS_URL` di `js/config.js` salah / belum di-deploy "Siapa saja" |
| "Backend belum di-setup" | Jalankan `setupAppEnvironment()` |
| Perubahan kode .gs tidak berlaku | Deploy ulang sebagai **Versi baru** |
| Data yang diedit langsung di Sheets tidak muncul | Tunggu ±1 mnt (trigger onEdit) atau *Pengaturan Sistem → Sistem → Bersihkan cache server* |
| Email notifikasi tidak terkirim | Cek *Pengaturan Aplikasi → Email notifikasi = 1*; kuota Gmail Apps Script (±100/hari akun biasa, 1.500/hari Workspace) |
| Scan template gagal | Pastikan akun pemilik script punya akses ke Google Docs tersebut |
| "Pasang Template Bawaan" gagal / izin | Jalankan fungsi apa saja di editor sekali lagi untuk menyetujui izin *layanan eksternal*, lalu Deploy versi baru |
| TTD tidak muncul di cetakan | Mode TTD = basah, kotak penanda tangan tidak dicentang, spesimen belum diunggah, atau dokumen belum disetujui/disahkan |
| Cetakan terpotong / ada header URL | Dialog cetak: Ukuran kertas sesuai (F4/Folio atau A4), Margin *Default*, matikan *Header dan footer* |
| WhatsApp tidak terkirim | Cek *Konfigurasi*: WA aktif + token, perangkat Fonnte *connected*, kejadian dicentang di matriks; lihat kolom respon di *Antrean* |
| Situs 404 di GitHub Pages | `index.html` harus di root repo — lihat panduan GitHub Pages bagian "salah folder" |

## 10. Batasan yang perlu diketahui

- Karena frontend berada di luar Google (GitHub Pages), login memakai **email + password** yang dikelola VMS (hash SHA-256 bergaram, rate-limit 5 percobaan/10 mnt, token sesi 12 jam), bukan login akun Google langsung.
- Kuota Apps Script akun standar: ±20.000 panggilan URL/hari & 6 menit per eksekusi. Untuk migrasi > ±20 ribu baris per sheet, impor bertahap per sheet.
- Pembayaran hanya **dicatat** (No. SP2D), tidak ada payment gateway (sesuai scope PRD).
- PDF dari template Google Docs mengikuti kemampuan Google Docs (mis. penomoran halaman diatur di Docs). Pratinjau/cetak browser memakai format bawaan.
- Deteksi nomor WA maks 50 nomor per klik (batas Fonnte).
