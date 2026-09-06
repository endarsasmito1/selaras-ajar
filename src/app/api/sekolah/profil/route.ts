import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const alamat = String(formData.get("alamat") ?? "").trim();

  await prisma.sekolah.update({ where: { id: session.sekolahId }, data: { alamat: alamat || null } });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek";
  url.search = "";
  url.searchParams.set("toast", "Alamat sekolah tersimpan.");
  url.searchParams.set("tone", "success");
  return NextResponse.redirect(url, { status: 303 });
}
