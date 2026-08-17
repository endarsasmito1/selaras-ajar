import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const penggunaId = String(formData.get("penggunaId"));
  const target = await prisma.pengguna.findUnique({ where: { id: penggunaId } });
  if (target) {
    await prisma.pengguna.update({ where: { id: penggunaId }, data: { aktif: !target.aktif } });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/pengguna";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
