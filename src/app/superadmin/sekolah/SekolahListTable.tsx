"use client";

import { SortableTable } from "@/components/ui/SortableTable";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Baris = {
  sekolah: { id: string; nama: string; npsn: string | null; jenjang: string; kabupatenKota: string | null; provinsi: string | null; aktif: boolean; latitude: number | null; longitude: number | null };
  siswa: number;
  guru: number;
  kelas: number;
  tahunAktif: { label: string } | null;
};

export function SekolahListTable({ sekolahList }: { sekolahList: Baris[] }) {
  return (
    <SortableTable
      rows={sekolahList}
      rowKey={(b) => b.sekolah.id}
      emptyMessage="Belum ada sekolah terdaftar."
      columns={[
        {
          key: "nama",
          label: "Sekolah",
          sortValue: (b) => b.sekolah.nama,
          className: "break-words",
          render: (b) => (
            <a href={`/superadmin/sekolah/${b.sekolah.id}`} className="font-semibold hover:underline">
              {b.sekolah.nama}
            </a>
          ),
        },
        { key: "npsn", label: "NPSN", sortValue: (b) => b.sekolah.npsn, className: "text-ink-soft tabnum break-words", render: (b) => b.sekolah.npsn ?? "—" },
        { key: "jenjang", label: "Jenjang", sortValue: (b) => b.sekolah.jenjang, render: (b) => b.sekolah.jenjang },
        { key: "kabkota", label: "Kab/Kota", sortValue: (b) => b.sekolah.kabupatenKota, className: "text-ink-soft break-words", render: (b) => b.sekolah.kabupatenKota ?? "—" },
        { key: "provinsi", label: "Provinsi", sortValue: (b) => b.sekolah.provinsi, className: "text-ink-soft break-words", render: (b) => b.sekolah.provinsi ?? "—" },
        { key: "kelas", label: "Kelas", sortValue: (b) => b.kelas, className: "tabnum", render: (b) => b.kelas },
        { key: "siswa", label: "Siswa", sortValue: (b) => b.siswa, className: "tabnum", render: (b) => b.siswa },
        { key: "guru", label: "Guru", sortValue: (b) => b.guru, className: "tabnum", render: (b) => b.guru },
        { key: "ta", label: "TA Aktif", sortValue: (b) => b.tahunAktif?.label ?? null, className: "text-ink-soft break-words", render: (b) => b.tahunAktif?.label ?? "—" },
        {
          key: "status",
          label: "Status",
          sortValue: (b) => (b.sekolah.aktif ? 1 : 0),
          render: (b) => <Pill tone={b.sekolah.aktif ? "ok" : "neutral"}>{b.sekolah.aktif ? "Aktif" : "Nonaktif"}</Pill>,
        },
        {
          key: "aksi",
          label: "",
          render: (b) => (
            <ConfirmDialog
              triggerLabel={b.sekolah.aktif ? "Nonaktifkan" : "Aktifkan"}
              title={`${b.sekolah.aktif ? "Nonaktifkan" : "Aktifkan"} ${b.sekolah.nama}?`}
            >
              <form action="/api/superadmin/sekolah/toggle-aktif" method="POST" className="flex flex-col gap-3">
                <input type="hidden" name="sekolahId" value={b.sekolah.id} />
                <p className="text-sm">
                  {b.sekolah.aktif
                    ? "Semua pengguna di sekolah ini tidak akan bisa login sampai diaktifkan kembali."
                    : "Sekolah ini akan bisa dipakai lagi oleh penggunanya."}
                </p>
                <Button type="submit" size="sm" variant={b.sekolah.aktif ? "ghost" : "primary"}>
                  Ya, {b.sekolah.aktif ? "nonaktifkan" : "aktifkan"}
                </Button>
              </form>
            </ConfirmDialog>
          ),
        },
      ]}
    />
  );
}
