"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SekolahListTable } from "./SekolahListTable";

const SekolahMapView = dynamic(
  () => import("@/components/SekolahMapView").then((m) => m.SekolahMapView),
  { ssr: false, loading: () => <div className="text-sm text-ink-soft p-8 text-center">Memuat peta…</div> }
);

type Baris = React.ComponentProps<typeof SekolahListTable>["sekolahList"][number];

export function TampilanTabelPeta({ sekolahList, semuaSekolah }: { sekolahList: Baris[]; semuaSekolah: Baris[] }) {
  const [tampilan, setTampilan] = useState<"tabel" | "peta">("tabel");

  const titikPeta = semuaSekolah
    .filter((b) => b.sekolah.latitude !== null && b.sekolah.longitude !== null)
    .map((b) => ({
      id: b.sekolah.id,
      nama: b.sekolah.nama,
      jenjang: b.sekolah.jenjang,
      kabupatenKota: b.sekolah.kabupatenKota,
      provinsi: b.sekolah.provinsi,
      latitude: b.sekolah.latitude as number,
      longitude: b.sekolah.longitude as number,
    }));

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        <button
          type="button"
          onClick={() => setTampilan("tabel")}
          className={"text-xs font-semibold px-3 py-1.5 rounded-full border " + (tampilan === "tabel" ? "bg-primary text-white border-primary" : "border-rule text-ink-soft hover:bg-paper-raised")}
        >
          ☰ Tabel
        </button>
        <button
          type="button"
          onClick={() => setTampilan("peta")}
          className={"text-xs font-semibold px-3 py-1.5 rounded-full border " + (tampilan === "peta" ? "bg-primary text-white border-primary" : "border-rule text-ink-soft hover:bg-paper-raised")}
        >
          🗺 Peta ({titikPeta.length})
        </button>
      </div>
      {tampilan === "tabel" ? <SekolahListTable sekolahList={sekolahList} /> : <SekolahMapView sekolahList={titikPeta} />}
    </div>
  );
}
