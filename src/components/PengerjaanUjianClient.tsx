"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sanitizeSoalHtml } from "@/lib/sanitize-html";

export type SoalTampil = {
  soalId: string;
  jenis: "PILIHAN_GANDA" | "PILIHAN_GANDA_KOMPLEKS" | "PILIHAN_GANDA_MINUS" | "JAWABAN_SINGKAT" | "ESAI";
  pertanyaan: string;
  poin: number;
  opsiTampil?: { originalIndex: number; text: string }[];
  jawabanPGTersimpan: number | null;
  jawabanPGMultiTersimpan?: number[] | null;
  jawabanTeksTersimpan: string | null;
  /** 1.23 — cuma dipakai jenis ESAI/JAWABAN_SINGKAT, batas waktu per-soal (soft enforcement). */
  durasiDetik?: number | null;
};

const HURUF = ["A", "B", "C", "D", "E", "F"];

export default function PengerjaanUjianClient({
  pengerjaanId,
  judul,
  kelasNama,
  siswaNama,
  nisn,
  soal,
  batasWaktuIso,
}: {
  pengerjaanId: string;
  judul: string;
  kelasNama: string;
  siswaNama: string;
  nisn: string;
  soal: SoalTampil[];
  batasWaktuIso: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [jawabanPG, setJawabanPG] = useState<Record<string, number>>(
    Object.fromEntries(soal.filter((s) => s.jawabanPGTersimpan !== null).map((s) => [s.soalId, s.jawabanPGTersimpan as number]))
  );
  const [jawabanPGMulti, setJawabanPGMulti] = useState<Record<string, number[]>>(
    Object.fromEntries(soal.filter((s) => s.jawabanPGMultiTersimpan && s.jawabanPGMultiTersimpan.length > 0).map((s) => [s.soalId, s.jawabanPGMultiTersimpan as number[]]))
  );
  const [jawabanTeks, setJawabanTeks] = useState<Record<string, string>>(
    Object.fromEntries(soal.filter((s) => s.jawabanTeksTersimpan).map((s) => [s.soalId, s.jawabanTeksTersimpan as string]))
  );
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const submittedRef = useRef(false);

  const soalAktif = soal[index];

  // ----- Autosave -----
  const simpanJawaban = useCallback(
    (soalId: string, data: { jawabanPG?: number; jawabanPGMulti?: number[]; jawabanTeks?: string }) => {
      fetch("/api/ujian/jawab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pengerjaanId, soalId, ...data }),
      })
        .then(() => setSavedTick((t) => t + 1))
        .catch(() => {});
    },
    [pengerjaanId]
  );

  function pilihPG(soalId: string, originalIndex: number) {
    setJawabanPG((prev) => ({ ...prev, [soalId]: originalIndex }));
    simpanJawaban(soalId, { jawabanPG: originalIndex });
  }

  function toggleMulti(soalId: string, originalIndex: number) {
    setJawabanPGMulti((prev) => {
      const current = prev[soalId] ?? [];
      const next = current.includes(originalIndex) ? current.filter((v) => v !== originalIndex) : [...current, originalIndex].sort((a, b) => a - b);
      simpanJawaban(soalId, { jawabanPGMulti: next });
      return { ...prev, [soalId]: next };
    });
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function ubahTeks(soalId: string, value: string) {
    setJawabanTeks((prev) => ({ ...prev, [soalId]: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => simpanJawaban(soalId, { jawabanTeks: value }), 600);
  }

  // ----- Submit (manual) -----
  async function submitUjian(auto: boolean) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await fetch("/api/ujian/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pengerjaanId, auto }),
      });
    } catch {
      // abaikan — pengerjaan tetap tercatat lewat autosave
    }
    if (!auto) router.push("/murid/ujian");
  }

  // ----- Auto-submit saat keluar/tutup halaman -----
  useEffect(() => {
    function beacon() {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const blob = new Blob([JSON.stringify({ pengerjaanId, auto: true })], { type: "application/json" });
      navigator.sendBeacon("/api/ujian/submit", blob);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") beacon();
    }
    window.addEventListener("pagehide", beacon);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", beacon);
    return () => {
      window.removeEventListener("pagehide", beacon);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", beacon);
    };
  }, [pengerjaanId]);

  // ----- Timer -----
  const [sisaDetik, setSisaDetik] = useState<number | null>(null);
  useEffect(() => {
    if (!batasWaktuIso) return;
    const batas = new Date(batasWaktuIso).getTime();
    function tick() {
      const sisa = Math.max(0, Math.floor((batas - Date.now()) / 1000));
      setSisaDetik(sisa);
      if (sisa <= 0) submitUjian(true).then(() => router.push("/murid/ujian"));
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batasWaktuIso]);

  // 1.23 — timer PER-SOAL (cuma esai/jawaban singkat yang guru kasih durasiDetik), reset tiap
  // pindah soal. Soft enforcement: begitu habis, otomatis pindah ke soal berikutnya (jawaban yang
  // sudah diketik TETAP tersimpan via autosave, tidak dibuang) — bukan auto-submit seluruh ujian.
  const [sisaDetikSoal, setSisaDetikSoal] = useState<number | null>(null);
  useEffect(() => {
    const durasi = soal[index]?.durasiDetik;
    if (!durasi) {
      setSisaDetikSoal(null);
      return;
    }
    const mulai = Date.now();
    function tick() {
      const sisa = Math.max(0, durasi! - Math.floor((Date.now() - mulai) / 1000));
      setSisaDetikSoal(sisa);
      if (sisa <= 0) setIndex((i) => Math.min(soal.length - 1, i + 1));
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const jumlahTerjawab = soal.filter(
    (s) => jawabanPG[s.soalId] !== undefined || (jawabanPGMulti[s.soalId]?.length ?? 0) > 0 || (jawabanTeks[s.soalId] ?? "").trim() !== ""
  ).length;

  function fmtWaktu(detik: number) {
    const m = Math.floor(detik / 60);
    const s = detik % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // 1.21 — ringkasan jawaban per soal utk layar tinjau sebelum submit (bukan cuma "terjawab/belum",
  // tampilkan isi jawabannya biar murid benar-benar bisa cek sebelum final).
  function ringkasanJawaban(s: SoalTampil): string {
    if (s.jenis === "PILIHAN_GANDA" || s.jenis === "PILIHAN_GANDA_MINUS") {
      const idx = jawabanPG[s.soalId];
      if (idx === undefined) return "";
      return s.opsiTampil?.find((o) => o.originalIndex === idx)?.text ?? "";
    }
    if (s.jenis === "PILIHAN_GANDA_KOMPLEKS") {
      const idxs = jawabanPGMulti[s.soalId] ?? [];
      if (idxs.length === 0) return "";
      return idxs.map((idx) => s.opsiTampil?.find((o) => o.originalIndex === idx)?.text ?? "").join(", ");
    }
    return (jawabanTeks[s.soalId] ?? "").trim();
  }

  return (
    <div>
      <div className="bg-[#3D6C5F] text-[#F5F3EA] px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-serif text-base">{judul} — Kelas {kelasNama}</div>
          <div className="text-xs opacity-85">{siswaNama} · NISN {nisn}</div>
        </div>
        {sisaDetik !== null && (
          <div className="text-right">
            <div className="text-[11px] opacity-80 tracking-wide uppercase">Sisa waktu</div>
            <div className="font-serif text-xl tabnum">{fmtWaktu(sisaDetik)}</div>
          </div>
        )}
      </div>

      {showReview ? (
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-paper-raised border border-rule rounded-2xl p-7 shadow-sm">
            <h2 className="font-serif text-xl mb-1.5">Tinjau jawabanmu sebelum dikumpulkan</h2>
            <p className="text-sm text-ink-soft mb-5">
              <b>{jumlahTerjawab}</b> dari <b>{soal.length}</b> soal terjawab. Klik satu soal untuk kembali & ubah jawabannya. Setelah dikumpulkan, jawaban tidak bisa diubah lagi.
            </p>
            <div className="flex flex-col gap-2 mb-6 max-h-[50vh] overflow-y-auto">
              {soal.map((s, i) => {
                const ringkas = ringkasanJawaban(s);
                return (
                  <button
                    key={s.soalId}
                    onClick={() => {
                      setShowReview(false);
                      setIndex(i);
                    }}
                    className="flex items-start gap-3 text-left px-3.5 py-2.5 rounded-lg border border-rule hover:bg-paper"
                  >
                    <span className="w-6 h-6 rounded-md bg-paper-sunken text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm">
                      {ringkas ? ringkas : <span className="text-warning italic">Belum dijawab</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setShowReview(false)} className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-rule">
                ← Kembali, masih mau ubah jawaban
              </button>
              <button
                onClick={() => submitUjian(false)}
                disabled={submitting}
                className="flex-1 bg-accent text-[#3A2C10] font-semibold text-sm py-2.5 rounded-lg disabled:opacity-60"
              >
                {submitting ? "Mengirim…" : "Ya, kumpulkan sekarang"}
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-warning-tint border border-warning/35 text-warning rounded-lg px-4 py-3 text-xs mb-5">
          ⚠ Jangan tutup atau tinggalkan halaman ini. Jika keluar, ujian dianggap <b>selesai</b> dan jawaban yang sudah diisi otomatis dikumpulkan.
        </div>

        <div className="grid md:grid-cols-[1fr_250px] gap-5">
          <div className="bg-paper-raised border border-rule rounded-2xl p-7 shadow-sm">
            <div className="flex justify-between text-xs text-ink-soft mb-2.5">
              <span>Soal {index + 1} dari {soal.length}</span>
              <span className="flex items-center gap-2">
                {soalAktif.jenis === "PILIHAN_GANDA" ? "Pilihan Ganda" : soalAktif.jenis === "PILIHAN_GANDA_MINUS" ? "Pilihan Ganda (ada nilai minus jika salah)" : soalAktif.jenis === "PILIHAN_GANDA_KOMPLEKS" ? "Pilihan Ganda Kompleks — bisa >1 jawaban" : soalAktif.jenis === "JAWABAN_SINGKAT" ? "Jawaban Singkat" : "Esai"} · {soalAktif.poin} poin
                {sisaDetikSoal !== null && (
                  <span className={"font-semibold tabnum " + (sisaDetikSoal <= 10 ? "text-danger" : "text-ink")}>
                    ⏱ {fmtWaktu(sisaDetikSoal)}
                  </span>
                )}
              </span>
            </div>
            <div className="text-[17px] mb-5 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeSoalHtml(soalAktif.pertanyaan) }} />

            {(soalAktif.jenis === "PILIHAN_GANDA" || soalAktif.jenis === "PILIHAN_GANDA_MINUS") &&
              soalAktif.opsiTampil?.map((o, i) => {
                const dipilih = jawabanPG[soalAktif.soalId] === o.originalIndex;
                return (
                  <button
                    key={i}
                    onClick={() => pilihPG(soalAktif.soalId, o.originalIndex)}
                    className={
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-[1.5px] mb-2.5 text-left text-[14.5px] " +
                      (dipilih ? "border-primary bg-primary-tint" : "border-rule bg-paper hover:border-primary/50")
                    }
                  >
                    <span className={"w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[13px] shrink-0 " + (dipilih ? "bg-primary text-white" : "bg-paper-sunken")}>
                      {HURUF[i]}
                    </span>
                    {o.text}
                  </button>
                );
              })}

            {soalAktif.jenis === "PILIHAN_GANDA_KOMPLEKS" && (
              <>
                <p className="text-xs text-ink-soft mb-2.5">Boleh pilih lebih dari satu jawaban.</p>
                {soalAktif.opsiTampil?.map((o, i) => {
                  const dipilih = (jawabanPGMulti[soalAktif.soalId] ?? []).includes(o.originalIndex);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleMulti(soalAktif.soalId, o.originalIndex)}
                      className={
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-[1.5px] mb-2.5 text-left text-[14.5px] " +
                        (dipilih ? "border-primary bg-primary-tint" : "border-rule bg-paper hover:border-primary/50")
                      }
                    >
                      <span className={"w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[13px] shrink-0 " + (dipilih ? "bg-primary text-white" : "bg-paper-sunken")}>
                        {dipilih ? "☑" : HURUF[i]}
                      </span>
                      {o.text}
                    </button>
                  );
                })}
              </>
            )}

            {(soalAktif.jenis === "JAWABAN_SINGKAT" || soalAktif.jenis === "ESAI") && (
              <textarea
                value={jawabanTeks[soalAktif.soalId] ?? ""}
                onChange={(e) => ubahTeks(soalAktif.soalId, e.target.value)}
                rows={soalAktif.jenis === "ESAI" ? 6 : 2}
                placeholder="Tulis jawabanmu di sini…"
                className="w-full bg-paper border border-rule rounded-lg px-3.5 py-3 text-sm"
              />
            )}

            <div className="text-xs text-success text-center mt-3 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success inline-block" /> Jawaban tersimpan otomatis
            </div>

            <div className="h-px bg-rule my-5" />
            <div className="flex justify-between">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="text-sm px-4 py-2 rounded-lg border border-rule disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFlagged((prev) => {
                      const next = new Set(prev);
                      next.has(soalAktif.soalId) ? next.delete(soalAktif.soalId) : next.add(soalAktif.soalId);
                      return next;
                    })
                  }
                  className="text-sm px-4 py-2 rounded-lg border border-rule"
                >
                  ⚑ {flagged.has(soalAktif.soalId) ? "Batal ragu" : "Tandai ragu"}
                </button>
                {index < soal.length - 1 ? (
                  <button onClick={() => setIndex((i) => Math.min(soal.length - 1, i + 1))} className="text-sm px-4 py-2 rounded-lg bg-primary text-white">
                    Berikutnya →
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bg-paper-raised border border-rule rounded-2xl p-4.5 h-max">
            <div className="text-[11px] uppercase tracking-wide text-ink-soft text-center mb-3">Navigasi soal</div>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {soal.map((s, i) => {
                const terjawab = jawabanPG[s.soalId] !== undefined || (jawabanPGMulti[s.soalId]?.length ?? 0) > 0 || (jawabanTeks[s.soalId] ?? "").trim() !== "";
                const isFlagged = flagged.has(s.soalId);
                return (
                  <button
                    key={s.soalId}
                    onClick={() => setIndex(i)}
                    className={
                      "aspect-square rounded-md text-xs font-semibold flex items-center justify-center border-[1.5px] " +
                      (i === index
                        ? "border-primary bg-white"
                        : isFlagged
                        ? "border-transparent bg-warning-tint text-warning"
                        : terjawab
                        ? "border-transparent bg-primary-tint text-primary-deep"
                        : "border-transparent bg-paper-sunken text-ink-soft")
                    }
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="text-center text-xs mb-3">
              <b>{jumlahTerjawab}</b> terjawab · <b>{flagged.size}</b> ragu · <b>{soal.length - jumlahTerjawab}</b> kosong
            </div>
            <button
              onClick={() => setShowReview(true)}
              disabled={submitting}
              className="w-full bg-accent text-[#3A2C10] font-semibold text-sm py-2.5 rounded-lg disabled:opacity-60"
            >
              Kumpulkan Ujian
            </button>
            <div className="text-[11px] text-ink-soft text-center mt-3">
              Urutan soal &amp; pilihan jawaban diacak khusus untukmu
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
