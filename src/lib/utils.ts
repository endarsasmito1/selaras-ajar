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

/** 1.10 — "12 Agustus 2026 - 09.43" (tanggal panjang + jam pakai titik, bukan titik dua). */
export function formatTanggalWaktu(d: Date | string) {
  const jam = new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
  return `${formatTanggal(d)} - ${jam}`;
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

/** Padanan `SA_NOTIF_ENGINE.waktuRelatif` di prototipe (assets/notif.js) — dipakai bell & halaman
 * "Semua Notifikasi". Ambang kasar krn cuma buat sekilas lihat, bukan audit presisi. */
export function waktuRelatif(d: Date | string): string {
  const detik = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (detik < 60) return "Baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return formatTanggal(d);
}

/**
 * 1.21 — salam dinamis berdasar jam sekarang + honorifik dari jenisKelamin (opsional, fallback
 * tanpa honorifik kalau akun belum mengisinya — jangan asumsikan "Pak" default, itu bisa salah).
 * Pita jam: 04.00-11.59 pagi, 12.00-14.59 siang, 15.00-17.59 sore, 18.00-03.59 malam.
 */
export function getSalam(now: Date, jenisKelamin?: string | null): string {
  const jam = now.getHours();
  const waktu = jam >= 4 && jam < 12 ? "pagi" : jam >= 12 && jam < 15 ? "siang" : jam >= 15 && jam < 18 ? "sore" : "malam";
  const honorifik = jenisKelamin === "L" ? " Pak" : jenisKelamin === "P" ? " Bu" : "";
  return `Selamat ${waktu},${honorifik}`;
}
