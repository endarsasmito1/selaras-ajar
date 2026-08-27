import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTahunAjaranAktif } from "@/lib/data";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId") ?? "");
  const mapelId = String(formData.get("mapelId") ?? "");
  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  const lampiranUrl = String(formData.get("lampiranUrl") ?? "").trim();
  const capaianIds = formData.getAll("capaianIds") as string[];

  const url = req.nextUrl.clone();
  url.pathname = "/guru/rpp/baru";

  if (!kelasId || !mapelId || !judul || !isi) {
    url.search = `?error=${encodeURIComponent("Kelas, mapel, judul, dan isi RPP wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const tahunAktif = await getTahunAjaranAktif(session.sekolahId);
  if (!tahunAktif) {
    url.search = `?error=${encodeURIComponent("Belum ada tahun ajaran aktif")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const rpp = await prisma.rPP.create({
    data: { penggunaId: session.userId, kelasId, mapelId, tahunAjaranId: tahunAktif.id, judul, isi, lampiranUrl: lampiranUrl || null },
  });

  for (const capaianId of capaianIds) {
    await prisma.rPPCapaian.create({ data: { rppId: rpp.id, capaianId } });
  }

  url.pathname = "/guru/rpp";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
