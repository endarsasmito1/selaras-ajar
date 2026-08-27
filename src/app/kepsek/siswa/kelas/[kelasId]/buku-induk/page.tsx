import { getSession } from "@/lib/auth";
import { getSiswaKelas } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/ui/PrintButton";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function BukuIndukKelasPage({ params }: { params: Promise<{ kelasId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { kelasId } = await params;
  const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } });
  if (!kelas) notFound();
  const siswaList = await getSiswaKelas(kelasId);

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-0">
      <div className="flex justify-end mb-4 print:hidden">
        <PrintButton />
      </div>
      <h1 className="font-serif text-xl text-center mb-1">BUKU INDUK SISWA — KELAS {kelas.nama}</h1>
      <p className="text-center text-sm text-ink-soft mb-6">{siswaList.length} siswa</p>

      <table className="w-full text-sm border border-rule">
        <thead>
          <tr className="bg-paper-sunken">
            <th className="text-left px-3 py-2 border-t border-rule">No</th>
            <th className="text-left px-3 py-2 border-t border-rule">NISN</th>
            <th className="text-left px-3 py-2 border-t border-rule">Nama</th>
            <th className="text-left px-3 py-2 border-t border-rule">JK</th>
            <th className="text-left px-3 py-2 border-t border-rule">Tanggal Lahir</th>
          </tr>
        </thead>
        <tbody>
          {siswaList.map((s, i) => (
            <tr key={s.id} className="border-t border-rule">
              <td className="px-3 py-1.5">{i + 1}</td>
              <td className="px-3 py-1.5">{s.nisn}</td>
              <td className="px-3 py-1.5">{s.nama}</td>
              <td className="px-3 py-1.5">{s.jenisKelamin}</td>
              <td className="px-3 py-1.5">{s.tanggalLahir ? formatTanggal(s.tanggalLahir) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-ink-soft mt-6 text-center">Dicetak {formatTanggal(new Date())}</p>
    </div>
  );
}
