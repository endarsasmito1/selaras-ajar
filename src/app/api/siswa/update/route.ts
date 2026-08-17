import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId"));
  const nama = String(formData.get("nama"));
  const kelasId = String(formData.get("kelasId"));
  const jenisKelamin = String(formData.get("jenisKelamin"));
  const aktif = formData.get("aktif") === "on";

  await prisma.siswa.update({
    where: { id: siswaId },
    data: { nama, kelasId, jenisKelamin, aktif },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/siswa";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
