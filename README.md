# Selaras Ajar — App (Prototype)

**Versi: 1.0.0** — live di [dashboard.selaras-ajar.id](https://dashboard.selaras-ajar.id). Riwayat perubahan lengkap ada di [CHANGELOG.md](./CHANGELOG.md).

Prototype fungsional Selaras Ajar, dibangun dari `PRD-selaras-ajar.md` dan `use-cases-selaras-ajar.md` (38 use case) di folder induk `sekolahku/`. Ini **bukan** mockup statis — data disimpan di database sungguhan, login & akses berbasis peran benar-benar berjalan, dan hampir seluruh use case di PRD (termasuk modul Ujian/CBT lengkap) sudah diimplementasikan dan diverifikasi jalan end-to-end.

## Tech stack

- **Next.js 16 (App Router)** + TypeScript + Tailwind CSS v4
- **Prisma ORM 7** — database **SQLite lokal** (driver adapter `@prisma/adapter-better-sqlite3`) untuk kemudahan development; dokumen arsitektur merekomendasikan PostgreSQL untuk produksi — skema sudah kompatibel untuk migrasi itu
- **Auth sendiri** — session JWT di httpOnly cookie, password di-hash bcrypt, login/logout lewat Route Handler biasa (bukan Server Actions — lebih predictable untuk alur kritis)
- **Proxy** (`src/proxy.ts`, penerus `middleware.ts` di Next 16) — menjaga akses per rute sesuai peran
- Token warna & komponen mengikuti `ui-design-system-selaras-ajar.md` (palet soft, dipetakan ke Tailwind `@theme`)

## Menjalankan di lokal

```bash
npm install
npm run db:seed   # isi database dengan data dummy (lihat di bawah)
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — otomatis diarahkan ke `/login`. Untuk reset data kapan saja: `npm run db:seed`.

## Akun demo (5 peran)

Semua akun pakai password yang sama: **`selaras123`**. Halaman login juga punya tombol "coba cepat" untuk langsung masuk sebagai tiap peran.

| Peran | Email | Nama | Konteks |
|---|---|---|---|
| Kepala Sekolah | `hendra@selarasajar.demo` | Pak Hendra | Lihat & kelola semua data sekolah |
| Bendahara / TU | `tuti@selarasajar.demo` | Bu Tuti | Kelola SPP, tagihan, transparansi dana |
| Guru | `rina@selarasajar.demo` | Bu Rina Wulandari | Wali kelas 5B, mengajar Matematika di 5B/4A/6A |
| Orang Tua | `fauzan@selarasajar.demo` | Bpk. Fauzan | Ayah dari Ahmad Fauzi (kelas 5B) |
| Murid | `ahmad@selarasajar.demo` | Ahmad Fauzi | Siswa kelas 5B |

Sekolah: **SD Harapan Bangsa**, TA 2026/2027 Semester Ganjil, 3 kelas (5B/4A/6A), 17 siswa, bank soal + 1 ujian sudah ada hasil pengerjaan (untuk demo langsung lihat analisis tanpa perlu isi data dulu).

## Akses berdasarkan peran

Diatur di `src/proxy.ts` (`ROLE_BY_PATH_PREFIX`). Peran salah → redirect otomatis ke beranda sendiri (bukan 403 mentah); endpoint mutasi (`/api/*`) menolak 403 kalau peran tak sesuai — **sudah diverifikasi via testing**, bukan asumsi. Beberapa endpoint juga memverifikasi kepemilikan data (mis. orang tua hanya bisa lihat/bayar untuk anaknya sendiri, bukan siswa lain).

## Fitur yang diimplementasikan (per modul PRD)

### Ujian / CBT (PRD §4.8 — modul terbesar, sekarang lengkap)
- **Bank soal**: 3 jenis (pilihan ganda/jawaban singkat/esai), kunci jawaban wajib untuk PG (`/guru/bank-soal`)
- **Susun ujian**: campur jenis soal dalam satu ujian, ambil dari bank atau buat baru — soal baru otomatis masuk bank (`/guru/ujian/baru`, `/guru/ujian/[id]/edit`)
- **Pengaturan**: jadwal akses, acak urutan soal, acak urutan pilihan jawaban, sekali akses, durasi, mode Ujian vs Latihan (`/guru/ujian/[id]/pengaturan`)
- **Preview & konfirmasi** sebelum publish, masih bisa diedit (`/guru/ujian/[id]/konfirmasi`)
- **Murid mengerjakan**: soal & pilihan jawaban **teracak per siswa**, timer, **auto-save tiap jawaban**, **auto-submit saat keluar/tutup halaman** (`sendBeacon` + `visibilitychange`/`beforeunload`), sekali akses ditegakkan (`/murid/ujian/[id]`)
- **Penilaian**: auto-grade PG & jawaban singkat (dengan normalisasi teks), esai dinilai manual guru (`/guru/ujian/[id]/nilai-esai`)
- **Hasil & analisis**: daftar murid (jam mulai/selesai/durasi/nilai/status), distribusi nilai, soal tersulit (`/guru/ujian/[id]`)

### Akademik
- Absensi cepat, input nilai dengan status tuntas/remedial otomatis dari KKM
- **Tugas/PR**: guru buat & koreksi, murid submit dengan deteksi terlambat otomatis (`/guru/tugas`, `/murid/tugas`)
- **Pengaturan nilai**: bobot komponen (validasi total 100%), rentang nilai → predikat, KKM per mapel (`/kepsek/nilai-pengaturan`)
- **Performa murid (D-2)**: satu halaman yang sama diakses guru & orang tua — nilai per mapel + tren, kehadiran, riwayat ujian (`/guru/performa/[id]`, `/ortu/performa/[id]`, `/murid/performa`)
- Materi belajar per kelas/mapel

### Komunikasi
- **Pesan 2 arah** guru ↔ orang tua dengan balasan berulir, nomor pribadi guru tak pernah terekspos (`/guru/pesan`, `/ortu/pesan`)
- **Pengajuan izin/sakit**: orang tua ajukan → guru setujui/tolak → **absensi terisi otomatis** saat disetujui (`/ortu/izin`, `/guru/izin`)

### Keuangan
- Tagihan SPP, tandai lunas (bendahara), bayar (simulasi QRIS, orang tua)
- **Transparansi pemakaian dana**: bendahara catat alokasi per kategori, orang tua lihat breakdown persentase (`/keuangan/dana`, `/ortu/dana`)

### Administrasi Sekolah
- **Data siswa** dengan pencarian, edit individual (termasuk hasil impor CSV)
- **Mutasi siswa** masuk/keluar (`/kepsek/siswa/mutasi`)
- **Kenaikan kelas massal**: bikin tahun ajaran baru, siswa naik tingkat otomatis, kelas di atas tingkat maksimal ditandai lulus (`/kepsek/tahun-ajaran/kenaikan-kelas`)
- **Data guru & penugasan** ke kelas/mapel, wali kelas
- **Laporan kinerja guru**: ketertiban administrasi, aktivitas mengajar, indikator kelas (sebagai konteks bukan vonis), catatan supervisi manual (`/kepsek/guru/kinerja/[id]`)
- **Manajemen pengguna & peran**: tambah akun, aktifkan/nonaktifkan (`/kepsek/pengguna`)
- **PPDB**: form pendaftaran publik tanpa login (`/ppdb`) + kelola/terima/tolak (`/kepsek/ppdb`)
- **Kalender akademik**: agenda libur/ujian/kegiatan (`/kepsek/kalender`)
- **Consent UU PDP**: orang tua memberi persetujuan eksplisit terpisah, tercatat waktu & versi kebijakan (`/ortu/consent`)

### Ekspor & Impor CSV (PRD §4.6 — prinsip: data hasil impor tetap bisa diedit satuan)
- **Ekspor** data siswa & nilai ke format cocok Dapodik/e-Rapor (`/api/ekspor/siswa`, `/api/ekspor/nilai`)
- **Impor** data siswa massal: unduh template → unggah → **preview** (baris valid vs bermasalah dengan alasan spesifik per baris) → **upsert by NISN** (impor ulang tak menduplikat) → commit. Turut membuat akun wali (nonaktif, menunggu aktivasi) kalau data wali disertakan (`/kepsek/ekspor`)

## Yang belum diimplementasikan / disederhanakan

- **Notifikasi WhatsApp sungguhan** — masih placeholder teks di UI, tidak ada integrasi WhatsApp Cloud API asli
- **Payment gateway sungguhan** — tombol "Bayar QRIS" langsung menandai lunas, tidak ada transaksi asli ke Midtrans/Xendit
- **Rapor PDF** — data nilai & predikat sudah lengkap, tapi belum ada generator PDF (saat ini diekspor sebagai CSV)
- **Staging impor CSV pakai file sementara di `os.tmpdir()`**, bukan tabel database — cukup untuk prototype single-server, produksi sebaiknya pakai tabel `ImportBatch` + job TTL cleanup
- **PPDB single-tenant** — form publik `/ppdb` mengambil sekolah pertama di database; produk multi-sekolah nyata butuh identifikasi sekolah dari subdomain/slug
- Hal yang memang sengaja di luar cakupan PRD (§7): RFID/kantin cashless, presensi biometrik, aplikasi native, AI grading, multi-sekolah

## Struktur folder penting

```
prisma/schema.prisma     — skema database lengkap (25+ model, siap migrasi ke PostgreSQL)
prisma/seed.ts           — skrip data dummy (idempotent, aman dijalankan ulang)
src/lib/auth.ts          — session, login, peta peran→halaman
src/lib/data.ts          — semua query database per peran/modul
src/lib/ujian-helpers.ts — logika inti CBT: pengacakan soal/opsi, auto-grading
src/lib/csv.ts           — parser CSV & staging impor
src/proxy.ts             — penjaga akses berbasis peran
src/components/AppShell.tsx        — sidebar + topbar dipakai semua halaman
src/components/PengerjaanUjianClient.tsx — client component ujian (timer, autosave, autosubmit)
src/app/api/              — ~45 endpoint mutasi, semua Route Handler (bukan Server Actions)
src/app/{kepsek,keuangan,guru,ortu,murid}/ — ~55 halaman per peran
```

## Catatan teknis

- Form mutasi sengaja pakai **Route Handler biasa**, bukan Server Actions — Server Actions memakai protokol RSC (multipart + action-ID hash) yang lebih rapuh untuk alur auth/mutasi kritis dan sulit ditest langsung.
- **Field tanggal-saja** (Absensi, PengajuanIzin) selalu dipotong ke **UTC midnight** (`toDateOnlyUTC` di `lib/utils.ts`), bukan `.setHours(0,0,0,0)` lokal — yang terakhir pernah menyebabkan bug pergeseran tanggal saat re-parsing nilai yang sudah tersimpan di server dengan timezone bukan UTC.
- Auto-submit ujian saat murid menutup tab pakai `navigator.sendBeacon` (jalan walau halaman sedang unload) dengan `visibilitychange` + `pagehide` + `beforeunload` sebagai pemicu redundan.
