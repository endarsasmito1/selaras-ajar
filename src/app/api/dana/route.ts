import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "BENDAHARA" && session.peran !== "KEPALA_SEKOLAH")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const periode = String(formData.get("periode"));
  const kategori = String(formData.get("kategori"));
  const nominal = Number(formData.get("nominal"));

  await prisma.danaAlokasi.create({
    data: { sekolahId: session.sekolahId, periode, kategori, nominal, urutan: 50 },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/keuangan/dana";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
