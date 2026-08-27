"use client";

import { SortableTable } from "@/components/ui/SortableTable";
import { Pill } from "@/components/ui/Pill";

type UjianBaris = {
  id: string;
  judul: string;
  jenis: string;
  status: string;
  createdAt: string | Date;
  mapel: { nama: string };
  kelas: { kelasId: string; kelas: { nama: string; _count: { siswa: number } } }[];
  soal: { id: string }[];
  pengerjaan: { id: string; status: string; siswa: { id: string; nama: string; kelasId: string } }[];
};

const SELESAI_STATUS = new Set(["SELESAI", "AUTO_SUBMIT"]);

export function SemuaUjianTable({ ujianList }: { ujianList: UjianBaris[] }) {
  return (
    <SortableTable
      rows={ujianList}
      rowKey={(u) => u.id}
      emptyMessage="Belum ada ujian/latihan yang dibuat."
      columns={[
        {
          key: "judul",
          label: "Judul",
          sortValue: (u) => u.judul,
          render: (u) => (
            <a href={u.status === "DRAFT" ? `/guru/ujian/${u.id}/edit` : `/guru/ujian/${u.id}`} className="font-semibold text-primary-deep hover:underline">
              {u.judul}
            </a>
          ),
        },
        { key: "mapel", label: "Mapel", sortValue: (u) => u.mapel.nama, render: (u) => u.mapel.nama },
        {
          key: "kelas",
          label: "Kelas",
          sortValue: (u) => u.kelas.map((k) => k.kelas.nama).join(", "),
          render: (u) => u.kelas.map((k) => k.kelas.nama).join(", ") || "—",
        },
        { key: "jenis", label: "Jenis", sortValue: (u) => u.jenis, render: (u) => (u.jenis === "LATIHAN" ? "Latihan" : "CBT") },
        {
          key: "status",
          label: "Status",
          sortValue: (u) => (u.status === "PUBLISHED" ? 1 : 0),
          render: (u) => <Pill tone={u.status === "PUBLISHED" ? "ok" : "neutral"}>{u.status === "PUBLISHED" ? "Terbit" : "Draft"}</Pill>,
        },
        { key: "soal", label: "Soal", sortValue: (u) => u.soal.length, className: "tabnum", render: (u) => u.soal.length },
        {
          key: "selesai",
          label: "Selesai",
          sortValue: (u) => u.pengerjaan.filter((p) => SELESAI_STATUS.has(p.status)).length,
          className: "tabnum",
          render: (u) => u.pengerjaan.filter((p) => SELESAI_STATUS.has(p.status)).length,
        },
        {
          key: "dibuat",
          label: "Dibuat",
          sortValue: (u) => new Date(u.createdAt).getTime(),
          className: "text-ink-soft",
          render: (u) => new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
        },
      ]}
      renderDetail={(u) => (
        <div className="flex flex-col gap-2.5">
          {u.kelas.length === 0 && <p className="text-xs text-ink-soft">Belum ditugaskan ke kelas manapun.</p>}
          {u.kelas.map((k) => {
            const pengerjaanKelas = u.pengerjaan.filter((p) => p.siswa.kelasId === k.kelasId);
            const selesai = pengerjaanKelas.filter((p) => SELESAI_STATUS.has(p.status));
            const totalMurid = k.kelas._count.siswa;
            return (
              <div key={k.kelasId} className="text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{k.kelas.nama}</span>
                  <span className="text-ink-soft tabnum">
                    {selesai.length}/{totalMurid} murid selesai
                  </span>
                </div>
                {selesai.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selesai.map((p) => (
                      <a
                        key={p.siswa.id}
                        href={`/guru/ujian/${u.id}/murid/${p.id}`}
                        className="bg-paper-raised border border-rule rounded-full px-2.5 py-1 text-primary-deep hover:underline"
                      >
                        {p.siswa.nama}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    />
  );
}
