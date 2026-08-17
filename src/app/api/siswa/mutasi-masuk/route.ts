import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const nisn = String(formData.get("nisn"));
  const nama = String(formData.get("nama"));
  const kelasId = String(formData.get("kelasId"));
  const jenisKelamin = String(formData.get("jenisKelamin"));

  const sudahAda = await prisma.siswa.findUnique({ where: { nisn } });
  if (sudahAda) {
    return NextResponse.json({ error: "NISN sudah terdaftar" }, { status: 400 });
  }

  await prisma.siswa.create({
    data: { sekolahId: session.sekolahId, kelasId, nisn, nama, jenisKelamin },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/siswa/mutasi";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
