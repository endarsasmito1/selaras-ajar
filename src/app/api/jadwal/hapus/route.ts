import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU" && session.peran !== "GURU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const jadwalEntryId = String(formData.get("jadwalEntryId") ?? "");
  const kelasId = String(formData.get("kelasId") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = session.peran === "GURU" ? `/guru/jadwal/${kelasId}` : `/kepsek/jadwal/${kelasId}`;

  const entryMilikSekolah = await prisma.jadwalEntry.findFirst({ where: { id: jadwalEntryId, kelasId, kelas: { sekolahId: session.sekolahId } } });
  if (!entryMilikSekolah) {
    url.search = `?error=${encodeURIComponent("Sesi tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  if (session.peran === "GURU") {
    const guruProfil = await prisma.guruProfil.findUnique({ where: { penggunaId: session.userId } });
    if (!guruProfil || entryMilikSekolah.guruId !== guruProfil.id) {
      url.search = `?error=${encodeURIComponent("Kamu cuma bisa menghapus jadwal milikmu sendiri")}`;
      return NextResponse.redirect(url, { status: 303 });
    }
  }

  await prisma.presensiGuru.deleteMany({ where: { jadwalEntryId } });
  await prisma.jadwalEntry.delete({ where: { id: jadwalEntryId } });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
