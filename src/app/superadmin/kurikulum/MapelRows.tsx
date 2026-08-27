"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** 1.21 — create kurikulum & tambah mapel sekarang 1 langkah (dulu 2: buat kurikulum kosong,
 * baru tambah mapel satu-satu di halaman detail). Nama field array-style (mapelNama/mapelKkm,
 * dipasangkan berdasar index di server) — baris kosong (nama belum diisi) dilewati saat submit. */
export function MapelRows() {
  const [rows, setRows] = useState([0, 1, 2]);
  const [nextId, setNextId] = useState(3);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold">Mata pelajaran (opsional — bisa dilengkapi belakangan juga)</label>
      {rows.map((id) => (
        <div key={id} className="flex items-center gap-2">
          <input name="mapelNama" placeholder="mis. Matematika" className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <input name="mapelKkm" type="number" min={0} max={100} defaultValue={70} placeholder="KKM" className="w-24 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <button
            type="button"
            onClick={() => setRows((r) => r.filter((x) => x !== id))}
            className="text-danger text-xs px-2 shrink-0"
            aria-label="Hapus baris"
          >
            ✕
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="self-start"
        onClick={() => {
          setRows((r) => [...r, nextId]);
          setNextId((n) => n + 1);
        }}
      >
        + Tambah baris mapel
      </Button>
    </div>
  );
}
