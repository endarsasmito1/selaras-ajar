import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { semuaJawabanManualSudahDinilai } from "@/lib/ujian-helpers";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const pengerjaanId = String(formData.get("pengerjaanId") ?? "");
  const ujianId = String(formData.get("ujianId") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}`;

  const { selesai, belumDinilai } = await semuaJawabanManualSudahDinilai(pengerjaanId);
  if (!selesai) {
    const pengerjaan = await prisma.ujianPengerjaan.findUnique({ where: { id: pengerjaanId }, include: { ujian: { include: { soal: true } } } });
    const nomorSoal = belumDinilai
      .map((j) => (pengerjaan?.ujian.soal.findIndex((us) => us.soalId === j.soalId) ?? -1) + 1)
      .filter((n) => n > 0)
      .join(", ");
    url.search = `?error=${encodeURIComponent(
      `Belum bisa dikonfirmasi — soal esai nomor ${nomorSoal || "?"} belum diberi skor.`
    )}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.ujianPengerjaan.update({
    where: { id: pengerjaanId },
    data: { koreksiDikonfirmasi: true, dikonfirmasiPada: new Date() },
  });

  url.search = "?koreksi_dikonfirmasi=1";
  return NextResponse.redirect(url, { status: 303 });
}
