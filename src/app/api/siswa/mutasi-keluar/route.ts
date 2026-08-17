import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId"));

  await prisma.siswa.update({ where: { id: siswaId }, data: { aktif: false } });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/siswa/mutasi";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
