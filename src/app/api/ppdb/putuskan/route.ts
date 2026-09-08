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

  // Dicek dulu (bukan langsung .update()) — sebelumnya PrismaClientKnownRequestError P2025
  // (record gak ada) jadi 500 gak ketangkep, DAN gak ada filter sekolahId sama sekali (kepsek
  // sekolah lain yang nebak/tau id ini bisa mutusin pendaftar sekolah lain — celah lintas tenant,
  // ditemukan bareng pas audit pola serupa di izin/putuskan).
  const existing = await prisma.pPDBPendaftar.findFirst({ where: { id, sekolahId: session.sekolahId } });
  if (!existing) {
    return NextResponse.json({ error: "Pendaftar tidak ditemukan" }, { status: 404 });
  }

  await prisma.pPDBPendaftar.update({ where: { id }, data: { status: status as "DITERIMA" | "DITOLAK" } });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/ppdb";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
