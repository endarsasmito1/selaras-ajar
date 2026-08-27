import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const tingkat = Number(formData.get("tingkat") ?? 0);

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  if (!nama || !tingkat) {
    url.search = `?error=${encodeURIComponent("Nama & tingkat kelas wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } });
  if (!kelas) {
    url.search = `?error=${encodeURIComponent("Kelas tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const dobel = await prisma.kelas.findFirst({
    where: { sekolahId: session.sekolahId, tahunAjaranId: kelas.tahunAjaranId, nama, id: { not: kelasId } },
  });
  if (dobel) {
    url.search = `?error=${encodeURIComponent(`Kelas "${nama}" sudah ada di tahun ajaran yang sama`)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.kelas.update({ where: { id: kelasId }, data: { nama, tingkat } });

  url.search = `?kelas_diubah=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
