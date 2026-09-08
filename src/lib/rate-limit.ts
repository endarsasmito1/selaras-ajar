/**
 * Feedback teknis (Sep 2026) — sebelumnya NOL rate limiting di seluruh app: `/api/auth/login`
 * bisa dicoba tanpa batas (brute-force password), `/api/ppdb` publik bisa di-spam bikin
 * pendaftar palsu. Modul ini in-memory sederhana — cukup utk arsitektur 1 server yang sudah jadi
 * asumsi dasar app ini (sama seperti better-sqlite3). TIDAK akan berfungsi benar kalau nanti
 * scale ke >1 instance (state per-proses, gak dishare antar instance) — kalau itu terjadi, pindah
 * ke store eksternal (Redis dst) sekalian dengan migrasi DB ke Postgres, bukan ditambal di sini.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Bersihin bucket kadaluarsa scr periodik biar Map gak numpuk tanpa batas (mis. banyak IP/email
// unik dari percobaan brute-force) — interval kasar, gak perlu presisi.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

/** Sudah kena lockout krn terlalu banyak gagal login (per identifier — bisa email atau `ip:<ip>`). */
export function isLoginLocked(identifier: string): boolean {
  if (!identifier) return false;
  const bucket = buckets.get(`login:${identifier}`);
  if (!bucket || bucket.resetAt <= Date.now()) return false;
  return bucket.count >= LOGIN_MAX_ATTEMPTS;
}

/** Catat 1 percobaan login gagal. Window bergulir 15 menit sejak percobaan gagal PERTAMA. */
export function recordLoginFailure(identifier: string): void {
  if (!identifier) return;
  const key = `login:${identifier}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + LOGIN_LOCKOUT_WINDOW_MS });
  } else {
    bucket.count++;
  }
}

/** Reset counter setelah login berhasil, supaya user asli yg sempat salah ketik tak ikut kena. */
export function clearLoginFailures(identifier: string): void {
  if (!identifier) return;
  buckets.delete(`login:${identifier}`);
}

/** Throttle generik fixed-window: true = masih diizinkan (dan langsung dihitung), false = kena limit. */
export function checkThrottle(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/** IP klien dari header proxy (app ini diasumsikan jalan di belakang Nginx/reverse proxy — lihat
 *  deploy.sh). Fallback "unknown" kalau header gak ada (mis. akses langsung/dev lokal) — dipakai
 *  sbg satu bucket bersama, cukup aman krn cuma fallback dev, bukan pola normal produksi. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
