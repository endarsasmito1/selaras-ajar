"use client";

import { SortableTable } from "@/components/ui/SortableTable";
import { Pill } from "@/components/ui/Pill";

type SiswaBaris = {
  id: string;
  nama: string;
  nisn: string;
  aktif: boolean;
  kelas: { nama: string };
  wali: { hubungan: string; pengguna: { nama: string } }[];
};

export function HasilPencarianTable({ siswa }: { siswa: SiswaBaris[] }) {
  return (
    <SortableTable
      rows={siswa}
      rowKey={(s) => s.id}
      emptyMessage="Tidak ada siswa yang cocok."
      columns={[
        { key: "nama", label: "Nama", sortValue: (s) => s.nama, render: (s) => <span className="font-semibold">{s.nama}</span> },
        { key: "nisn", label: "NISN", sortValue: (s) => s.nisn, render: (s) => <span className="tabnum text-ink-soft">{s.nisn}</span> },
        { key: "kelas", label: "Kelas", sortValue: (s) => s.kelas.nama, render: (s) => s.kelas.nama },
        {
          key: "wali",
          label: "Wali",
          sortValue: (s) => s.wali[0]?.pengguna.nama ?? null,
          render: (s) => (
            <span className="text-ink-soft">
              {s.wali[0] ? `${s.wali[0].pengguna.nama} (${s.wali[0].hubungan})` : "— belum ada data"}
            </span>
          ),
        },
        {
          key: "status",
          label: "Status",
          sortValue: (s) => (s.aktif ? 1 : 0),
          render: (s) => <Pill tone={s.aktif ? "ok" : "neutral"}>{s.aktif ? "Aktif" : "Nonaktif"}</Pill>,
        },
        {
          key: "aksi",
          label: "",
          render: (s) => (
            <a href={`/kepsek/siswa/${s.id}`} className="text-xs font-semibold text-primary-deep hover:underline">
              Lihat profil
            </a>
          ),
        },
      ]}
    />
  );
}
