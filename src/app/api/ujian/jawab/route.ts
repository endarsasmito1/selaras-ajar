import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "MURID") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await req.json();
  const { pengerjaanId, soalId, jawabanPG, jawabanPGMulti, jawabanTeks } = body as {
    pengerjaanId: string;
    soalId: string;
    jawabanPG?: number;
    jawabanPGMulti?: number[];
    jawabanTeks?: string;
  };

  const pengerjaan = await prisma.ujianPengerjaan.findUnique({
    where: { id: pengerjaanId },
    include: { siswa: true },
  });
  if (!pengerjaan || pengerjaan.siswa.akunId !== session.userId) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  if (pengerjaan.status === "SELESAI" || pengerjaan.status === "AUTO_SUBMIT") {
    return NextResponse.json({ error: "Ujian sudah selesai" }, { status: 409 });
  }

  await prisma.ujianJawaban.update({
    where: { pengerjaanId_soalId: { pengerjaanId, soalId } },
    data: {
      ...(jawabanPG !== undefined ? { jawabanPG } : {}),
      ...(jawabanPGMulti !== undefined ? { jawabanPGMulti: JSON.stringify(jawabanPGMulti) } : {}),
      ...(jawabanTeks !== undefined ? { jawabanTeks } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
