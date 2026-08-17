import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  await prisma.pPDBPendaftar.update({ where: { id }, data: { status: status as "DITERIMA" | "DITOLAK" } });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/ppdb";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
