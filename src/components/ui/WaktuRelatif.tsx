"use client";

import { useEffect, useState } from "react";
import { waktuRelatif } from "@/lib/utils";

/**
 * Feedback teknis (Sep 2026) — ditemukan lewat E2E test: `waktuRelatif()` dipanggil LANGSUNG di
 * body render (NotifBell/NotifPageClient) bergantung ke `Date.now()` internal-nya. SSR & hydration
 * client jalan di 2 momen wall-clock berbeda — kalau bedanya nyebrang batas menit ("1 menit lalu"
 * jadi "2 menit lalu"), React nge-flag hydration mismatch, buang seluruh subtree & render ulang
 * dari nol di client (mahal + `Uncaught Error` di console, meski secara visual "sembuh sendiri").
 * Pola sama dgn CountdownTenggat/Sidebar: teks kosong (`null`) di render PERTAMA (sama persis di
 * server & client, gak ada yg perlu direkonsiliasi), baru diisi nilai ASLI sesudah mount client.
 */
export function WaktuRelatif({ date, className }: { date: Date | string; className?: string }) {
  const [teks, setTeks] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- disengaja, hydration-safe.
    setTeks(waktuRelatif(date));
  }, [date]);

  if (teks === null) return null;
  return <span className={className}>{teks}</span>;
}
