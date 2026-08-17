import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const guruId = String(formData.get("guruId"));
  const catatan = String(formData.get("catatan"));

  await prisma.catatanSupervisi.create({
    data: { guruId, kepsekId: session.userId, catatan },
  });

  const url = req.nextUrl.clone();
  url.pathname = `/kepsek/guru/kinerja/${guruId}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
