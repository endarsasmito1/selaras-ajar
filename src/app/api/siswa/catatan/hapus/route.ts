import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const catatanId = String(formData.get("catatanId") ?? "");
  const siswaId = String(formData.get("siswaId") ?? "");

  const catatan = await prisma.catatanSiswa.findUnique({ where: { id: catatanId } });
  // CG-4: guru cuma boleh hapus catatannya sendiri.
  if (catatan && catatan.penggunaId === session.userId) {
    await prisma.catatanSiswa.delete({ where: { id: catatanId } });
  }

  const url = req.nextUrl.clone();
  url.pathname = `/guru/performa/${siswaId}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
