# Indeks Versi README

README aktif selalu ada di [root repo](../../README.md). Tiap kali isinya berubah signifikan (bukan sekadar typo/link kecil), versi LAMA-nya diarsipkan di sini sebelum ditulis ulang — supaya riwayat "app ini dulunya kelihatan/dideskripsikan seperti apa" tidak hilang begitu saja, terpisah dari [CHANGELOG.md](../../CHANGELOG.md) yang mencatat perubahan KODE, bukan perubahan DESKRIPSI/README-nya sendiri.

| Versi | Tanggal arsip | Ringkasan saat itu |
|---|---|---|
| [v1.0.0](./README-v1.0.0.md) | 27 Agustus 2026 | Rilis produksi pertama — ~45 endpoint API, ~55 halaman, deskripsi modul PRD lengkap (Ujian/CBT, Akademik, Komunikasi, Keuangan, Administrasi, Ekspor/Impor). Belum menyebut suite E2E, `docs/API.md`, atau pengerasan keamanan (rate limiting, logging, dsb) — semua itu ditambahkan sesudahnya. |

Untuk menambah entri baru di sini: salin `README.md` root ke `README-v<versi>.md` di folder ini, tempel catatan arsip (lihat contoh di `README-v1.0.0.md`) di baris paling atas, lalu tambah 1 baris ke tabel di atas.
