import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getKelasDiampu } from "@/lib/data";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId") ?? "");
  const mapelKonteks = String(formData.get("mapelKonteks") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = `/guru/performa/${siswaId}`;

  if (!isi) {
    url.search = `?error=${encodeURIComponent("Isi catatan wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const siswa = await prisma.siswa.findUnique({ where: { id: siswaId } });
  const penugasan = await getKelasDiampu(session.userId);
  const berhak = siswa && penugasan.some((p) => p.kelasId === siswa.kelasId);
  if (!berhak) {
    url.search = `?error=${encodeURIComponent("Kamu tidak mengajar murid ini")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.catatanSiswa.create({
    data: { siswaId, penggunaId: session.userId, mapelKonteks: mapelKonteks || null, isi },
  });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
