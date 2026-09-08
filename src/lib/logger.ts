/**
 * Feedback teknis (Sep 2026) — sebelumnya NOL logging terstruktur di seluruh `src/app/api`
 * (grep `console.error`/`console.log`: 0 hit). Kalau ada exception di produksi, satu-satunya
 * jejak adalah stdout/stderr proses Next.js — gak ada request context (route, user, sekolah),
 * gak ada yang notify siapa pun. Modul ini sengaja minimal (JSON ke stdout/stderr, bukan
 * integrasi Sentry/dst) — cukup buat ngasih jejak yang bisa di-grep/di-parse, tanpa nambah
 * dependency baru. Kalau nanti pakai Sentry (rekomendasi terpisah), tinggal tambah pemanggilan
 * di `logger.error` sini, gak perlu ubah tiap call site.
 */
type LogContext = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...context };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};

/** Format error jadi context yang aman di-JSON.stringify (Error bukan plain object). */
export function errorContext(err: unknown): LogContext {
  if (err instanceof Error) return { error: err.message, stack: err.stack };
  return { error: String(err) };
}
