import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "GURU" && session.peran !== "KEPALA_SEKOLAH")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const mapelId = String(formData.get("mapelId") ?? "");
  const kode = String(formData.get("kode") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/guru/rpp/capaian";

  if (!mapelId || !deskripsi) {
    url.search = `?error=${encodeURIComponent("Mapel dan deskripsi wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.capaianPembelajaran.create({
    data: { sekolahId: session.sekolahId, mapelId, kode: kode || null, deskripsi },
  });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
