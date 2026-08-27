"use client";

import { useEffect, useState } from "react";

/** 1.9 — countdown dalam jam ke tenggat tugas, diminta eksplisit. Update tiap menit, bukan tiap detik (cukup untuk granularitas jam). */
export function CountdownTenggat({ tenggat }: { tenggat: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(iv);
  }, []);

  if (now === null) return null;

  const diffMs = new Date(tenggat).getTime() - now;
  const lewat = diffMs < 0;
  const totalJam = Math.abs(diffMs) / (1000 * 60 * 60);
  const jam = Math.floor(totalJam);
  const menit = Math.round((totalJam - jam) * 60);

  const label = jam > 0 ? `${jam} jam ${menit} menit` : `${menit} menit`;

  return (
    <span className={lewat ? "text-danger font-semibold" : "text-ink-soft"}>
      {lewat ? `⚠ Lewat tenggat ${label}` : `⏳ ${label} lagi`}
    </span>
  );
}
