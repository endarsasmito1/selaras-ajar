import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "BENDAHARA")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const siswa = await prisma.siswa.findMany({
    where: { sekolahId: session.sekolahId },
    include: { kelas: true, wali: { include: { pengguna: true } } },
    orderBy: [{ kelas: { nama: "asc" } }, { nama: "asc" }],
  });

  // Struktur kolom disesuaikan pola ekspor/impor format Dapodik/e-Rapor (bukan integrasi API —
  // lihat catatan arsitektur: tak ada API resmi pihak ketiga, jadi format file yang cocok).
  const csv = toCsv(
    ["NISN", "Nama Peserta Didik", "Jenis Kelamin", "Rombel", "Nama Wali", "Kontak Wali", "Status"],
    siswa.map((s) => [
      s.nisn,
      s.nama,
      s.jenisKelamin,
      s.kelas.nama,
      s.wali[0]?.pengguna.nama ?? "",
      s.wali[0]?.pengguna.telepon ?? "",
      s.aktif ? "Aktif" : "Nonaktif",
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="data-siswa-dapodik-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
