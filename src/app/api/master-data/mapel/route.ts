import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const nama = String(formData.get("nama") ?? "").trim();
  const kkmRaw = formData.get("kkm");
  const kkm = kkmRaw ? Number(kkmRaw) : 70;

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  if (!nama) {
    url.search = `?error=${encodeURIComponent("Nama mapel wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const sudahAda = await prisma.mataPelajaran.findFirst({ where: { sekolahId: session.sekolahId, nama } });
  if (sudahAda) {
    url.search = `?error=${encodeURIComponent(`Mapel "${nama}" sudah ada`)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.mataPelajaran.create({
    data: { sekolahId: session.sekolahId, nama, kkm },
  });

  url.search = `?mapel_dibuat=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
