# Changelog

Semua perubahan penting pada Selaras Ajar dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/) (`MAYOR.MINOR.PATCH`):

- **MAYOR** — perubahan yang gak kompatibel dengan versi sebelumnya (mis. skema data berubah drastis, alur inti berubah)
- **MINOR** — fitur baru yang tetap kompatibel
- **PATCH** — perbaikan bug, tanpa fitur baru

## [Unreleased]

## [1.1.0] - 2026-09-15

### Ditambahkan

- Fail-fast `SESSION_SECRET` di produksi (nolak start drpd diam-diam pakai fallback dev) + `.env.example`
- Rate limiting: lockout login (per-email & per-IP) dan throttle `/api/ppdb`
- Logging terstruktur (JSON) di jalur kritis: pembayaran, penilaian ujian, absensi
- Helper `assertOwned()`/`NotFoundError` (`src/lib/guard.ts`) — pola wajib existence+ownership check sebelum mutasi
- Script backup otomatis (`scripts/backup.mjs`, WAL-safe, DB + upload, retensi 14 hari) — siap pakai via cron, belum terjadwal otomatis
- CI: suite Playwright (264 test) sekarang jadi gate wajib sebelum deploy & sebelum merge PR ke `main`
- Dokumentasi API lengkap (`docs/API.md`) — eksternal `/api/v1` (API key) + referensi seluruh endpoint internal
- Pola **Toast & Drawer** (§7.1/7.4 design system) buat feedback aksi & edit-inline tanpa pindah halaman — komponen baru `Drawer.tsx`/`ToastFromQuery.tsx`, dipasang bertahap per-kelompok (diverifikasi satu-satu) ke ~22 alur: ubah alamat sekolah, ubah kurikulum, input nilai, absensi, ajukan izin, pengumuman, mutasi siswa, jenis/buat tagihan, data guru, bank soal (guru & superadmin), master data kelas/mapel
- Kartu per mata pelajaran di halaman **Ujian & Latihan murid**, gantiin list flat yang gampang penuh (bisa puluhan ujian sekaligus) — plus section "Perlu dikerjakan sekarang" yang dibatasi ke beberapa item paling mendesak (bukan nampilin semua, biar gak balik saturated)
- Widget tanggal & waktu relatif hydration-safe di topbar/kalender (`TanggalHariIni.tsx`, `KalenderBulanTahunPicker.tsx`)
- Dialog konfirmasi (`ConfirmSubmitButton`/`ConfirmSubmitLink`) di aksi-aksi sensitif tambahan: ganti password, upload foto profil, setujui/tolak izin dari Absensi, buat ujian baru, simpan pengaturan ujian
- Script bantu data dummy (`scripts/inject-dummy-guru-multi-kelas.ts`, `inject-dummy-jadwal-materi-tanya.ts`) + panduannya (`docs/panduan-data-dummy-guru-multi-kelas.md`)
- Panduan migrasi server GCP (`docs/migrasi-server-gcp.md`)

### Diperbaiki

- 6 rute API tambahan dengan celah "mutasi pakai id mentah tanpa validasi existence/tenant/ownership" (lanjutan dari 5 rute di audit sebelumnya) — lihat `rencana-penggabungan-ui-backend-selaras-ajar.md` §17
- `prisma/seed.ts`: 2 bug urutan penghapusan (Notifikasi tak pernah dibersihkan, Kelas.waliKelasId dihapus setelah Pengguna) yang bikin reseed kedua+ selalu gagal FK constraint
- `package.json`: pin versi exact utk Next/React/Prisma; `db:reset` pakai flag `--skip-seed` yang sudah tak ada di Prisma 7
- 10 error lint pre-existing di source app (unescaped entity, `<a>` vs `<Link>`, 4x `setState`-di-effect tanpa disclaimer) — gak pernah ketauan krn `npm run lint` belum pernah jadi bagian CI sebelum ini
- **`getRiwayatAbsensi` (`src/lib/data.ts`)** — bug timezone di batas akhir tanggal (parsing tanpa "Z" eksplisit jatuh ke TZ lokal proses, bukan UTC); di server ber-TZ non-UTC diam-diam melewatkan baris absensi yang dicatat menjelang akhir hari
- **`NotifBell`/`NotifPageClient`** — hydration mismatch asli (`waktuRelatif()` dihitung langsung di render, beda hasil antara momen SSR vs client hydration) — komponen baru `WaktuRelatif.tsx` (pola hydration-safe, konsisten dgn `CountdownTenggat`/`Sidebar`)
- ~25 test E2E stale (locator `<details>`/`<summary>` yang sudah gak ada sejak form dipindah ke `<Drawer>`, teks UI yang berubah, selector ambigu, asumsi seed data yang sudah tak berlaku, 13 baseline screenshot visual regression yang basi) di 13 file spec — suite sekarang **263 lolos, 1 skip (precondition data tak terpenuhi, disengaja), 0 gagal**
- **Video & silabus contoh materi belajar 404** — path file placeholder di `prisma/seed.ts` gak pernah benar-benar ada di `public/uploads/`; video player murid nyangkut loading permanen & link "Lihat silabus" mati. Diganti file demo asli (video 6 detik via ffmpeg, 2 PDF valid)
- **TU gak bisa pakai 4 dari 5 aksi di halaman Ekspor/Impor Data** meski menu-nya sendiri kasih akses — role check API (`/api/ekspor/siswa`, `/nilai`, `/api/impor/siswa/preview`, `/commit`) gak diupdate pas TU ditambahkan ke nav. Tombol "Backup Lengkap (JSON)" sengaja tetap disembunyikan dari TU (isinya data tagihan, di luar wewenang TU)
- **Grafik "Proyeksi keuangan" & default filter "Periode" di Keuangan/SPP salah urutan** (periode terlama muncul sbg default, tren bulanan kebalik arah waktu) — `jatuhTempo` SPP antar bulan di seed ke-tie (semua sama persis), ditambah query proyeksi ikut ngitung periode tagihan tahunan (Buku Paket/Seragam) yang gak sepadan dibanding SPP bulanan

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

[Unreleased]: https://github.com/endarsasmito1/selaras-ajar/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/endarsasmito1/selaras-ajar/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/endarsasmito1/selaras-ajar/releases/tag/v1.0.0
