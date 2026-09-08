import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { autoGradeDanHitungTotal, semuaJawabanManualSudahDinilai } from "@/lib/ujian-helpers";
import { logger, errorContext } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "MURID") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  // sendBeacon mengirim body sebagai Blob teks — tetap bisa di-parse sebagai JSON
  const body = await req.json();
  const { pengerjaanId, auto } = body as { pengerjaanId: string; auto?: boolean };

  try {
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

      // U-26: kalau tak ada esai yang butuh nilai manual, nilai langsung final — tak perlu
      // menunggu guru klik "Selesai dikoreksi".
      const { selesai } = await semuaJawabanManualSudahDinilai(pengerjaanId);
      if (selesai) {
        await prisma.ujianPengerjaan.update({
          where: { id: pengerjaanId },
          data: { koreksiDikonfirmasi: true, dikonfirmasiPada: new Date() },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Feedback teknis (Sep 2026) — dipanggil lewat sendBeacon (auto-submit habis waktu/tutup tab),
    // klien sering gak sempat lihat response-nya — kalau gagal diam-diam di server, wajib ada jejak.
    logger.error("Gagal submit ujian", { route: "ujian/submit", pengerjaanId, auto, muridId: session.userId, ...errorContext(err) });
    return NextResponse.json({ error: "Gagal submit, coba lagi" }, { status: 500 });
  }
}
