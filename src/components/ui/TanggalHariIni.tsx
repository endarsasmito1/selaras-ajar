"use client";

import { useEffect, useState } from "react";
import { formatHariTanggal } from "@/lib/utils";

/**
 * Feedback teknis (Sep 2026) — widget "Senin, 8 September 2026" di topbar, tampil di semua halaman.
 * Pola hydration-safe sama seperti WaktuRelatif/CountdownTenggat: null di render pertama (identik
 * server & client), diisi nilai asli setelah mount, supaya tak nyebrang hari SSR vs client dan
 * gak kena hydration mismatch. Refresh tiap menit — cukup buat nangkep pergantian hari tengah malam
 * kalau halaman dibiarkan terbuka lintas hari, tanpa perlu re-render tiap detik.
 */
export function TanggalHariIni({ className }: { className?: string }) {
  const [teks, setTeks] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- disengaja, hydration-safe.
    setTeks(formatHariTanggal(new Date()));
    const interval = setInterval(() => setTeks(formatHariTanggal(new Date())), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (teks === null) return null;
  return <span className={className}>{teks}</span>;
}
