import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}

export function formatTanggal(d: Date | string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Potong ke tengah malam UTC (bukan local time). Dipakai untuk field tanggal-saja
 * (Absensi.tanggal, dsb) supaya konsisten dengan cara `<input type="date">` di-parse
 * (`new Date("2026-08-20")` = UTC midnight). Jangan pakai `.setHours(0,0,0,0)` untuk ini —
 * itu potong di local time dan bisa geser ke hari sebelumnya kalau timezone server bukan UTC.
 */
export function toDateOnlyUTC(d: Date | string): Date {
  const parsed = new Date(d);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}
