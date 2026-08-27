import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const ujianId = String(formData.get("ujianId"));
  const judul = String(formData.get("judul") ?? "").trim();
  const jenis = String(formData.get("jenis"));
  const durasiMenit = formData.get("durasiMenit");
  const acakSoal = formData.get("acakSoal") === "on";
  const acakJawaban = formData.get("acakJawaban") === "on";
  const sekaliAkses = jenis === "LATIHAN" ? false : formData.get("sekaliAkses") === "on";
  const modeHasil = String(formData.get("modeHasil") ?? "SETELAH_JADWAL_BERAKHIR");
  const jadwalHasilManualStr = String(formData.get("jadwalHasilManual") ?? "");

  // Scoping sekolah saja (bukan dibuatOlehId) — konsisten dgn getUjianDetail() yg dipakai halaman ini.
  const ujian = await prisma.ujian.findFirst({
    where: { id: ujianId, kelas: { some: { kelas: { sekolahId: session.sekolahId } } } },
  });
  if (!ujian) {
    return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });
  }

  await prisma.ujian.update({
    where: { id: ujianId },
    data: {
      ...(judul ? { judul } : {}),
      jenis: jenis as "UJIAN" | "LATIHAN",
      durasiMenit: durasiMenit ? Number(durasiMenit) : null,
      acakSoal,
      acakJawaban,
      sekaliAkses,
      modeHasil: modeHasil as "OTOMATIS_SUBMIT" | "SETELAH_JADWAL_BERAKHIR" | "JADWAL_MANUAL",
      jadwalHasilManual: modeHasil === "JADWAL_MANUAL" && jadwalHasilManualStr ? new Date(jadwalHasilManualStr) : null,
    },
  });

  // Jadwal akses per kelas (U-8, 1.6) — field bernama jamMulai_<ujianKelasId> / jamSelesai_<...>
  const kelasList = await prisma.ujianKelas.findMany({ where: { ujianId } });
  for (const uk of kelasList) {
    const jamMulaiStr = String(formData.get(`jamMulai_${uk.id}`) ?? "");
    const jamSelesaiStr = String(formData.get(`jamSelesai_${uk.id}`) ?? "");
    await prisma.ujianKelas.update({
      where: { id: uk.id },
      data: {
        jamMulai: jamMulaiStr ? new Date(jamMulaiStr) : null,
        jamSelesai: jamSelesaiStr ? new Date(jamSelesaiStr) : null,
      },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}/konfirmasi`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
