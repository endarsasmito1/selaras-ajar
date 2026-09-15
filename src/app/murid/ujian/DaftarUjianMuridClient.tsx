"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { LinkButton, Button } from "@/components/ui/Button";
import { ConfirmLinkButton } from "@/components/ui/ConfirmLinkButton";
import { formatTanggalWaktu } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

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

function isUrgent(u: UjianBaris, now: Date) {
  const pengerjaan = u.pengerjaan[0];
  const belumBuka = u.jamMulai && now < new Date(u.jamMulai);
  const sudahTutup = u.jamSelesai && now > new Date(u.jamSelesai);
  const selesai = pengerjaan?.status === "SELESAI" || pengerjaan?.status === "AUTO_SUBMIT";
  return !belumBuka && !sudahTutup && !selesai;
}

function UjianRow({ u, now }: { u: UjianBaris; now: Date }) {
  const pengerjaan = u.pengerjaan[0];
  const belumBuka = u.jamMulai && now < new Date(u.jamMulai);
  const sudahTutup = u.jamSelesai && now > new Date(u.jamSelesai);
  const selesai = pengerjaan?.status === "SELESAI" || pengerjaan?.status === "AUTO_SUBMIT";

  return (
    <div className="bg-paper-raised border border-rule rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
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
}

export function DaftarUjianMuridClient({ daftar, now }: { daftar: UjianBaris[]; now: string | Date }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"nama" | "nilai" | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [halaman, setHalaman] = useState(1);
  const [mapelAktif, setMapelAktif] = useState<string | null>(null);
  const waktuSekarang = new Date(now);

  function toggleSort(key: "nama" | "nilai") {
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("asc");
    }
    setHalaman(1);
  }

  function pilihMapel(nama: string | null) {
    setMapelAktif(nama);
    setQ("");
    setSortKey(null);
    setHalaman(1);
  }

  // Ditampilkan di atas grid kartu mapel — ujian yang sedang bisa/harus dikerjakan sekarang, biar
  // gak ketutup harus klik masuk ke mapel tertentu dulu buat tau ada yang urgent. Dibatasi ke
  // BEBERAPA yang jamSelesai-nya paling dekat (bukan semuanya) — kalau lagi banyak ujian aktif
  // bersamaan (mis. semua mapel buka kuis di minggu yang sama), list ini gampang jadi sepenuh
  // list awal yang justru mau dikurangi lewat kartu mata pelajaran ini.
  const BATAS_URGENT = 4;
  const semuaUrgent = useMemo(() => {
    const list = daftar.filter((u) => isUrgent(u, waktuSekarang));
    return list.sort((a, b) => {
      if (!a.jamSelesai) return 1;
      if (!b.jamSelesai) return -1;
      return new Date(a.jamSelesai).getTime() - new Date(b.jamSelesai).getTime();
    });
  }, [daftar, waktuSekarang]);
  const perluDikerjakan = semuaUrgent.slice(0, BATAS_URGENT);
  const sisaUrgent = semuaUrgent.length - perluDikerjakan.length;

  const mapelGroups = useMemo(() => {
    const map = new Map<string, { nama: string; total: number; urgent: number }>();
    for (const u of daftar) {
      const g = map.get(u.mapel.nama) ?? { nama: u.mapel.nama, total: 0, urgent: 0 };
      g.total++;
      if (isUrgent(u, waktuSekarang)) g.urgent++;
      map.set(u.mapel.nama, g);
    }
    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [daftar, waktuSekarang]);

  // Ketik di kotak cari sambil masih di tampilan kartu = cari lintas semua mapel (bukan cuma
  // mapel yang lagi dipilih) — begitu dikosongkan lagi, balik ke tampilan kartu apa adanya.
  const tampilkanList = mapelAktif !== null || q.trim() !== "";
  const basisList = mapelAktif ? daftar.filter((u) => u.mapel.nama === mapelAktif) : daftar;

  const tersaring = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = ql ? basisList.filter((u) => u.judul.toLowerCase().includes(ql)) : basisList;
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
  }, [basisList, q, sortKey, dir]);

  const totalHalaman = Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN));
  const halamanAman = Math.min(totalHalaman, halaman);
  const halamanIni = tersaring.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-paper-raised border border-rule rounded-lg px-3.5 py-2">
          <span aria-hidden="true" className="text-ink-soft text-sm shrink-0">🔍</span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHalaman(1);
            }}
            placeholder="Cari nama ujian…"
            className="bg-transparent outline-none text-sm text-ink placeholder:text-ink-soft w-full"
          />
        </div>
        {tampilkanList && (
          <div className="flex gap-1.5 text-xs">
            <button type="button" onClick={() => toggleSort("nama")} className="px-2.5 py-1.5 rounded-lg border border-rule hover:bg-paper-raised inline-flex items-center gap-1">
              Nama <span className="text-[9px] leading-none">{sortKey === "nama" ? (dir === "asc" ? "▲" : "▼") : "⇅"}</span>
            </button>
            <button type="button" onClick={() => toggleSort("nilai")} className="px-2.5 py-1.5 rounded-lg border border-rule hover:bg-paper-raised inline-flex items-center gap-1">
              Nilai <span className="text-[9px] leading-none">{sortKey === "nilai" ? (dir === "asc" ? "▲" : "▼") : "⇅"}</span>
            </button>
          </div>
        )}
      </div>

      {!tampilkanList && daftar.length === 0 && <EmptyState icon="▤" title="Belum ada ujian/latihan aktif" />}

      {!tampilkanList && daftar.length > 0 && (
        <>
          {perluDikerjakan.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2.5">Perlu dikerjakan sekarang</h3>
              <div className="flex flex-col gap-3">
                {perluDikerjakan.map((u) => (
                  <UjianRow key={u.id} u={u} now={waktuSekarang} />
                ))}
              </div>
              {sisaUrgent > 0 && (
                <p className="text-xs text-ink-soft mt-2.5">
                  +{sisaUrgent} ujian/latihan lain perlu dikerjakan — lihat per mata pelajaran di bawah.
                </p>
              )}
            </div>
          )}

          <h3 className="text-sm font-semibold mb-2.5">Mata pelajaran</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {mapelGroups.map((g) => (
              <button key={g.nama} type="button" onClick={() => pilihMapel(g.nama)} className="text-left">
                <Card className="hover:border-primary transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-base font-semibold">{g.nama}</h4>
                    {g.urgent > 0 && <Pill tone="warn">{g.urgent} perlu dikerjakan</Pill>}
                  </div>
                  <p className="text-xs text-ink-soft">{g.total} ujian/latihan</p>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}

      {tampilkanList && (
        <>
          {mapelAktif && (
            <Button type="button" variant="ghost" size="sm" className="mb-4" onClick={() => pilihMapel(null)}>
              ← Semua mata pelajaran
            </Button>
          )}

          <div className="flex flex-col gap-3">
            {halamanIni.length === 0 && <p className="text-sm text-ink-soft">Tidak ada ujian yang cocok.</p>}
            {halamanIni.map((u) => (
              <UjianRow key={u.id} u={u} now={waktuSekarang} />
            ))}
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
        </>
      )}
    </div>
  );
}
