import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const pengumumanId = String(formData.get("pengumumanId") ?? "");

  await prisma.pengumumanSekolah.deleteMany({
    where: { id: pengumumanId, sekolahId: session.sekolahId },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/pengumuman";
  url.search = "?pengumuman_dihapus=1";
  return NextResponse.redirect(url, { status: 303 });
}
