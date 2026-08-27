"use client";

import dynamic from "next/dynamic";

const SekolahMapView = dynamic(
  () => import("@/components/SekolahMapView").then((m) => m.SekolahMapView),
  { ssr: false, loading: () => <div className="text-sm text-ink-soft p-8 text-center">Memuat peta…</div> }
);

type Titik = {
  id: string;
  nama: string;
  jenjang: string;
  kabupatenKota: string | null;
  provinsi: string | null;
  latitude: number;
  longitude: number;
};

export function SekolahMapCard({ titik }: { titik: Titik[] }) {
  return <SekolahMapView sekolahList={titik} />;
}
