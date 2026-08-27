import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "BENDAHARA" && session.peran !== "KEPALA_SEKOLAH")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const nama = String(formData.get("nama") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/keuangan/tipe-tagihan";

  if (!nama) {
    url.search = `?error=${encodeURIComponent("Nama jenis tagihan wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const sudahAda = await prisma.tagihanTipe.findFirst({ where: { sekolahId: session.sekolahId, nama } });
  if (sudahAda) {
    url.search = `?error=${encodeURIComponent(`Jenis tagihan "${nama}" sudah ada`)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.tagihanTipe.create({ data: { sekolahId: session.sekolahId, nama } });

  url.search = `?tipe_dibuat=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
