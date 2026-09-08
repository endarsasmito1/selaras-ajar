/**
 * Feedback teknis (audit keamanan, Sep 2026) — sebelumnya `auth.ts` & `proxy.ts` masing-masing
 * punya `process.env.SESSION_SECRET ?? "dev-secret-ganti-di-produksi-..."` sendiri-sendiri, TANPA
 * fail-fast kalau env var-nya kosong di produksi. Kalau lupa/gagal ke-set (typo deploy config,
 * restart service tanpa env ter-load, dst), app tetap jalan normal tapi diam-diam pakai fallback
 * yang nilainya ada di source code publik — siapa pun yang baca repo bisa forge JWT session jadi
 * peran/sekolah apa pun tanpa password. Sekarang satu sumber kebenaran di sini, dan proses
 * langsung nolak start di produksi kalau var-nya kosong (bukan diam-diam pakai fallback).
 *
 * Edge-safe: cuma pakai `process.env` + `TextEncoder`, aman diimpor dari `proxy.ts` (Edge
 * middleware) maupun `auth.ts` (Node runtime).
 */
const FALLBACK_DEV_SECRET = "dev-secret-ganti-di-produksi-selaras-ajar";

function resolveSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET wajib di-set di produksi (lihat .env.example) — tanpa ini session JWT bisa dipalsukan pakai secret dev yang ada di source code publik."
    );
  }

  return FALLBACK_DEV_SECRET;
}

let cachedKey: Uint8Array | null = null;

/** Kunci HMAC siap pakai untuk sign/verify JWT session — di-cache setelah dihitung sekali. */
export function getSessionSecretKey(): Uint8Array {
  if (!cachedKey) {
    cachedKey = new TextEncoder().encode(resolveSessionSecret());
  }
  return cachedKey;
}
