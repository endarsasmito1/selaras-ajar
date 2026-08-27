import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const penugasanId = String(formData.get("penugasanId") ?? "");

  const penugasan = await prisma.penugasanGuru.findFirst({
    where: { id: penugasanId, kelas: { sekolahId: session.sekolahId } },
    include: { guru: true },
  });

  const url = req.nextUrl.clone();
  url.pathname = penugasan ? `/kepsek/guru/${penugasan.guru.penggunaId}/edit` : "/kepsek/guru";
  url.search = "";

  if (penugasan) {
    await prisma.penugasanGuru.delete({ where: { id: penugasanId } });
  }

  return NextResponse.redirect(url, { status: 303 });
}
