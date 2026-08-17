import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "ORANG_TUA") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const disetujui = formData.get("disetujui") === "on";

  await prisma.consentPDP.upsert({
    where: { penggunaId: session.userId },
    update: { disetujui, waktuPersetujuan: disetujui ? new Date() : null },
    create: { penggunaId: session.userId, disetujui, waktuPersetujuan: disetujui ? new Date() : null },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/ortu/consent";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
