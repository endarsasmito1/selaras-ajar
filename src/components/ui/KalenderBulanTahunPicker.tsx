"use client";

import { useRouter } from "next/navigation";

const BULAN_NAMA = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/**
 * Feedback teknis (Sep 2026) — sebelumnya navigasi kalender cuma panah "Bulan lalu/depan" (harus
 * diklik berkali-kali buat lompat jauh, mis. dari bulan berjalan ke awal tahun ajaran). Dropdown ini
 * TAMBAHAN (panah tetap ada) — komponen client kecil karena butuh onChange auto-navigate, sisanya
 * (grid kalender, agenda) tetap Server Component seperti semula.
 */
export function KalenderBulanTahunPicker({ tahun, bulanIdx }: { tahun: number; bulanIdx: number }) {
  const router = useRouter();
  const tahunOpsi = Array.from({ length: 11 }, (_, i) => tahun - 5 + i);

  function navigasi(bulanBaru: number, tahunBaru: number) {
    router.push(`?bulan=${tahunBaru}-${String(bulanBaru).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="Pilih bulan"
        value={bulanIdx}
        onChange={(e) => navigasi(Number(e.target.value), tahun)}
        className="bg-paper border border-rule rounded-lg px-2 py-1.5 text-sm"
      >
        {BULAN_NAMA.map((nama, i) => (
          <option key={nama} value={i + 1}>{nama}</option>
        ))}
      </select>
      <select
        aria-label="Pilih tahun"
        value={tahun}
        onChange={(e) => navigasi(bulanIdx, Number(e.target.value))}
        className="bg-paper border border-rule rounded-lg px-2 py-1.5 text-sm"
      >
        {tahunOpsi.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
