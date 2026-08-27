import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const mapelId = String(formData.get("mapelId") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const kkm = Number(formData.get("kkm") ?? 70);

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  if (!nama || !Number.isFinite(kkm) || kkm < 0 || kkm > 100) {
    url.search = `?error=${encodeURIComponent("Nama mapel wajib diisi & KKM harus 0-100")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const mapel = await prisma.mataPelajaran.findFirst({ where: { id: mapelId, sekolahId: session.sekolahId } });
  if (!mapel) {
    url.search = `?error=${encodeURIComponent("Mapel tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.mataPelajaran.update({ where: { id: mapelId }, data: { nama, kkm } });

  url.search = `?mapel_diubah=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
