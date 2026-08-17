import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "ORANG_TUA") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tagihanId = String(formData.get("tagihanId"));

  const tagihan = await prisma.tagihan.findUnique({
    where: { id: tagihanId },
    include: { siswa: { include: { wali: true } } },
  });
  const berhak = tagihan?.siswa.wali.some((w) => w.penggunaId === session.userId);
  if (!tagihan || !berhak) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  await prisma.tagihan.update({
    where: { id: tagihanId },
    data: { status: "LUNAS", dibayarPada: new Date(), metodeBayar: "QRIS" },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/ortu";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
