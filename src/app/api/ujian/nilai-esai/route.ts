import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { autoGradeDanHitungTotal } from "@/lib/ujian-helpers";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const ujianId = String(formData.get("ujianId"));
  const jawabanIds = formData.getAll("jawabanId") as string[];

  for (const jawabanId of jawabanIds) {
    const skorRaw = formData.get(`skor_${jawabanId}`);
    if (skorRaw === null || skorRaw === "") continue;
    const skor = Number(skorRaw);
    if (Number.isNaN(skor)) continue;

    const jawaban = await prisma.ujianJawaban.update({
      where: { id: jawabanId },
      data: { skor, dinilaiOlehId: session.userId },
    });
    await autoGradeDanHitungTotal(jawaban.pengerjaanId);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
