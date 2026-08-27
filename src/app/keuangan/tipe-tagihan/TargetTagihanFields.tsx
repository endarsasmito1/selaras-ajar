"use client";

import { useState } from "react";

type Opsi = { value: string; label: string };

const MODE_LABEL: Record<string, string> = {
  SEMUA: "Semua siswa aktif",
  JENJANG: "Jenjang/tingkat",
  KELAS: "Kelas tertentu",
  MURID: "Murid tertentu",
};

/** 1.21 — target tagihan dulu cuma "Semua" atau 1 kelas; sekarang 4 mode (bisa multiselect
 * utk 3 mode terakhir), dipisah jadi client component krn visibilitas selector-nya bergantung
 * mode yang dipilih (radio), butuh state di client. */
export function TargetTagihanFields({
  jenjangOpsi,
  kelasOpsi,
  muridOpsi,
}: {
  jenjangOpsi: Opsi[];
  kelasOpsi: Opsi[];
  muridOpsi: Opsi[];
}) {
  const [mode, setMode] = useState<"SEMUA" | "JENJANG" | "KELAS" | "MURID">("SEMUA");

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold">Target</label>
      <div className="flex gap-3 flex-wrap text-xs">
        {(["SEMUA", "JENJANG", "KELAS", "MURID"] as const).map((m) => (
          <label key={m} className="flex items-center gap-1.5">
            <input type="radio" name="targetMode" value={m} checked={mode === m} onChange={() => setMode(m)} />
            {MODE_LABEL[m]}
          </label>
        ))}
      </div>
      {mode === "JENJANG" && (
        <select name="jenjangTargets" multiple required size={Math.min(6, jenjangOpsi.length)} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
          {jenjangOpsi.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {mode === "KELAS" && (
        <select name="kelasTargets" multiple required size={Math.min(8, kelasOpsi.length)} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
          {kelasOpsi.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {mode === "MURID" && (
        <select name="muridTargets" multiple required size={Math.min(10, muridOpsi.length)} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
          {muridOpsi.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {(mode === "JENJANG" || mode === "KELAS" || mode === "MURID") && (
        <p className="text-[11px] text-ink-soft">Tahan Ctrl/Cmd untuk pilih lebih dari satu.</p>
      )}
    </div>
  );
}
