# Migrasi Server Produksi ke Akun GCP Baru

Panduan ini utk pindahin `dashboard.selaras-ajar.id` dari akun GCP lama ke akun GCP baru (mis. buat manfaatin free credit baru) — disesuaikan sama setup produksi app ini yang sebenarnya: Compute Engine + Nginx + Let's Encrypt + PM2 + **SQLite lokal** + auto-deploy via GitHub Actions SSH (`deploy.sh`).

## Kenapa ini butuh hati-hati ekstra

Beda dari kebanyakan app modern, **database (SQLite) dan file upload murid/guru itu file fisik di disk server lama** — bukan managed database yang gampang di-clone. Salah urutan pas pindah = resiko data hilang atau ke-duplikat/konflik antara server lama-baru.

## Step by step

### Fase 0 — Persiapan (server lama tetap nyala terus)

1. Aktifkan billing + free credit di akun GCP baru, bikin project baru.
2. Catat spek server LAMA dulu (biar server baru minimal setara):
   ```bash
   gcloud compute instances describe <nama-instance> --zone=<zone>
   ```
   Catat machine type, disk size, OS image, region.
3. **Backup penuh server lama SEKARANG juga**, sebelum apa-apa: jalanin `scripts/backup.mjs` yang udah ada di repo (snapshot DB + upload), atau minimal `tar` folder `public/uploads/` + copy file `.db`-nya ke lokasi aman di luar server itu sendiri.

### Fase 1 — Provision server baru di akun baru

4. Bikin VM Compute Engine baru (OS/region samain, mis. Ubuntu, region deket target user — Jakarta `asia-southeast2` kalau server lama juga di situ).
5. **Reserve static external IP** buat VM baru — penting, biar gampang kalau DNS perlu di-arahin ulang tanpa nunggu propagasi 2x.
6. Setup firewall rule: buka port 80 (HTTP), 443 (HTTPS), 22 (SSH) — samain kayak server lama.

### Fase 2 — Setup environment (mirror server lama)

7. SSH ke VM baru, install: Node.js versi yang sama (cek `node -v` di server lama, samain — CI kamu pin ke Node 20), `npm i -g pm2`, Nginx, certbot.
8. `git clone` repo `selaras-ajar-app` ke `~/selaras-ajar-app`.
9. Bikin `.env` di server baru — isi `DATABASE_URL`, `SCHOOLS_API_KEY` sama persis kayak server lama. Untuk `SESSION_SECRET`: **pakai nilai yang SAMA PERSIS** kayak server lama kalau mau semua user yang lagi login gak ke-logout paksa pas cutover (kalau bikin baru, semua orang harus login ulang — bukan masalah besar, tapi worth diputuskan sadar).
10. Copy config Nginx dari server lama (`/etc/nginx/sites-available/...`) ke server baru, sesuaikan kalau ada path yang beda.

### Fase 3 — Migrasi data (bagian paling kritis)

11. **Sync pertama** (server lama masih hidup normal): `rsync -avz` file database (`.db`) + folder `public/uploads/` dari server lama ke server baru. Ini boleh dilakuin kapan aja, gak ganggu server lama.
12. Pas udah siap cutover — **pilih waktu sepi user** (malam/weekend buat sekolah), lalu:
    - Stop PM2 di server LAMA (`pm2 stop selaras-ajar`) — mulai downtime singkat di sini.
    - **Sync FINAL** (`rsync -avz --delete`) DB + uploads dari lama ke baru, biar nangkep perubahan menit-menit terakhir.
    - Jalanin `npm run build` + `pm2 start` di server BARU.
    - Test akses server baru pakai IP-nya langsung dulu (belum lewat domain) — pastiin login, lihat data, dll normal.

### Fase 4 — SSL & DNS

13. Di server baru, jalanin `certbot` buat request sertifikat SSL baru buat domain `dashboard.selaras-ajar.id` — **tapi certbot butuh DNS udah ngarah ke server baru dulu** buat validasi domain, jadi urutannya: pindahin DNS dulu → tunggu propagasi → baru certbot.
14. Update DNS record (A record) `dashboard.selaras-ajar.id` → IP static server baru.
15. Tunggu propagasi (biasanya menit-jam tergantung TTL lama). Selama ini, **JANGAN nyalain lagi PM2 di server lama** — supaya gak ada yang nulis data ke situ pas ada user yang masih ke-resolve ke IP lama (school split-brain data).

### Fase 5 — Update otomatisasi (GitHub Actions)

16. Copy public key SSH GitHub Actions ke `~/.ssh/authorized_keys` server baru (atau generate keypair baru khusus server baru).
17. Update GitHub repo secrets: `SSH_HOST` → IP baru, `SSH_USER`, `SSH_PRIVATE_KEY` kalau ganti key.
18. Test: push commit kecil (atau re-run workflow) → pastiin auto-deploy nyampe ke server BARU dengan benar.

### Fase 6 — Verifikasi & beres-beres

19. Pantau server baru beberapa hari — cek log PM2 (`pm2 logs`), cek Nginx error log, pastiin gak ada yang aneh.
20. Setelah yakin stabil: ambil 1 snapshot disk terakhir server LAMA (jaga-jaga), baru **matiin/hapus VM lama** + lepas static IP lama biar gak kena charge lagi.

## Ide lanjutan (opsional, belum dikerjakan)

- Script `rsync`/migrasi siap-pakai spesifik struktur folder app ini
- Review command `gcloud` sebelum dieksekusi
- Update `deploy.sh`/workflow biar lebih portable kalau suatu saat pindah server lagi
