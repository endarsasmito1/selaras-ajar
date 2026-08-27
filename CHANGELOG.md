# Changelog

Semua perubahan penting pada Selaras Ajar dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/) (`MAYOR.MINOR.PATCH`):

- **MAYOR** — perubahan yang gak kompatibel dengan versi sebelumnya (mis. skema data berubah drastis, alur inti berubah)
- **MINOR** — fitur baru yang tetap kompatibel
- **PATCH** — perbaikan bug, tanpa fitur baru

## [Unreleased]

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
