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
  const mapelId = String(formData.get("mapelId"));
  const komponen = String(formData.get("komponen"));
  const judul = String(formData.get("judul"));
  const siswaIds = formData.getAll("siswaId") as string[];

  for (const siswaId of siswaIds) {
    const skorRaw = formData.get(`skor_${siswaId}`);
    if (!skorRaw || skorRaw === "") continue;
    const skor = Number(skorRaw);
    if (Number.isNaN(skor)) continue;

    await prisma.nilai.create({
      data: { siswaId, kelasId, mapelId, komponen, judul, skor },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/guru/nilai";
  url.search = `?kelas=${kelasId}&mapel=${mapelId}`;
  return NextResponse.redirect(url, { status: 303 });
}
