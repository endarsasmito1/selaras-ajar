# Selaras Ajar — App

**Versi: Unreleased** (pasca-1.0.0) — live di [dashboard.selaras-ajar.id](https://dashboard.selaras-ajar.id). Riwayat perubahan lengkap ada di [CHANGELOG.md](./CHANGELOG.md). Dokumentasi API (eksternal `/api/v1` via API key + referensi lengkap seluruh endpoint internal) ada di [docs/API.md](./docs/API.md). Versi README sebelumnya diarsipkan di [docs/readme-history/](./docs/readme-history/INDEX.md).

Aplikasi fungsional Selaras Ajar, dibangun dari `PRD-selaras-ajar.md` dan `use-cases-selaras-ajar.md` (38 use case) di folder induk `sekolahku/`. Ini **bukan** mockup statis — data disimpan di database sungguhan, login & akses berbasis peran benar-benar berjalan, dan hampir seluruh use case di PRD (termasuk modul Ujian/CBT lengkap) sudah diimplementasikan dan diverifikasi jalan end-to-end lewat suite pengujian otomatis (lihat [§ Testing](#testing)).

## Tech stack

- **Next.js 16 (App Router)** + TypeScript + Tailwind CSS v4
- **Prisma ORM 7** (51 model) — database **SQLite lokal** (driver adapter `@prisma/adapter-better-sqlite3`) untuk kemudahan development; dokumen arsitektur merekomendasikan PostgreSQL untuk produksi — skema sudah kompatibel untuk migrasi itu
- **Auth sendiri** — session JWT di httpOnly cookie (fail-fast kalau `SESSION_SECRET` kosong di produksi, lihat `src/lib/session-secret.ts`), password di-hash bcrypt, login/logout lewat Route Handler biasa (bukan Server Actions — lebih predictable untuk alur kritis), dengan rate-limit lockout bawaan (`src/lib/rate-limit.ts`)
- **Proxy** (`src/proxy.ts`, penerus `middleware.ts` di Next 16) — menjaga akses per rute sesuai peran
- **113 API route** (Route Handler) + **107 halaman** lintas 7 peran (Superadmin, Kepala Sekolah, Bendahara, TU, Guru, Orang Tua, Murid)
- Token warna & komponen mengikuti `ui-design-system-selaras-ajar.md` (palet soft, dipetakan ke Tailwind `@theme`)

## Menjalankan di lokal

```bash
npm install
npm run db:seed   # isi database dengan data dummy (lihat di bawah)
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — otomatis diarahkan ke `/login`. Untuk reset data kapan saja: `npm run db:seed`. Salin `.env.example` ke `.env` dan isi (`DATABASE_URL` minimal) sebelum langkah di atas kalau belum ada `.env`.

## Testing

Suite E2E Playwright (`tests/e2e/`, 40 file spec, **264 test**) mensimulasikan interaksi browser sungguhan lintas 7 peran — login, RBAC, tiap alur fitur per modul di bawah, keamanan API (celah lintas-tenant/ownership), sampai regresi visual (screenshot per role, data dinamis di-mask). Dijalankan otomatis oleh CI (lihat di bawah) sebagai syarat wajib sebelum merge/deploy — bukan cuma tersedia, tapi benar-benar men-*gate*.

```bash
npm run test:e2e       # jalankan seluruh suite (auto-reseed database dulu)
npm run test:e2e:ui    # mode UI interaktif Playwright
```

## CI/CD

`.github/workflows/deploy.yml` — tiap push ke `main` maupun pull request: `npm run lint` + `npx tsc --noEmit` + suite E2E 264-test wajib lolos (job `test`) sebelum job `deploy` (SSH ke server produksi, `deploy.sh`: build dulu baru restart PM2 — build gagal = versi lama tetap jalan, zero-downtime) diizinkan jalan. `deploy` otomatis di-skip kalau `test` gagal, jadi push yang rusak tidak pernah ter-deploy.

## Keamanan & keandalan

- Rate-limit lockout login (per-email & per-IP) dan throttle form publik (`/api/ppdb`)
- Logging terstruktur (JSON) di jalur kritis: pembayaran, penilaian ujian, absensi (`src/lib/logger.ts`)
- Pola wajib **existence + tenant/ownership check sebelum mutasi** di semua endpoint yang menerima ID dari request (`src/lib/guard.ts`, `assertOwned()`) — pernah ditemukan lewat audit bahwa pelanggaran pola ini = crash 500 dan/atau celah lintas-sekolah
- Backup terjadwal siap pakai lewat cron (`scripts/backup.mjs`, snapshot WAL-safe database + berkas upload, retensi 14 hari)

## Akun demo (7 peran)

Semua akun pakai password yang sama: **`selaras123`**. Halaman login juga punya tombol "coba cepat" untuk langsung masuk sebagai tiap peran.

| Peran | Email | Konteks |
|---|---|---|
| Superadmin | `admin@selarasajar.id` | Kelola platform lintas-sekolah — lihat 30 sekolah demo lain, kurikulum & bank soal global, langganan/revenue |
| Kepala Sekolah | `hendra@selarasajar.demo` | Lihat & kelola semua data sekolah |
| Bendahara | `tuti@selarasajar.demo` | Kelola SPP, tagihan, transparansi dana |
| Tata Usaha (TU) | `tono@selarasajar.demo` | Administrasi data — sebagian menu sama dgn Kepala Sekolah |
| Guru | `rina@selarasajar.demo` | Wali kelas 5B, mengajar Matematika di banyak kelas — akun lain juga tersedia (guru spesialis 1 mapel, guru lintas-kelas, dst, lihat output `npm run db:seed`) |
| Orang Tua | `fauzan@selarasajar.demo` | Ayah dari Ahmad Fauzi (kelas 5B) |
| Murid | `ahmad@selarasajar.demo` | Siswa kelas 5B |

Sekolah utama demo: **SD Harapan Bangsa**, 24 kelas (tingkat 1–6, 4 rombel A–D), data akademik/keuangan/ujian terisi penuh lintas semua kelas — untuk demo langsung lihat analisis tanpa perlu isi data dulu. Superadmin juga bisa melihat **30 sekolah lain** (data sekolah nyata se-Indonesia dari api.co.id, tiap sekolah py akun kepsek/wali/murid/ortu sendiri, pola `<peran>@sekolah<NPSN>.demo`) — untuk demo skenario multi-tenant/multi-sekolah.

## Akses berdasarkan peran

Diatur di `src/proxy.ts` (`ROLE_BY_PATH_PREFIX`). Peran salah → redirect otomatis ke beranda sendiri (bukan 403 mentah); endpoint mutasi (`/api/*`) menolak 403 kalau peran tak sesuai — **sudah diverifikasi via testing**, bukan asumsi. Beberapa endpoint juga memverifikasi kepemilikan data (mis. orang tua hanya bisa lihat/bayar untuk anaknya sendiri, bukan siswa lain; guru hanya untuk kelas+mapel yang benar-benar diampu, ditegakkan lewat `PenugasanGuru`).

## Fitur yang diimplementasikan (per modul PRD)

### Ujian / CBT (PRD §4.8 — modul terbesar, sekarang lengkap)
- **Bank soal**: 5 jenis (pilihan ganda, PG kompleks, PG nilai minus, jawaban singkat, esai), kunci jawaban wajib untuk PG (`/guru/bank-soal`) — plus bank soal **global** dikelola superadmin, tersedia ke semua sekolah
- **Susun ujian**: campur jenis soal dalam satu ujian, ambil dari bank atau buat baru, duplikat ke kelas lain (`/guru/ujian/baru`, `/guru/ujian/[id]/edit`)
- **Pengaturan**: jadwal akses per kelas, acak urutan soal, acak urutan pilihan jawaban, sekali akses, durasi (termasuk durasi per-soal untuk esai/isian), mode Ujian vs Latihan, mode & jadwal reveal hasil (`/guru/ujian/[id]/pengaturan`)
- **Preview & konfirmasi** sebelum publish, masih bisa diedit (`/guru/ujian/[id]/konfirmasi`)
- **Murid mengerjakan**: soal & pilihan jawaban **teracak per siswa**, timer (termasuk per-soal), **auto-save tiap jawaban**, **auto-submit saat keluar/tutup halaman** (`sendBeacon` + `visibilitychange`/`beforeunload`), sekali akses ditegakkan (`/murid/ujian/[id]`)
- **Penilaian**: auto-grade PG/PG kompleks/nilai minus & jawaban singkat (dengan normalisasi teks), esai dinilai manual guru (`/guru/ujian/[id]/nilai-esai`)
- **Hasil & analisis**: daftar murid (jam mulai/selesai/durasi/nilai/status), distribusi nilai, soal tersulit (`/guru/ujian/[id]`)

### Akademik
- Absensi cepat (dengan catatan per murid, indikator izin pending inline), input nilai dengan status tuntas/remedial otomatis dari KKM
- **Tugas/PR**: guru buat & koreksi, murid submit dengan deteksi terlambat otomatis (`/guru/tugas`, `/murid/tugas`)
- **Pengaturan nilai**: bobot komponen (validasi total 100%), rentang nilai → predikat (rank-based, aman untuk skala yang dikonfigurasi ulang), KKM per mapel — bisa beda untuk UTS/UAS (`/kepsek/master-data`)
- **Performa murid**: satu halaman yang sama diakses guru & orang tua — nilai per mapel + tren, kehadiran, riwayat ujian (`/guru/performa/[id]`, `/ortu/performa/[id]`, `/murid/performa`)
- Materi belajar per kelas/mapel (dikelompokkan per Bab, video via upload atau tautan YouTube/Vimeo dgn embed asli), RPP & Capaian Pembelajaran, Projek P5

### Komunikasi
- **Pesan 2 arah** guru ↔ orang tua dengan balasan berulir, nomor pribadi guru tak pernah terekspos (`/guru/pesan`, `/ortu/pesan`)
- **Tanya Jawab Kelas** & diskusi di bawah materi/tugas, guru bisa moderasi
- **Pengajuan izin/sakit**: orang tua ajukan → guru setujui/tolak dari kartu terpisah yang jelas (bukan badge inline) → **absensi terisi otomatis** saat disetujui (`/ortu/izin`, `/guru/absensi`)
- **Notifikasi** state-based lintas 7 peran (bell + halaman `/notifikasi`), disinkron tiap render halaman

### Keuangan
- Tagihan SPP + tagihan custom (non-SPP), tandai lunas manual (bendahara), bayar (simulasi QRIS, orang tua) — termasuk **bayar banyak tagihan sekaligus**
- **Transparansi pemakaian dana**: bendahara catat alokasi per kategori, orang tua lihat breakdown persentase (`/keuangan/dana`, `/ortu/dana`)
- Proyeksi keuangan & riwayat tagihan per siswa

### Administrasi Sekolah
- **Data siswa** dengan pencarian, edit individual (termasuk hasil impor CSV), profil 360°
- **Mutasi siswa** masuk/keluar, riwayat siswa (lulus/pindah/mutasi)
- **Kenaikan kelas massal** (alur 2 langkah: draft rombel tujuan → tinjau & sesuaikan per siswa → jalankan): bikin tahun ajaran baru, siswa naik tingkat otomatis (bisa pecah 1 kelas jadi beberapa rombel tujuan), kelas di atas tingkat maksimal ditandai lulus (`/kepsek/tahun-ajaran/kenaikan-kelas`)
- **Data guru & penugasan** ke kelas/mapel, wali kelas, multi-peran per akun (mis. guru yang juga Bendahara)
- **Laporan kinerja guru**: ketertiban administrasi, aktivitas mengajar, indikator kelas (sebagai konteks bukan vonis), catatan supervisi manual, riwayat lintas tahun ajaran (`/kepsek/guru/kinerja/[id]`)
- **PPDB**: form pendaftaran publik tanpa login (`/ppdb`, dengan throttle anti-spam) + kelola/terima/tolak (`/kepsek/ppdb`)
- **Kalender akademik**: agenda libur/ujian/kegiatan (`/kepsek/kalender`), jadwal pelajaran mingguan gaya kalender
- **Consent UU PDP**: orang tua memberi persetujuan eksplisit terpisah, tercatat waktu & versi kebijakan (`/ortu/consent`)

### Superadmin (platform, lintas sekolah)
- Kelola daftar sekolah (tambah, aktif/nonaktif), kurikulum global (preset per jenjang, dipakai banyak sekolah sekaligus), bank soal global
- Revenue & langganan platform per sekolah
- Peta lokasi sekolah, pencarian sekolah terintegrasi API data wilayah Indonesia

### API eksternal
- `X-API-Key` (independen dari session cookie UI) untuk integrasi pihak ketiga — kepsek/TU generate key dari `/kepsek/ekspor`. Lihat [docs/API.md](./docs/API.md) untuk kontrak lengkap & contoh.

### Ekspor & Impor CSV (PRD §4.6 — prinsip: data hasil impor tetap bisa diedit satuan)
- **Ekspor** data siswa & nilai ke format cocok Dapodik/e-Rapor, plus backup JSON penuh (`/api/ekspor/*`)
- **Impor** data siswa/guru/mapel/kelas/soal massal: unduh template → unggah → **preview** (baris valid vs bermasalah dengan alasan spesifik per baris) → **upsert by NISN**/nama (impor ulang tak menduplikat) → commit

## Yang belum diimplementasikan / disederhanakan

- **Notifikasi WhatsApp sungguhan** — masih placeholder teks di UI, tidak ada integrasi WhatsApp Cloud API asli
- **Payment gateway sungguhan** — tombol "Bayar QRIS" langsung menandai lunas, tidak ada transaksi asli ke Midtrans/Xendit
- **Rapor PDF** — data nilai & predikat sudah lengkap, tapi belum ada generator PDF (saat ini diekspor sebagai CSV)
- **Staging impor CSV pakai file sementara di `os.tmpdir()`**, bukan tabel database — cukup untuk prototype single-server, produksi sebaiknya pakai tabel `ImportBatch` + job TTL cleanup
- **PPDB single-tenant** — form publik `/ppdb` mengambil sekolah pertama di database; produk multi-sekolah nyata butuh identifikasi sekolah dari subdomain/slug
- **SQLite tunggal** — arsitektur single-server (database + berkas upload di disk lokal), belum ada horizontal scaling; migrasi PostgreSQL + storage eksternal direncanakan terpisah
- Hal yang memang sengaja di luar cakupan PRD (§7): RFID/kantin cashless, presensi biometrik, aplikasi native, AI grading, multi-sekolah penuh (sebagian sudah dibuktikan lewat 30 sekolah demo superadmin, tapi belum jadi produk multi-tenant publik)

## Struktur folder penting

```
prisma/schema.prisma     — skema database lengkap (51 model, siap migrasi ke PostgreSQL)
prisma/seed.ts           — skrip data dummy (idempotent, aman dijalankan ulang)
src/lib/auth.ts          — session, login, peta peran→halaman
src/lib/session-secret.ts — resolusi SESSION_SECRET (fail-fast di produksi)
src/lib/rate-limit.ts    — lockout login & throttle endpoint publik
src/lib/logger.ts        — logging terstruktur (JSON) utk jalur kritis
src/lib/guard.ts         — pola wajib existence+ownership check sebelum mutasi
src/lib/data.ts          — semua query database per peran/modul
src/lib/ujian-helpers.ts — logika inti CBT: pengacakan soal/opsi, auto-grading
src/lib/csv.ts           — parser CSV & staging impor
src/proxy.ts             — penjaga akses berbasis peran
src/components/AppShell.tsx        — sidebar + topbar dipakai semua halaman
src/components/PengerjaanUjianClient.tsx — client component ujian (timer, autosave, autosubmit)
src/app/api/              — 113 endpoint mutasi, semua Route Handler (bukan Server Actions)
src/app/{kepsek,keuangan,guru,ortu,murid,superadmin}/ — 107 halaman per peran
tests/e2e/                — suite Playwright (40 spec, 264 test)
scripts/backup.mjs        — backup DB+upload terjadwal (siap cron)
docs/API.md               — dokumentasi API eksternal & internal
docs/readme-history/      — arsip versi README sebelumnya
```

## Catatan teknis

- Form mutasi sengaja pakai **Route Handler biasa**, bukan Server Actions — Server Actions memakai protokol RSC (multipart + action-ID hash) yang lebih rapuh untuk alur auth/mutasi kritis dan sulit ditest langsung.
- **Field tanggal-saja** (Absensi, PengajuanIzin) selalu dipotong ke **UTC midnight** (`toDateOnlyUTC` di `lib/utils.ts`), bukan `.setHours(0,0,0,0)` lokal — yang terakhir pernah menyebabkan bug pergeseran tanggal saat re-parsing nilai yang sudah tersimpan di server dengan timezone bukan UTC. Query RANGE tanggal (mis. `getRiwayatAbsensi`) juga wajib pakai suffix `Z` eksplisit di kedua batas, bukan cuma batas awal — kalau tidak, batas akhir ikut ke timezone lokal proses dan diam-diam memotong data di server ber-TZ non-UTC.
- Auto-submit ujian saat murid menutup tab pakai `navigator.sendBeacon` (jalan walau halaman sedang unload) dengan `visibilitychange` + `pagehide` + `beforeunload` sebagai pemicu redundan.
- **Nilai yang bergantung `Date.now()` dan dirender client component** (mis. "N menit lalu" di notifikasi, countdown) wajib pola hydration-safe: state kosong di render pertama (sama persis di server & client), diisi nilai asli sesudah mount lewat `useEffect` — langsung menghitung di body render menyebabkan hydration mismatch kalau momen SSR vs momen hydration client kebetulan menyeberangi batas menit.
- `DATABASE_URL` **wajib dibaca dari `process.env`, bukan di-hardcode** di skrip mana pun yang menyentuh database (termasuk `prisma/seed.ts`) — path relatif juga bisa di-resolve berbeda antar tool/proses, jadi CI & produksi sebaiknya pakai path absolut.
