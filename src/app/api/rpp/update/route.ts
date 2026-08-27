import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const rppId = String(formData.get("rppId") ?? "");
  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  const lampiranUrl = String(formData.get("lampiranUrl") ?? "").trim();
  const capaianIds = formData.getAll("capaianIds") as string[];

  const url = req.nextUrl.clone();
  url.pathname = `/guru/rpp/${rppId}/edit`;

  if (!judul || !isi) {
    url.search = `?error=${encodeURIComponent("Judul dan isi RPP wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const rppMilikSekolah = await prisma.rPP.findFirst({ where: { id: rppId, kelas: { sekolahId: session.sekolahId } } });
  if (!rppMilikSekolah) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.rPP.update({ where: { id: rppId }, data: { judul, isi, lampiranUrl: lampiranUrl || null } });
  await prisma.rPPCapaian.deleteMany({ where: { rppId } });
  for (const capaianId of capaianIds) {
    await prisma.rPPCapaian.create({ data: { rppId, capaianId } });
  }

  url.pathname = "/guru/rpp";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
