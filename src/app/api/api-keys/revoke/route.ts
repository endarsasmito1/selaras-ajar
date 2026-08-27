import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const apiKeyId = String(formData.get("apiKeyId") ?? "");

  // Scope ke sekolah sendiri — cegah kepsek sekolah A mencabut key sekolah B lewat ID tebakan.
  await prisma.apiKey.updateMany({
    where: { id: apiKeyId, sekolahId: session.sekolahId },
    data: { revokedAt: new Date() },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/ekspor";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
