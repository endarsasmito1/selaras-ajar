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
  const nama = String(formData.get("nama") ?? "").trim();
  const telepon = String(formData.get("telepon") ?? "").trim();
  const jenisKelaminRaw = String(formData.get("jenisKelamin") ?? "").trim();
  const jenisKelamin = jenisKelaminRaw === "L" || jenisKelaminRaw === "P" ? jenisKelaminRaw : null;
  const nip = String(formData.get("nip") ?? "").trim();
  const mapelDiampu = formData.getAll("mapelDiampu").map(String).filter(Boolean);
  const aktif = formData.get("aktif") === "on";

  const url = req.nextUrl.clone();
  if (!nama) {
    url.pathname = `/kepsek/guru/${penggunaId}/edit`;
    url.search = `?error=${encodeURIComponent("Nama wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const guru = await prisma.pengguna.findFirst({ where: { id: penggunaId, sekolahId: session.sekolahId, peran: "GURU" } });
  if (!guru) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.pengguna.update({
    where: { id: penggunaId },
    data: { nama, telepon: telepon || null, jenisKelamin, aktif },
  });
  await prisma.guruProfil.updateMany({
    where: { penggunaId },
    data: { nip: nip || null, mapelDiampu: mapelDiampu.length > 0 ? JSON.stringify(mapelDiampu) : null },
  });

  url.pathname = "/kepsek/guru";
  url.search = `?guru_diubah=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
