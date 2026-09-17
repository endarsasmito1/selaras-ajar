#!/usr/bin/env node
/**
 * Feedback teknis (Sep 2026) — sebelumnya backup cuma manual lewat tombol "Ekspor" per sekolah
 * (lihat src/app/api/ekspor/backup/route.ts, JSON per-sekolah, harus diklik kepsek/bendahara
 * satu-satu) — gak ada backup OTOMATIS terjadwal utk seluruh database + berkas upload.
 *
 * Migrasi PostgreSQL (Sep 2026) — snapshot database sekarang pakai `pg_dump` format custom (-Fc),
 * bukan lagi `better-sqlite3` `.backup()`. Format custom bisa di-restore parsial/selektif lewat
 * `pg_restore`, beda dari dump SQL polos. Supabase & provider Postgres terkelola lain biasanya
 * SUDAH menyediakan automated backup + point-in-time recovery bawaan — script ini pelengkap
 * (kepemilikan salinan sendiri di luar provider), bukan satu-satunya lapisan backup.
 *
 * CATATAN CRON — ini SENGAJA cuma script siap pakai, BELUM otomatis jalan sendiri. Tambahkan
 * baris ini ke crontab server produksi (`crontab -e`), jam 02:00 tiap hari:
 *
 *   0 2 * * * cd /path/ke/selaras-ajar-app && node scripts/backup.mjs >> /var/log/selaras-backup.log 2>&1
 *
 * Retensi default 14 hari — backup lebih tua otomatis dihapus tiap kali script ini jalan
 * (bukan proses terpisah), jadi cukup 1 baris cron, gak perlu job tambahan buat cleanup.
 *
 * Idealnya hasil `backups/` ini juga di-rsync/upload ke penyimpanan LUAR server (S3-compatible,
 * atau minimal server lain) — backup yang cuma disimpan di server yang sama gak melindungi dari
 * kegagalan server itu sendiri (disk rusak, dsb). Itu di luar cakupan script ini (butuh
 * keputusan infra/kredensial yang bukan wewenang kode ini).
 */
import "dotenv/config"; // node biasa gak auto-load .env spt Next.js/Prisma CLI — sama pola dgn prisma.config.ts
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, existsSync, cpSync, rmSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP_DIR = path.join(ROOT, "backups");
const RETENSI_HARI = 14;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL tidak di-set — cek .env / environment cron");

  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  console.log("[backup] Snapshot database via pg_dump ...");
  const dbBackupPath = path.join(BACKUP_DIR, `db-${stamp}.dump`);
  const result = spawnSync(
    "pg_dump",
    ["--format=custom", "--no-owner", "--no-privileges", `--file=${dbBackupPath}`, databaseUrl],
    { stdio: "inherit" },
  );
  if (result.error) {
    throw new Error(`pg_dump gagal dijalankan (terinstall di PATH?): ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`pg_dump keluar dengan kode ${result.status}`);
  }
  console.log(`[backup] Database tersimpan: ${dbBackupPath}`);
  console.log(`[backup] Restore lewat: pg_restore --clean --if-exists --no-owner --dbname=<DATABASE_URL_TARGET> ${dbBackupPath}`);

  const uploadsDir = path.join(ROOT, "public", "uploads");
  if (existsSync(uploadsDir)) {
    const uploadsBackupDir = path.join(BACKUP_DIR, `uploads-${stamp}`);
    console.log(`[backup] Menyalin berkas upload dari ${uploadsDir} ...`);
    cpSync(uploadsDir, uploadsBackupDir, { recursive: true });
    console.log(`[backup] Berkas upload tersalin: ${uploadsBackupDir}`);
  } else {
    console.log("[backup] Tidak ada folder public/uploads — dilewati.");
  }

  console.log(`[backup] Membersihkan backup lebih tua dari ${RETENSI_HARI} hari...`);
  const cutoff = Date.now() - RETENSI_HARI * 24 * 60 * 60 * 1000;
  for (const name of readdirSync(BACKUP_DIR)) {
    const full = path.join(BACKUP_DIR, name);
    const st = statSync(full);
    if (st.mtimeMs < cutoff) {
      if (st.isDirectory()) rmSync(full, { recursive: true, force: true });
      else unlinkSync(full);
      console.log(`[backup] Dihapus (kadaluarsa): ${name}`);
    }
  }

  console.log("[backup] Selesai.");
}

main().catch((err) => {
  console.error("[backup] GAGAL:", err);
  process.exitCode = 1;
});
