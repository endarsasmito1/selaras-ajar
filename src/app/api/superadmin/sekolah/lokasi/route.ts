import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const sekolahId = String(formData.get("sekolahId") ?? "");
  const latitudeRaw = String(formData.get("latitude") ?? "").trim();
  const longitudeRaw = String(formData.get("longitude") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = `/superadmin/sekolah/${sekolahId}`;
  url.search = "";

  const existing = await prisma.sekolah.findUnique({ where: { id: sekolahId } });
  if (!existing) {
    url.pathname = "/superadmin/sekolah";
    url.search = `?error=${encodeURIComponent("Sekolah tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.sekolah.update({
    where: { id: existing.id },
    data: {
      latitude: latitudeRaw ? Number(latitudeRaw) : null,
      longitude: longitudeRaw ? Number(longitudeRaw) : null,
    },
  });

  return NextResponse.redirect(url, { status: 303 });
}
