import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const pengerjaanId = String(formData.get("pengerjaanId") ?? "");
  const komentar = String(formData.get("komentarGuru") ?? "").trim();
  const ujianId = String(formData.get("ujianId") ?? "");

  await prisma.ujianPengerjaan.update({
    where: { id: pengerjaanId },
    data: { komentarGuru: komentar || null },
  });

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}`;
  url.search = "?komentar_disimpan=1";
  return NextResponse.redirect(url, { status: 303 });
}
