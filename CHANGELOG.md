# Changelog

Semua perubahan penting pada Selaras Ajar dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/) (`MAYOR.MINOR.PATCH`):

- **MAYOR** — perubahan yang gak kompatibel dengan versi sebelumnya (mis. skema data berubah drastis, alur inti berubah)
- **MINOR** — fitur baru yang tetap kompatibel
- **PATCH** — perbaikan bug, tanpa fitur baru

## [Unreleased]

### Ditambahkan

- Fail-fast `SESSION_SECRET` di produksi (nolak start drpd diam-diam pakai fallback dev) + `.env.example`
- Rate limiting: lockout login (per-email & per-IP) dan throttle `/api/ppdb`
- Logging terstruktur (JSON) di jalur kritis: pembayaran, penilaian ujian, absensi
- Helper `assertOwned()`/`NotFoundError` (`src/lib/guard.ts`) — pola wajib existence+ownership check sebelum mutasi
- Script backup otomatis (`scripts/backup.mjs`, WAL-safe, DB + upload, retensi 14 hari) — siap pakai via cron, belum terjadwal otomatis
- CI: suite Playwright (264 test) sekarang jadi gate wajib sebelum deploy & sebelum merge PR ke `main`
- Dokumentasi API lengkap (`docs/API.md`) — eksternal `/api/v1` (API key) + referensi seluruh endpoint internal

### Diperbaiki

- 6 rute API tambahan dengan celah "mutasi pakai id mentah tanpa validasi existence/tenant/ownership" (lanjutan dari 5 rute di audit sebelumnya) — lihat `rencana-penggabungan-ui-backend-selaras-ajar.md` §17
- `prisma/seed.ts`: 2 bug urutan penghapusan (Notifikasi tak pernah dibersihkan, Kelas.waliKelasId dihapus setelah Pengguna) yang bikin reseed kedua+ selalu gagal FK constraint
- `package.json`: pin versi exact utk Next/React/Prisma; `db:reset` pakai flag `--skip-seed` yang sudah tak ada di Prisma 7
- 10 error lint pre-existing di source app (unescaped entity, `<a>` vs `<Link>`, 4x `setState`-di-effect tanpa disclaimer) — gak pernah ketauan krn `npm run lint` belum pernah jadi bagian CI sebelum ini
- **`getRiwayatAbsensi` (`src/lib/data.ts`)** — bug timezone di batas akhir tanggal (parsing tanpa "Z" eksplisit jatuh ke TZ lokal proses, bukan UTC); di server ber-TZ non-UTC diam-diam melewatkan baris absensi yang dicatat menjelang akhir hari
- **`NotifBell`/`NotifPageClient`** — hydration mismatch asli (`waktuRelatif()` dihitung langsung di render, beda hasil antara momen SSR vs client hydration) — komponen baru `WaktuRelatif.tsx` (pola hydration-safe, konsisten dgn `CountdownTenggat`/`Sidebar`)
- ~25 test E2E stale (locator `<details>`/`<summary>` yang sudah gak ada sejak form dipindah ke `<Drawer>`, teks UI yang berubah, selector ambigu, asumsi seed data yang sudah tak berlaku, 13 baseline screenshot visual regression yang basi) di 13 file spec — suite sekarang **263 lolos, 1 skip (precondition data tak terpenuhi, disengaja), 0 gagal**

## [1.0.0] - 2026-08-27

Rilis produksi pertama — live di `dashboard.selaras-ajar.id`.

### Ditambahkan

- Modul Ujian/CBT lengkap: bank soal, susun ujian, pengaturan (acak soal/opsi, durasi, sekali akses), pengerjaan murid dengan autosave & autosubmit, penilaian (auto-grade + esai manual), analisis hasil
- Modul akademik: absensi, nilai (dengan pengaturan bobot/KKM/predikat), tugas/PR, materi belajar, tanya jawab kelas
- Modul komunikasi: pesan berulir guru–orang tua, pengajuan & persetujuan izin (auto-isi absensi)
- Modul keuangan: tagihan SPP, transparansi pemakaian dana
- Modul administrasi: data siswa & guru, mutasi siswa, kenaikan kelas massal, PPDB publik, kalender akademik, consent UU PDP
- Ekspor/impor CSV data siswa & nilai (format kompatibel Dapodik/e-Rapor)
- Landing page publik terpisah dari dashboard aplikasi (`selaras-ajar.id` vs `dashboard.selaras-ajar.id`)
- Deploy produksi: GCP Compute Engine, Nginx reverse proxy + SSL (Let's Encrypt), PM2, auto-deploy via GitHub Actions

### Diketahui belum ada

Lihat README bagian "Yang belum diimplementasikan" — notifikasi WhatsApp sungguhan, payment gateway sungguhan, generator rapor PDF, dan beberapa penyederhanaan lain yang sengaja ditunda.

[Unreleased]: https://github.com/endarsasmito1/selaras-ajar/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/endarsasmito1/selaras-ajar/releases/tag/v1.0.0
