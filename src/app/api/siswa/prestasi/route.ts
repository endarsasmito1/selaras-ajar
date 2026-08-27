import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "GURU" && session.peran !== "KEPALA_SEKOLAH")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId") ?? "");
  const judul = String(formData.get("judul") ?? "").trim();
  const keterangan = String(formData.get("keterangan") ?? "").trim();
  const tanggal = String(formData.get("tanggal") ?? "");
  const kembaliKe = String(formData.get("kembaliKe") ?? `/kepsek/siswa/${siswaId}`);

  const url = req.nextUrl.clone();
  url.pathname = kembaliKe;

  if (!judul || !tanggal) {
    url.search = `?error=${encodeURIComponent("Judul & tanggal prestasi wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const siswa = await prisma.siswa.findFirst({ where: { id: siswaId, sekolahId: session.sekolahId } });
  if (!siswa) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.prestasiSiswa.create({
    data: { siswaId, judul, keterangan: keterangan || null, tanggal: new Date(tanggal), dicatatOlehId: session.userId },
  });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
