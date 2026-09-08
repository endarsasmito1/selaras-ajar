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

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}`;

  // Kepemilikan: pengerjaanId mentah dari form — tanpa cek ini, guru mana pun bisa nulis
  // komentar ke pengerjaan ujian murid guru LAIN (bahkan sekolah lain) asal tau/nebak id-nya.
  const pengerjaan = await prisma.ujianPengerjaan.findFirst({
    where: { id: pengerjaanId, ujianId, ujian: { dibuatOlehId: session.userId } },
  });
  if (!pengerjaan) {
    url.search = `?error=${encodeURIComponent("Pengerjaan tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.ujianPengerjaan.update({
    where: { id: pengerjaan.id },
    data: { komentarGuru: komentar || null },
  });

  url.search = `?toast=${encodeURIComponent("Komentar tersimpan.")}`;
  return NextResponse.redirect(url, { status: 303 });
}
