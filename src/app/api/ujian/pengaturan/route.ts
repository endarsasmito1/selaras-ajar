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
  const jenis = String(formData.get("jenis"));
  const jamMulaiStr = String(formData.get("jamMulai") ?? "");
  const jamSelesaiStr = String(formData.get("jamSelesai") ?? "");
  const durasiMenit = formData.get("durasiMenit");
  const acakSoal = formData.get("acakSoal") === "on";
  const acakJawaban = formData.get("acakJawaban") === "on";
  const sekaliAkses = jenis === "LATIHAN" ? false : formData.get("sekaliAkses") === "on";

  await prisma.ujian.update({
    where: { id: ujianId },
    data: {
      jenis: jenis as "UJIAN" | "LATIHAN",
      jamMulai: jamMulaiStr ? new Date(jamMulaiStr) : null,
      jamSelesai: jamSelesaiStr ? new Date(jamSelesaiStr) : null,
      durasiMenit: durasiMenit ? Number(durasiMenit) : null,
      acakSoal,
      acakJawaban,
      sekaliAkses,
    },
  });

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}/konfirmasi`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
