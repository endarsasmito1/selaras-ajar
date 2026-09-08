import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logger, errorContext } from "@/lib/logger";

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

  try {
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
  } catch (err) {
    // Feedback teknis (Sep 2026) — autosave per-soal selagi murid ngerjain ujian; kalau gagal
    // diam-diam, jawaban murid bisa hilang tanpa jejak sama sekali di server.
    logger.error("Gagal autosave jawaban ujian", { route: "ujian/jawab", pengerjaanId, soalId, muridId: session.userId, ...errorContext(err) });
    return NextResponse.json({ error: "Gagal menyimpan jawaban, coba lagi" }, { status: 500 });
  }
}
