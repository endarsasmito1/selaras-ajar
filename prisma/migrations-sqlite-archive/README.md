# Arsip migration SQLite (sebelum migrasi PostgreSQL, Sep 2026)

Folder ini adalah riwayat migration lama dari masa `datasource db { provider = "sqlite" }`.
Isinya (`PRAGMA defer_foreign_keys`, dst) **tidak portable ke PostgreSQL** — makanya di-pindah ke
sini, bukan di-convert.

`prisma/migrations/` yang aktif sekarang dimulai ulang dari baseline baru lawan PostgreSQL
(lihat `rencana-migrasi-postgresql-selaras-ajar.md` di folder induk `sekolahku/`). Folder ini
disimpan cuma untuk referensi historis — jangan dipakai ulang, jangan dihapus tanpa perlu.
