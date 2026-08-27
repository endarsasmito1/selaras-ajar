import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const sekolahId = String(formData.get("sekolahId") ?? "");

  const sekolah = await prisma.sekolah.findUnique({ where: { id: sekolahId } });
  if (sekolah) {
    await prisma.sekolah.update({ where: { id: sekolahId }, data: { aktif: !sekolah.aktif } });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/superadmin/sekolah";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
