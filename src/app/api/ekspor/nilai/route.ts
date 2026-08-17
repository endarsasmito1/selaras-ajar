import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { getGradeScale, hitungPredikat } from "@/lib/data";

export async function GET() {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "BENDAHARA")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const [nilai, gradeScale] = await Promise.all([
    prisma.nilai.findMany({
      where: { siswa: { sekolahId: session.sekolahId } },
      include: { siswa: { include: { kelas: true } }, mapel: true },
      orderBy: [{ siswa: { kelas: { nama: "asc" } } }, { siswa: { nama: "asc" } }],
    }),
    getGradeScale(session.sekolahId),
  ]);

  const csv = toCsv(
    ["NISN", "Nama Peserta Didik", "Rombel", "Mata Pelajaran", "Komponen", "Judul Penilaian", "Nilai", "Predikat"],
    nilai.map((n) => [
      n.siswa.nisn,
      n.siswa.nama,
      n.siswa.kelas.nama,
      n.mapel.nama,
      n.komponen,
      n.judul,
      n.skor,
      hitungPredikat(n.skor, gradeScale),
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nilai-e-rapor-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
