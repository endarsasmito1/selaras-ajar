import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "BENDAHARA" && session.peran !== "KEPALA_SEKOLAH")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tagihanId = String(formData.get("tagihanId"));
  const metode = String(formData.get("metode") ?? "Tunai (dicatat manual)");

  await prisma.tagihan.update({
    where: { id: tagihanId },
    data: { status: "LUNAS", dibayarPada: new Date(), metodeBayar: metode },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/keuangan";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
