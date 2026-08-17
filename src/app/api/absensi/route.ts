import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId"));
  const siswaIds = formData.getAll("siswaId") as string[];

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);

  for (const siswaId of siswaIds) {
    const status = String(formData.get(`status_${siswaId}`) ?? "HADIR") as
      | "HADIR"
      | "SAKIT"
      | "IZIN"
      | "ALPA";

    await prisma.absensi.upsert({
      where: { siswaId_tanggal: { siswaId, tanggal: hariIni } },
      update: { status },
      create: { siswaId, kelasId, tanggal: hariIni, status },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/guru/absensi";
  url.search = `?kelas=${kelasId}`;
  return NextResponse.redirect(url, { status: 303 });
}
