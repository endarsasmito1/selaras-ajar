import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL tidak di-set — cek .env (connection string PostgreSQL/Supabase)");
}

// Bugfix (Sep 2026) — samakan dgn prisma/seed.ts: `pg` (node-postgres) defaultnya TIDAK punya
// timeout koneksi/statement sama sekali (`connectionTimeoutMillis`/`statement_timeout`/
// `query_timeout` semua off by default), jadi kalau pooler Supabase pernah nge-hang nerima
// koneksi baru, request app bisa nyangkut TANPA BATAS WAKTU tanpa error — persis penyebab hang
// 40+ menit yang ditemukan di seed. Timeout eksplisit ini bikin itu gagal keras & cepat drpd
// nyangkut senyap.
// Supabase Session Pooler (compute Nano) cuma py 15 koneksi backend total — DIBAGI bareng proses
// internal Supabase sendiri (PostgREST, Realtime, dst), bukan eksklusif buat app ini. `pg.Pool`
// default `max:10` kalau gak di-set — app (proses ini) + prisma/seed.ts (proses TERPISAH, py pool
// sendiri lagi) jalan BERSAMAAN pas E2E test (seed dipanggil sbg child process dari globalSetup
// sementara webServer/next dev tetap hidup), jadi bisa sampai 20 koneksi rebutan 15 slot — inilah
// penyebab asli `ECHECKOUTTIMEOUT`/"Connection terminated due to connection timeout" yang berulang
// kali kejadian pas migrasi. Dibagi konservatif: app 4, seed 6 (lihat prisma/seed.ts) = 10, sisa
// slot buat proses internal Supabase & tool diagnostik manual.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  connectionTimeoutMillis: 15_000,
  statement_timeout: 30_000,
  query_timeout: 30_000,
  idle_in_transaction_session_timeout: 30_000,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
