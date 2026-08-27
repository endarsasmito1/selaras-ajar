"use client";

import { useState } from "react";

/**
 * 1.23 — bug ditemukan saat testing manual: toggle field ini sebelumnya pakai
 * <script dangerouslySetInnerHTML> yang listen event `change`. Itu cuma jalan kalau halaman
 * di-load penuh (hard navigation) — browser gak pernah mengeksekusi <script> yang disisipkan lewat
 * DOM/innerHTML (termasuk hasil hydrate React), jadi begitu halaman ini dibuka lewat next/link
 * (client-side navigation — mis. tombol "Pengaturan" di halaman detail ujian), field tanggal
 * jadwal manual gak pernah muncul walau "Jadwal manual" sudah dipilih. Diganti state React biasa
 * biar gak bergantung sama eksekusi script pasca-hydrasi sama sekali.
 */
export function ModeHasilField({
  defaultModeHasil,
  defaultJadwalHasilManual,
}: {
  defaultModeHasil: string;
  defaultJadwalHasilManual: string;
}) {
  const [modeHasil, setModeHasil] = useState(defaultModeHasil);

  return (
    <>
      <select
        name="modeHasil"
        value={modeHasil}
        onChange={(e) => setModeHasil(e.target.value)}
        className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm"
      >
        <option value="OTOMATIS_SUBMIT">Otomatis segera setelah submit</option>
        <option value="SETELAH_JADWAL_BERAKHIR">Setelah jadwal akses kelasnya berakhir</option>
        <option value="JADWAL_MANUAL">Jadwal manual (tentukan tanggal/jam sendiri)</option>
      </select>
      <p className="text-[11px] text-ink-soft">
        &quot;Otomatis segera setelah submit&quot; cuma efektif kalau semua soal auto-grade (PG/PG Kompleks/PG Nilai Minus/Jawaban Singkat) — kalau ada esai, tetap nunggu guru koreksi manual dulu.
      </p>
      {modeHasil === "JADWAL_MANUAL" && (
        <div className="flex flex-col gap-1.5 mt-1">
          <label className="text-[11px] text-ink-soft">Tanggal &amp; jam hasil ditampilkan</label>
          <input
            type="datetime-local"
            name="jadwalHasilManual"
            defaultValue={defaultJadwalHasilManual}
            className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm w-64"
          />
        </div>
      )}
    </>
  );
}
