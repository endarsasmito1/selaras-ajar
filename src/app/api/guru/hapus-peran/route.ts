import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const penggunaPeranId = String(formData.get("penggunaPeranId") ?? "");

  const baris = await prisma.penggunaPeran.findFirst({
    where: { id: penggunaPeranId, sekolahId: session.sekolahId },
  });

  const url = req.nextUrl.clone();
  url.pathname = baris ? `/kepsek/guru/${baris.penggunaId}/edit` : "/kepsek/guru";
  url.search = "";

  if (baris) {
    await prisma.penggunaPeran.delete({ where: { id: penggunaPeranId } });
  }

  return NextResponse.redirect(url, { status: 303 });
}
