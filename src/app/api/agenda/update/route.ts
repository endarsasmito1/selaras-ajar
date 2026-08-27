import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const id = String(formData.get("id"));
  const judul = String(formData.get("judul"));
  const tanggal = String(formData.get("tanggal"));
  const jenis = String(formData.get("jenis"));
  const keterangan = String(formData.get("keterangan") ?? "");

  await prisma.agendaAkademik.updateMany({
    where: { id, sekolahId: session.sekolahId },
    data: { judul, tanggal: new Date(tanggal), jenis, keterangan: keterangan || null },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/kalender";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
