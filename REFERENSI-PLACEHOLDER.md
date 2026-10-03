# Referensi Penanda (Placeholder) — Template Dokumen VMS RSUD HAMBA

Dipakai di Google Docs template (Kelola Template). File Word bawaan ada di folder `templates/` frontend dan otomatis dipasang ke Google Drive **📂 Template_Docs**.

## Aturan penulisan

- Ketik penanda persis (huruf besar, tanpa spasi), mis. `{{NOMOR_SP}}`. Format lama [NOMOR_SP] tetap dikenali.
- Baris barang: buat SATU baris tabel yang berisi `{{#ITEM}}` di sel pertama, lalu kolom `{{ITEM.NO}}` `{{ITEM.URAIAN}}` `{{ITEM.VOLUME}}` `{{ITEM.SATUAN}}` `{{ITEM.HARGA}}` `{{ITEM.JUMLAH}}` — baris diulang otomatis untuk setiap barang.
- Kolom ITEM lain: `{{ITEM.SPESIFIKASI}}` `{{ITEM.LOT}}` `{{ITEM.EXP}}` `{{ITEM.KONDISI}}` `{{ITEM.QTY_PO}}`.
- Bagian bersyarat: `{{?KUNCI}} … {{/KUNCI}}` hanya tampil bila KUNCI terisi (mis. baris NIP).
- Gambar: `{{LOGO}}`, `{{TTD_PPK}}`, `{{TTD_PPTK}}`, `{{TTD_PENERIMA}}`, `{{TTD_PENYEDIA}}` diganti gambar PNG; bila TTD dimatikan/belum ada, tempatnya dikosongkan untuk TTD basah.
- Penanda yang tidak dikenal sistem → di Kelola Template dipetakan "Input manual saat generate" dan ditanyakan saat membuat PDF.

## Penanda yang dipakai template bawaan

### Surat Pesanan (SP)  (`Template_SP_Surat_Pesanan.docx`)

| Penanda | Keterangan |
|---|---|
| `{{LOGO\|lebar:62}}` | Logo kop (gambar) |
| `{{KOP_INSTANSI}}` | Kop baris 1 (Pemerintah ...) |
| `{{KOP_JUDUL}}` | Kop baris 2 |
| `{{KOP_NAMA}}` | Kop baris 3 (nama RS) |
| `{{KOP_ALAMAT}}` | Alamat kop |
| `{{KOP_KONTAK}}` | Telepon/Fax |
| `{{KOP_LAMAN}}` | Laman & Pos-el |
| `{{NOMOR_SP}}` | Nomor SP |
| `{{NAMA_PENYEDIA}}` | Nama perusahaan |
| `{{ALAMAT_PENYEDIA}}` | Alamat |
| `{{TELEPON_PENYEDIA}}` | Telepon |
| `{{KEGIATAN}}` | Kegiatan |
| `{{SUB_KEGIATAN}}` | Sub kegiatan |
| `{{PEKERJAAN}}` | Pekerjaan / paket |
| `{{KODE_REKENING}}` | Kode rekening |
| `{{#ITEM}}` | Awal baris berulang (1 baris per barang) |
| `{{ITEM.NO}}` | Kolom baris barang: Nomor urut baris |
| `{{ITEM.URAIAN}}` | Kolom baris barang: Nama/uraian barang |
| `{{ITEM.VOLUME}}` | Kolom baris barang: Volume / qty |
| `{{ITEM.SATUAN}}` | Kolom baris barang: Satuan |
| `{{ITEM.HARGA}}` | Kolom baris barang: Harga satuan |
| `{{ITEM.JUMLAH}}` | Kolom baris barang: Jumlah (volume x harga) |
| `{{JUMLAH}}` | Jumlah sebelum pajak / DPP |
| `{{PPN_PERSEN}}` | Tarif PPN % |
| `{{PPN}}` | PPN |
| `{{TOTAL}}` | Total termasuk PPN |
| `{{TGL_DITERIMA}}` | Tanggal barang diterima |
| `{{WAKTU_PENYELESAIAN}}` | Waktu penyelesaian (hari) |
| `{{WAKTU_TERBILANG}}` | Waktu terbilang |
| `{{TGL_SELESAI}}` | Tanggal selesai |
| `{{ALAMAT_KIRIM}}` | Alamat pengiriman |
| `{{RS_KOTA}}` | Kota penandatanganan |
| `{{TANGGAL_SP}}` | Tanggal SP |
| `{{RS_NAMA_DOK}}` | Nama RS (badan dokumen) |
| `{{TTD_PPK}}` | TTD PPK (gambar) |
| `{{NAMA_PPK}}` | Nama PPK |
| `{{NIP_PPK\|nip}}` | NIP PPK |

### BAPB / Surat Penerimaan Barang  (`Template_BAPB_Surat_Penerimaan_Barang.docx`)

| Penanda | Keterangan |
|---|---|
| `{{LOGO\|lebar:62}}` | Logo kop (gambar) |
| `{{KOP_INSTANSI}}` | Kop baris 1 (Pemerintah ...) |
| `{{KOP_JUDUL}}` | Kop baris 2 |
| `{{KOP_NAMA}}` | Kop baris 3 (nama RS) |
| `{{KOP_ALAMAT}}` | Alamat kop |
| `{{KOP_KONTAK}}` | Telepon/Fax |
| `{{KOP_LAMAN}}` | Laman & Pos-el |
| `{{NOMOR_BAPB}}` | Nomor BAPB |
| `{{HARI}}` | Nama hari dokumen |
| `{{TGL_TERBILANG}}` | Tanggal terbilang (tiga) |
| `{{BULAN}}` | Nama bulan |
| `{{TAHUN_TERBILANG}}` | Tahun terbilang |
| `{{TANGGAL_ANGKA}}` | Tanggal angka (3/3/2026) |
| `{{RS_NAMA_DOK}}` | Nama RS (badan dokumen) |
| `{{NO_PESANAN}}` | No. pesanan (rujukan/SP) |
| `{{TGL_PESANAN}}` | Tanggal pesanan |
| `{{#ITEM}}` | Awal baris berulang (1 baris per barang) |
| `{{ITEM.NO}}` | Kolom baris barang: Nomor urut baris |
| `{{ITEM.URAIAN}}` | Kolom baris barang: Nama/uraian barang |
| `{{ITEM.VOLUME}}` | Kolom baris barang: Volume / qty |
| `{{ITEM.SATUAN}}` | Kolom baris barang: Satuan |
| `{{PENERIMA_JABATAN}}` | Jabatan Penanggung Jawab |
| `{{PPTK_JABATAN}}` | Jabatan PPTK |
| `{{TTD_PENERIMA}}` | TTD Penanggung Jawab Ruangan (gambar) |
| `{{TTD_PPTK}}` | TTD PPTK (gambar) |
| `{{PENERIMA_NAMA}}` | Nama Penanggung Jawab Ruangan |
| `{{PPTK_NAMA}}` | Nama PPTK |
| `{{?PENERIMA_NIP}} … {{/PENERIMA_NIP}}` | Tampil hanya bila NIP Penanggung Jawab terisi |
| `{{PENERIMA_NIP\|nip}}` | NIP Penanggung Jawab |
| `{{?PPTK_NIP}} … {{/PPTK_NIP}}` | Tampil hanya bila NIP PPTK terisi |
| `{{PPTK_NIP\|nip}}` | NIP PPTK |

### BAST Hasil Pekerjaan (BASTP)  (`Template_BAST_Hasil_Pekerjaan.docx`)

| Penanda | Keterangan |
|---|---|
| `{{LOGO\|lebar:62}}` | Logo kop (gambar) |
| `{{KOP_INSTANSI}}` | Kop baris 1 (Pemerintah ...) |
| `{{KOP_JUDUL}}` | Kop baris 2 |
| `{{KOP_NAMA}}` | Kop baris 3 (nama RS) |
| `{{KOP_ALAMAT}}` | Alamat kop |
| `{{KOP_KONTAK}}` | Telepon/Fax |
| `{{KOP_LAMAN}}` | Laman & Pos-el |
| `{{NOMOR_BASTP}}` | Nomor BAST Hasil Pekerjaan |
| `{{HARI}}` | Nama hari dokumen |
| `{{TGL_TERBILANG\|judul}}` | Tanggal terbilang (tiga) |
| `{{BULAN}}` | Nama bulan |
| `{{TAHUN_TERBILANG\|judul}}` | Tahun terbilang |
| `{{NAMA_PENYEDIA}}` | Nama perusahaan |
| `{{NAMA_PIMPINAN}}` | Nama pimpinan / penanda tangan |
| `{{JABATAN_PIMPINAN}}` | Jabatan pimpinan |
| `{{ALAMAT_PENYEDIA}}` | Alamat |
| `{{NAMA_PPK}}` | Nama PPK |
| `{{NIP_PPK}}` | NIP PPK |
| `{{JABATAN_PPK}}` | Jabatan PPK |
| `{{NOMOR_SP}}` | Nomor SP |
| `{{TANGGAL_SP}}` | Tanggal SP |
| `{{TOTAL}}` | Total termasuk PPN |
| `{{TOTAL_TERBILANG}}` | Total terbilang |
| `{{RS_KOTA}}` | Kota penandatanganan |
| `{{TANGGAL_BAPB}}` | Tanggal BAPB |
| `{{RS_NAMA_DOK}}` | Nama RS (badan dokumen) |
| `{{TTD_PENYEDIA}}` | TTD Penyedia (gambar) |
| `{{TTD_PPK}}` | TTD PPK (gambar) |

### Invoice / Tagihan  (`Template_Invoice_Tagihan.docx`)

| Penanda | Keterangan |
|---|---|
| `{{NAMA_PENYEDIA\|kapital}}` | Nama perusahaan |
| `{{ALAMAT_PENYEDIA}}` | Alamat |
| `{{TELEPON_PENYEDIA}}` | Telepon |
| `{{EMAIL_PENYEDIA}}` | Email |
| `{{NPWP_PENYEDIA}}` | NPWP |
| `{{RS_NAMA_DOK}}` | Nama RS (badan dokumen) |
| `{{KOP_ALAMAT}}` | Alamat kop |
| `{{NOMOR_INVOICE}}` | Nomor invoice |
| `{{TANGGAL_INVOICE}}` | Tanggal invoice |
| `{{JATUH_TEMPO}}` | Jatuh tempo |
| `{{NOMOR_SP}}` | Nomor SP |
| `{{NOMOR_BAPB}}` | Nomor BAPB |
| `{{NO_FAKTUR\|bawaan:-}}` | No. e-Faktur |
| `{{PEKERJAAN}}` | Pekerjaan / paket |
| `{{#ITEM}}` | Awal baris berulang (1 baris per barang) |
| `{{ITEM.NO}}` | Kolom baris barang: Nomor urut baris |
| `{{ITEM.URAIAN}}` | Kolom baris barang: Nama/uraian barang |
| `{{ITEM.VOLUME}}` | Kolom baris barang: Volume / qty |
| `{{ITEM.SATUAN}}` | Kolom baris barang: Satuan |
| `{{ITEM.HARGA}}` | Kolom baris barang: Harga satuan |
| `{{ITEM.JUMLAH}}` | Kolom baris barang: Jumlah (volume x harga) |
| `{{JUMLAH}}` | Jumlah sebelum pajak / DPP |
| `{{PPN_PERSEN}}` | Tarif PPN % |
| `{{PPN}}` | PPN |
| `{{TOTAL}}` | Total termasuk PPN |
| `{{TOTAL_TERBILANG}}` | Total terbilang |
| `{{PPH22_PERSEN}}` | Tarif PPh 22 % |
| `{{PPH22}}` | PPh 22 |
| `{{NETTO}}` | Netto dibayar |
| `{{BANK}}` | Bank |
| `{{NO_REKENING}}` | No. rekening |
| `{{NAMA_REKENING}}` | Nama rekening |
| `{{RS_KOTA}}` | Kota penandatanganan |
| `{{NAMA_PENYEDIA}}` | Nama perusahaan |
| `{{TTD_PENYEDIA}}` | TTD Penyedia (gambar) |
| `{{TTD_NAMA}}` | Nama penanda tangan penagih |
| `{{TTD_JABATAN}}` | Jabatan penanda tangan penagih |

## Pengubah format

| Pengubah | Fungsi | Contoh |
|---|---|---|
| `\|rupiah` | Format ribuan Rupiah | `{{TOTAL\|rupiah}} → 96.570.000` |
| `\|terbilang` | Angka terbilang | `{{TOTAL\|terbilang}} → sembilan puluh enam juta …` |
| `\|terbilang:rupiah` | Terbilang + "Rupiah" | `{{TOTAL\|terbilang:rupiah}} → Sembilan Puluh … Rupiah` |
| `\|tanggal` | Tanggal Indonesia | `{{TANGGAL_SP\|tanggal}} → 05 Maret 2026` |
| `\|kapital / \|kecil / \|judul` | Huruf besar / kecil / Judul | `{{NAMA_PPK\|kapital}} → DR. IBNU …` |
| `\|nip` | NIP berspasi 8-6-1-3 | `{{NIP_PPK\|nip}} → 19861218 201101 1 003` |
| `\|bawaan:teks` | Isi teks ini bila kosong | `{{NO_FAKTUR\|bawaan:-}} → -` |
| `\|lebar:120` | Lebar gambar (pt) untuk TTD/logo | `{{TTD_PPK\|lebar:120}}` |

## Semua penanda yang tersedia

**Kop & Instansi**

| Penanda | Keterangan |
|---|---|
| `{{KOP_INSTANSI}}` | Kop baris 1 (Pemerintah ...) |
| `{{KOP_JUDUL}}` | Kop baris 2 |
| `{{KOP_NAMA}}` | Kop baris 3 (nama RS) |
| `{{KOP_ALAMAT}}` | Alamat kop |
| `{{KOP_KONTAK}}` | Telepon/Fax |
| `{{KOP_LAMAN}}` | Laman & Pos-el |
| `{{RS_NAMA}}` | Nama singkat RS |
| `{{RS_NAMA_DOK}}` | Nama RS (badan dokumen) |
| `{{RS_KOTA}}` | Kota penandatanganan |
| `{{PEMDA}}` | Pemerintah daerah |
| `{{TANGGAL_HARI_INI}}` | Tanggal hari ini |
| `{{TAHUN}}` | Tahun dokumen |

**Dokumen (umum)**

| Penanda | Keterangan |
|---|---|
| `{{NOMOR}}` | Nomor dokumen ini |
| `{{TANGGAL}}` | Tanggal dokumen ini |
| `{{HARI}}` | Nama hari dokumen |
| `{{TGL_TERBILANG}}` | Tanggal terbilang (tiga) |
| `{{BULAN}}` | Nama bulan |
| `{{BULAN_ROMAWI}}` | Bulan romawi |
| `{{TAHUN_TERBILANG}}` | Tahun terbilang |
| `{{TANGGAL_ANGKA}}` | Tanggal angka (3/3/2026) |

**Surat Pesanan (SP/PO)**

| Penanda | Keterangan |
|---|---|
| `{{NOMOR_SP}}` | Nomor SP |
| `{{TANGGAL_SP}}` | Tanggal SP |
| `{{KEGIATAN}}` | Kegiatan |
| `{{SUB_KEGIATAN}}` | Sub kegiatan |
| `{{PEKERJAAN}}` | Pekerjaan / paket |
| `{{KODE_REKENING}}` | Kode rekening |
| `{{UNIT}}` | Unit pemesan |
| `{{KATEGORI}}` | Kategori |
| `{{SUMBER_DANA}}` | Sumber dana |
| `{{RUJUKAN}}` | Rujukan / e-Katalog |
| `{{KETERANGAN}}` | Keterangan |
| `{{NILAI_SP}}` | Total nilai SP |
| `{{NILAI_SP_TERBILANG}}` | Total SP terbilang |
| `{{TGL_DITERIMA}}` | Tanggal barang diterima |
| `{{WAKTU_PENYELESAIAN}}` | Waktu penyelesaian (hari) |
| `{{WAKTU_TERBILANG}}` | Waktu terbilang |
| `{{TGL_SELESAI}}` | Tanggal selesai |
| `{{ALAMAT_KIRIM}}` | Alamat pengiriman |

**Nilai (mengikuti jenis dokumen)**

| Penanda | Keterangan |
|---|---|
| `{{JUMLAH}}` | Jumlah sebelum pajak / DPP |
| `{{PPN_PERSEN}}` | Tarif PPN % |
| `{{PPN}}` | PPN |
| `{{TOTAL}}` | Total termasuk PPN |
| `{{TOTAL_TERBILANG}}` | Total terbilang |
| `{{PPH22_PERSEN}}` | Tarif PPh 22 % |
| `{{PPH22}}` | PPh 22 |
| `{{NETTO}}` | Netto dibayar |
| `{{NETTO_TERBILANG}}` | Netto terbilang |

**Penyedia / Vendor**

| Penanda | Keterangan |
|---|---|
| `{{NAMA_PENYEDIA}}` | Nama perusahaan |
| `{{ALAMAT_PENYEDIA}}` | Alamat |
| `{{TELEPON_PENYEDIA}}` | Telepon |
| `{{EMAIL_PENYEDIA}}` | Email |
| `{{NPWP_PENYEDIA}}` | NPWP |
| `{{NIB_PENYEDIA}}` | NIB |
| `{{NAMA_PIMPINAN}}` | Nama pimpinan / penanda tangan |
| `{{JABATAN_PIMPINAN}}` | Jabatan pimpinan |
| `{{BANK}}` | Bank |
| `{{NO_REKENING}}` | No. rekening |
| `{{NAMA_REKENING}}` | Nama rekening |

**Pejabat**

| Penanda | Keterangan |
|---|---|
| `{{NAMA_PPK}}` | Nama PPK |
| `{{NIP_PPK}}` | NIP PPK |
| `{{JABATAN_PPK}}` | Jabatan PPK |
| `{{PPTK_NAMA}}` | Nama PPTK |
| `{{PPTK_NIP}}` | NIP PPTK |
| `{{PPTK_JABATAN}}` | Jabatan PPTK |
| `{{PENERIMA_NAMA}}` | Nama Penanggung Jawab Ruangan |
| `{{PENERIMA_NIP}}` | NIP Penanggung Jawab |
| `{{PENERIMA_JABATAN}}` | Jabatan Penanggung Jawab |
| `{{RUANGAN}}` | Ruangan / instalasi |

**Penerimaan (BAPB / BASTP)**

| Penanda | Keterangan |
|---|---|
| `{{NOMOR_BAPB}}` | Nomor BAPB |
| `{{TANGGAL_BAPB}}` | Tanggal BAPB |
| `{{NOMOR_BASTP}}` | Nomor BAST Hasil Pekerjaan |
| `{{NO_PESANAN}}` | No. pesanan (rujukan/SP) |
| `{{TGL_PESANAN}}` | Tanggal pesanan |
| `{{NO_SURAT_JALAN}}` | No. surat jalan |
| `{{KESIMPULAN}}` | Kesimpulan pemeriksaan |
| `{{CATATAN_PENERIMAAN}}` | Catatan pemeriksaan |

**Invoice**

| Penanda | Keterangan |
|---|---|
| `{{NOMOR_INVOICE}}` | Nomor invoice |
| `{{TANGGAL_INVOICE}}` | Tanggal invoice |
| `{{NO_FAKTUR}}` | No. e-Faktur |
| `{{JATUH_TEMPO}}` | Jatuh tempo |
| `{{NO_SP2D}}` | No. SP2D |
| `{{TTD_NAMA}}` | Nama penanda tangan penagih |
| `{{TTD_JABATAN}}` | Jabatan penanda tangan penagih |

**Gambar & TTD**

| Penanda | Keterangan |
|---|---|
| `{{LOGO}}` | Logo kop (gambar) |
| `{{TTD_PPK}}` | TTD PPK (gambar) |
| `{{TTD_PPTK}}` | TTD PPTK (gambar) |
| `{{TTD_PENERIMA}}` | TTD Penanggung Jawab Ruangan (gambar) |
| `{{TTD_PENYEDIA}}` | TTD Penyedia (gambar) |
| `{{TTD_1}}` | TTD slot 1 |
| `{{TTD_2}}` | TTD slot 2 |

**Baris berulang**

| Penanda | Keterangan |
|---|---|
| `{{ITEM}}` | Baris barang {{#ITEM}} · kolom {{ITEM.NO}} {{ITEM.URAIAN}} {{ITEM.SPESIFIKASI}} {{ITEM.VOLUME}} {{ITEM.SATUAN}} {{ITEM.HARGA}} {{ITEM.JUMLAH}} {{ITEM.LOT}} {{ITEM.EXP}} {{ITEM.KONDISI}} {{ITEM.QTY_PO}} |
