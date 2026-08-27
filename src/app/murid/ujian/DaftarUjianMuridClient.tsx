"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmLinkButton } from "@/components/ui/ConfirmLinkButton";
import { formatTanggalWaktu } from "@/lib/utils";

type UjianBaris = {
  id: string;
  judul: string;
  jenis: string;
  jamMulai: string | Date | null;
  jamSelesai: string | Date | null;
  durasiMenit: number | null;
  mapel: { nama: string };
  soal: { id: string }[];
  pengerjaan: { status: string; nilaiTotal: number | null; waktuSelesai: string | Date | null }[];
};

const PER_HALAMAN = 10;

export function DaftarUjianMuridClient({ daftar, now }: { daftar: UjianBaris[]; now: string | Date }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"nama" | "nilai" | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [halaman, setHalaman] = useState(1);
  const waktuSekarang = new Date(now);

  function toggleSort(key: "nama" | "nilai") {
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("asc");
    }
    setHalaman(1);
  }

  const tersaring = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = ql ? daftar.filter((u) => u.judul.toLowerCase().includes(ql)) : daftar;
    if (sortKey) {
      list = [...list].sort((a, b) => {
        if (sortKey === "nama") return a.judul.localeCompare(b.judul, "id");
        const va = a.pengerjaan[0]?.nilaiTotal ?? -1;
        const vb = b.pengerjaan[0]?.nilaiTotal ?? -1;
        return va - vb;
      });
      if (dir === "desc") list.reverse();
    }
    return list;
  }, [daftar, q, sortKey, dir]);

  const totalHalaman = Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN));
  const halamanAman = Math.min(totalHalaman, halaman);
  const halamanIni = tersaring.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setHalaman(1);
          }}
          placeholder="Cari nama ujian…"
          className="flex-1 min-w-[200px] bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-1.5 text-xs">
          <button type="button" onClick={() => toggleSort("nama")} className="px-2.5 py-1.5 rounded-lg border border-rule hover:bg-paper-raised inline-flex items-center gap-1">
            Nama <span className="text-[9px] leading-none">{sortKey === "nama" ? (dir === "asc" ? "▲" : "▼") : "⇅"}</span>
          </button>
          <button type="button" onClick={() => toggleSort("nilai")} className="px-2.5 py-1.5 rounded-lg border border-rule hover:bg-paper-raised inline-flex items-center gap-1">
            Nilai <span className="text-[9px] leading-none">{sortKey === "nilai" ? (dir === "asc" ? "▲" : "▼") : "⇅"}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {halamanIni.length === 0 && (
          <p className="text-sm text-ink-soft">{q ? "Tidak ada ujian yang cocok." : "Belum ada ujian/latihan aktif."}</p>
        )}
        {halamanIni.map((u) => {
          const pengerjaan = u.pengerjaan[0];
          const belumBuka = u.jamMulai && waktuSekarang < new Date(u.jamMulai);
          const sudahTutup = u.jamSelesai && waktuSekarang > new Date(u.jamSelesai);
          const selesai = pengerjaan?.status === "SELESAI" || pengerjaan?.status === "AUTO_SUBMIT";

          return (
            <div key={u.id} className="bg-paper-raised border border-rule rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  {u.judul}
                  <Pill tone="info">{u.jenis === "LATIHAN" ? "Latihan" : "CBT"}</Pill>
                </div>
                <div className="text-xs text-ink-soft mt-1">
                  {u.mapel.nama} · {u.soal.length} soal
                  {u.jamMulai && u.jamSelesai && (
                    <>
                      {" "}
                      · {new Date(u.jamMulai).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}–
                      {new Date(u.jamSelesai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </>
                  )}
                  {/* 1.21 — kapan murid submit/selesai, format tanggal+jam lengkap. */}
                  {selesai && pengerjaan?.waktuSelesai && <> · Selesai {formatTanggalWaktu(pengerjaan.waktuSelesai)}</>}
                </div>
              </div>
              <div>
                {selesai ? (
                  <Pill tone="ok">Selesai {pengerjaan?.nilaiTotal !== null ? `· Nilai ${pengerjaan?.nilaiTotal}` : ""}</Pill>
                ) : belumBuka ? (
                  <Pill tone="neutral">Belum dibuka</Pill>
                ) : sudahTutup ? (
                  <Pill tone="warn">Sudah tutup</Pill>
                ) : u.jenis === "UJIAN" && pengerjaan?.status !== "MENGERJAKAN" ? (
                  <ConfirmLinkButton
                    href={`/murid/ujian/${u.id}`}
                    size="sm"
                    variant="accent"
                    confirmMessage={`Mulai ujian "${u.judul}" sekarang? Begitu dimulai, waktu langsung berjalan${u.durasiMenit ? ` (${u.durasiMenit} menit)` : ""} dan keluar dari halaman akan otomatis mengirim jawabanmu.`}
                  >
                    Mulai
                  </ConfirmLinkButton>
                ) : (
                  <LinkButton href={`/murid/ujian/${u.id}`} size="sm" variant={u.jenis === "LATIHAN" ? "ghost" : "accent"}>
                    {pengerjaan?.status === "MENGERJAKAN" ? "Lanjutkan" : "Mulai"}
                  </LinkButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalHalaman > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1 mt-4 text-xs">
          {Array.from({ length: totalHalaman }, (_, i) => i + 1).map((h) => (
            <button
              key={h}
              onClick={() => setHalaman(h)}
              className={
                "px-2.5 py-1 rounded border tabnum " +
                (h === halamanAman ? "bg-primary text-white border-primary font-semibold" : "border-rule hover:bg-paper-raised")
              }
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
