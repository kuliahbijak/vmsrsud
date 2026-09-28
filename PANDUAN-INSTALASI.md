# Panduan Instalasi — VMS RSUD HAMBA

**Vendor Management System** · Frontend di GitHub Pages · Backend Google Apps Script (REST API JSON) · Database Google Sheets · Berkas Google Drive · Template Google Docs

---

## 0. Isi paket

| Berkas | Untuk apa | Cara pakai |
|---|---|---|
| `Kode.gs` | Router API, login & RBAC, data layer + cache, setup | Tempel ke editor Apps Script |
| `Modul.gs` | Vendor, PO, Approval, BAST, Invoice, Kontrak, Template Docs, notifikasi | Tempel ke editor Apps Script |
| `Migrasi.gs` | Import/migrasi, backup, restore, trigger, data demo | Tempel ke editor Apps Script |
| `appsscript.json` | Manifest (zona waktu, izin, pengaturan web app) | Tempel ke editor Apps Script |
| `vms-rsud-hamba-frontend.zip` | Tampilan web (index.html, css/, js/) | Diekstrak, lalu di-push ke GitHub Pages |

> Berkas `.gs` **tidak** ikut masuk ZIP. Isi ZIP adalah **root repository**: `index.html` langsung di paling atas.

---

## 1. Backend — Google Apps Script (± 10 menit)

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `VMS RSUD HAMBA API`.
   - Gunakan akun Google **milik instansi** yang akan menjadi pemilik database dan folder Drive.
2. Buat 3 file skrip, lalu tempel isinya:
   - Ganti nama `Code.gs` → `Kode` → tempel isi **Kode.gs**
   - Klik **+** → *Skrip* → `Modul` → tempel **Modul.gs**
   - Klik **+** → *Skrip* → `Migrasi` → tempel **Migrasi.gs**
3. Tampilkan manifest: ⚙️ **Setelan proyek** → centang *Tampilkan file manifes "appsscript.json"* → buka `appsscript.json` → ganti seluruh isinya dengan **appsscript.json**.
4. Klik 💾 Simpan.
5. Pilih fungsi **`setupAppEnvironment`** di dropdown → ▶ **Jalankan** → *Tinjau izin* → pilih akun → *Lanjutan* → *Buka (tidak aman)* → **Izinkan**.
6. Buka **Log eksekusi**. Catat baris:
   ```
   👤 Akun ADMIN dibuat → email: ... | password sementara: ...
   ```
   Setup otomatis membuat:
   - Folder `📁 VMS_RSUD_HAMBA` (subfolder Vendor, Dokumen_Generate, Backup_Database, Exports, Template_Docs)
   - Spreadsheet `🗃️ Database — VMS RSUD HAMBA` dengan 14 sheet
   - 5 trigger otomatis (email notifikasi 1 mnt, pemanasan cache 10 mnt, backup harian, housekeeping, invalidasi cache saat sheet diedit manual)
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
8. Masuk **Pengaturan Sistem → Pengaturan Aplikasi**: isi identitas RS, nama/NIP PPK & Pejabat Pengadaan, dan **URL aplikasi** (alamat GitHub Pages, dipakai di email notifikasi).

**Update tampilan berikutnya:** `git add .` → `git commit -m "update"` → `git push`. Jika browser masih menampilkan versi lama: **Ctrl+Shift+R**.

> Tidak memakai GitHub? Folder yang sama bisa di-*drag & drop* ke Netlify Drop atau Vercel.

---

## 3. Langkah awal setelah online

1. **Pengaturan Sistem → Pengguna & Role** → tambah akun PPK, Pejabat Pengadaan, PPTK (password sementara dikirim ke email masing-masing).
2. **Daftar Vendor → Tambah Vendor Baru** → akun Portal Rekanan dibuat otomatis dari email vendor. Untuk data banyak: **Import CSV** (unduh templatenya dulu).
3. **Purchase Order → Master Barang/Jasa** → isi/import master barang beserta **Harga HPS** (dipakai untuk isi otomatis & pemeriksaan harga di layar Approval).
4. **Kelola Template** (lihat bagian 4).

---

## 4. Template dokumen dinamis (Google Docs)

1. Buat Google Docs di akun yang sama dengan pemilik script (disarankan di folder `📂 Template_Docs`).
2. Tulis placeholder dengan huruf besar dalam kurung siku, misalnya:
   ```
   SURAT PESANAN  Nomor: [NOMOR_PO]   Tanggal: [TANGGAL_PO]
   Kepada: [NAMA_VENDOR]  NPWP: [NPWP]
   [TABEL_BARANG]
   Total: [TOTAL] ([TERBILANG])
   Disetujui: [NAMA_PPK]  NIP [NIP_PPK]
   ```
   Placeholder yang mengandung kata `TABEL` diganti **tabel Docs sungguhan** (item PO atau barang diterima). Letakkan placeholder tabel di **paragraf tersendiri**.
3. **Kelola Template** → tempel URL → pilih jenis (PO / BAST / INVOICE / KONTRAK / CUSTOM) → **Scan Placeholder Dokumen**.
4. Periksa mapping yang ditebak otomatis. Pilih **Input manual saat generate** untuk isian yang tidak ada di sistem → **Simpan & Aktifkan**.
5. Dokumen dibuat otomatis setelah PO disetujui, BAST ditandatangani, dan kontrak disahkan; bisa juga manual lewat tombol **Generate Dokumen** di detail transaksi. Hasil: salinan Google Docs + PDF di `Vendor/Vendor_[Nama]/PO_[Nomor]/`.
6. Jika template diubah (placeholder ditambah/dihapus) → **Scan Ulang**. Mapping lama tetap dipertahankan; placeholder baru ditandai.

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

## 6. Migrasi dari aplikasi / spreadsheet lama

Modul: *Pengaturan Sistem → Migrasi Data*.

1. Tempel URL spreadsheet lama (harus bisa dibuka oleh akun pemilik script). Sumber **hanya dibaca**.
2. Centang sheet yang diimpor. Nama sheet & kolom lama dikenali lewat alias (mis. sheet `Rekanan` → Vendor, kolom `Nama Perusahaan` → nama, `No HP` → telepon).
3. **Pindai (Dry-run)** → tabel *Di app lama / Ditambah / Diperbarui / Dilewati* + daftar peringatan. Belum ada data yang ditulis.
4. **Jalankan Import** → backup pra-import otomatis → data digabung.
5. Aman diulang (idempoten): kunci alami = email (user), NPWP (vendor), kode/nama (barang), nomor PO/BAST/invoice/kontrak. ID lama dipetakan ulang ke ID baru pada relasi.

**Checklist cutover**
1. Pindai → Jalankan Import → cek vendor, PO, akun.
2. Uji login 1 akun per role.
3. Tepat sebelum pindah, **Jalankan Import sekali lagi** (delta sync).
4. Umumkan alamat baru; arsipkan deployment lama.

Catatan: sesi login lama tidak ikut pindah (pengguna cukup login ulang); akun ADMIN lama tidak diimpor; akun tanpa password dibuatkan password sementara (reset dari menu Pengguna); nomor telepon/NIP dinormalisasi agar angka 0 di depan tidak hilang.

---

## 7. Mengapa terasa instan

- **SPA**: seluruh halaman dimuat sekali; pindah menu tanpa request server (terukur ± 70–90 ms).
- **Optimistic UI**: klik Setujui/Simpan langsung mengubah tampilan (± 40 ms), sinkron ke server di latar lewat antrean berurutan; gagal → otomatis dikembalikan + pesan.
- **Cache lokal**: buka ulang aplikasi tampil dari data terakhir (± 350 ms), lalu diperbarui diam-diam.
- **Server**: CacheService *write-through* (baca tabel tanpa menyentuh Sheets), semua tulis *batch* `setValues`, audit log ditulis 1× per request, email dikirim oleh trigger (tidak memperlambat klik), cache dipanaskan tiap 10 menit.
- **Login** langsung membawa seluruh data awal (hemat 1 round-trip). Pencarian & filter 100% lokal.
- Data tahun lama tidak dimuat saat startup (atur di *Tahun lalu yang dimuat*); bisa dimuat dari halaman **Laporan**.

---

## 8. Pemecahan masalah

| Gejala | Solusi |
|---|---|
| Login: "Server tidak terjangkau" | `GAS_URL` di `js/config.js` salah / belum di-deploy "Siapa saja" |
| "Backend belum di-setup" | Jalankan `setupAppEnvironment()` |
| Perubahan kode .gs tidak berlaku | Deploy ulang sebagai **Versi baru** |
| Data yang diedit langsung di Sheets tidak muncul | Tunggu ±1 mnt (trigger onEdit) atau *Pengaturan Sistem → Sistem → Bersihkan cache server* |
| Email notifikasi tidak terkirim | Cek *Pengaturan Aplikasi → Email notifikasi = 1*; kuota Gmail Apps Script (±100/hari akun biasa, 1.500/hari Workspace) |
| Scan template gagal | Pastikan akun pemilik script punya akses ke Google Docs tersebut |
| Situs 404 di GitHub Pages | `index.html` harus di root repo — lihat panduan GitHub Pages bagian "salah folder" |

## 9. Batasan yang perlu diketahui

- Karena frontend berada di luar Google (GitHub Pages), login memakai **email + password** yang dikelola VMS (hash SHA-256 bergaram, rate-limit 5 percobaan/10 mnt, token sesi 12 jam), bukan login akun Google langsung.
- Kuota Apps Script akun standar: ±20.000 panggilan URL/hari & 6 menit per eksekusi. Untuk migrasi > ±20 ribu baris per sheet, impor bertahap per sheet.
- Pembayaran hanya **dicatat** (No. SP2D), tidak ada payment gateway (sesuai scope PRD).
