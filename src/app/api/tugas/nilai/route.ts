import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tugasId = String(formData.get("tugasId"));
  const pengumpulanIds = formData.getAll("pengumpulanId") as string[];

  for (const pid of pengumpulanIds) {
    const nilaiRaw = formData.get(`nilai_${pid}`);
    const catatan = formData.get(`catatan_${pid}`);
    if (nilaiRaw === null || nilaiRaw === "") continue;
    await prisma.pengumpulanTugas.update({
      where: { id: pid },
      data: { nilai: Number(nilaiRaw), catatanGuru: catatan ? String(catatan) : null },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = `/guru/tugas/${tugasId}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
