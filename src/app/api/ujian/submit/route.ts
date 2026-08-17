import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { autoGradeDanHitungTotal } from "@/lib/ujian-helpers";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "MURID") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  // sendBeacon mengirim body sebagai Blob teks — tetap bisa di-parse sebagai JSON
  const body = await req.json();
  const { pengerjaanId, auto } = body as { pengerjaanId: string; auto?: boolean };

  const pengerjaan = await prisma.ujianPengerjaan.findUnique({
    where: { id: pengerjaanId },
    include: { siswa: true },
  });
  if (!pengerjaan || pengerjaan.siswa.akunId !== session.userId) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  // Idempotent — kalau sudah selesai, jangan ditimpa (mis. auto-submit susul manual submit)
  if (pengerjaan.status !== "SELESAI" && pengerjaan.status !== "AUTO_SUBMIT") {
    await prisma.ujianPengerjaan.update({
      where: { id: pengerjaanId },
      data: { status: auto ? "AUTO_SUBMIT" : "SELESAI", waktuSelesai: new Date() },
    });
    await autoGradeDanHitungTotal(pengerjaanId);
  }

  return NextResponse.json({ ok: true });
}
