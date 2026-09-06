"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warn";

const TONE_CLASS: Record<Tone, string> = {
  default: "bg-ink text-white",
  success: "bg-success text-white",
  warn: "bg-warning text-white",
};

/**
 * §7.4 ui-design-system-selaras-ajar.md — toast transient pojok layar, auto-hilang ~3-4 detik,
 * bisa ditutup manual. Fase 4 (percobaan): dipakai pertama kali menggantikan `<Callout>` inline utk
 * "Ubah alamat sekolah" (kepsek/page.tsx) sebelum diperluas ke halaman/route lain.
 *
 * Sengaja BUKAN dibangun di atas `useSearchParams()` (butuh <Suspense> boundary di App Router) —
 * baca `window.location.search` langsung di `useEffect`, lalu bersihkan param dari URL lewat
 * `history.replaceState` (tanpa navigasi/reload) supaya refresh & tombol back tak memicu toast yang
 * sama muncul lagi. Pola query-param ini konsisten dengan flash message existing (`?error=`,
 * `?nilai_disimpan=`, dst) di seluruh app — bedanya di sini dirender sbg toast, bukan `<Callout>`.
 */
export function ToastFromQuery({ param = "toast", toneParam = "tone" }: { param?: string; toneParam?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("default");
  const [visible, setVisible] = useState(false);

  // Effect #1: baca & bersihkan query param — sekali jalan (idempotent kalau dipanggil 2x, mis.
  // React Strict Mode dev: invokasi kedua gak nemu apa-apa lagi krn URL sudah dibersihkan invokasi
  // pertama, jadi cuma no-op, bukan bug).
  useEffect(() => {
    const url = new URL(window.location.href);
    const m = url.searchParams.get(param);
    if (!m) return;

    setMessage(m);
    const t = url.searchParams.get(toneParam);
    setTone(t === "success" || t === "warn" ? t : "default");

    url.searchParams.delete(param);
    url.searchParams.delete(toneParam);
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", url.pathname + (qs ? `?${qs}` : ""));
  }, [param, toneParam]);

  // Effect #2: animasi masuk + auto-hide, digantung ke state `message` (bukan ke efek #1 di atas).
  // Sengaja dipisah dari #1 — kalau digabung, Strict Mode dev me-invoke efek 2x (mount→cleanup→
  // mount): invokasi kedua efek gabungan itu gak nemu param lagi (sudah dihapus dari URL oleh
  // invokasi pertama) jadi gak pasang timer baru, sementara cleanup-nya keburu membatalkan timer
  // dari invokasi pertama — hasilnya toast nyangkut gak pernah hilang. Effect #2 di sini cuma
  // gantung ke `message` (state React biasa, bukan window.location yang "dikonsumsi" sekali), jadi
  // re-invoke Strict Mode-nya aman: kedua invokasi lihat `message` yang sama, timer selalu terpasang.
  useEffect(() => {
    if (!message) return;
    // Dua frame biar transisi opacity/translate benar-benar jalan (bukan langsung end-state).
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const hideTimer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(hideTimer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all duration-200 max-w-sm",
        TONE_CLASS[tone],
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="opacity-70 hover:opacity-100 shrink-0"
        aria-label="Tutup notifikasi"
      >
        ✕
      </button>
    </div>
  );
}
