import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const penggunaId = String(formData.get("penggunaId") ?? "");
  const kelasId = String(formData.get("kelasId") ?? "");
  const mapelId = String(formData.get("mapelId") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = `/kepsek/guru/${penggunaId}/edit`;

  if (!kelasId || !mapelId) {
    url.search = `?error=${encodeURIComponent("Pilih kelas & mapel")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const [guru, kelas, mapel] = await Promise.all([
    prisma.pengguna.findFirst({ where: { id: penggunaId, sekolahId: session.sekolahId, peran: "GURU" }, include: { guruProfil: true } }),
    prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } }),
    prisma.mataPelajaran.findFirst({ where: { id: mapelId, sekolahId: session.sekolahId } }),
  ]);
  const guruProfil = guru?.guruProfil;
  if (!guruProfil || !kelas || !mapel) {
    url.search = `?error=${encodeURIComponent("Profil guru tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.penugasanGuru.upsert({
    where: { guruId_kelasId_mapelId: { guruId: guruProfil.id, kelasId, mapelId } },
    update: {},
    create: { guruId: guruProfil.id, kelasId, mapelId },
  });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
