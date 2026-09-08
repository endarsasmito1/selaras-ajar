import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { semuaJawabanManualSudahDinilai } from "@/lib/ujian-helpers";
import { logger, errorContext } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const pengerjaanId = String(formData.get("pengerjaanId") ?? "");
  const ujianId = String(formData.get("ujianId") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}`;

  // Dicek dulu (existence + kepemilikan) — pola yang sama ditemukan berulang di beberapa rute lain
  // (izin/putuskan, ppdb/putuskan, tagihan/lunas): sebelumnya gak ada cek sama sekali, jadi (a) 500
  // kalau pengerjaanId gak ada (`semuaJawabanManualSudahDinilai` diam-diam return selesai:true utk
  // list kosong, baru meledak pas `.update()` di bawah), DAN (b) guru LAIN yang tau/nebak id ini
  // bisa konfirmasi koreksi ujian murid guru lain (nilai jadi kebuka prematur ke murid/ortu tanpa
  // guru pembuat ujiannya yang beneran nyetujui).
  const pengerjaanCek = await prisma.ujianPengerjaan.findFirst({
    where: { id: pengerjaanId, ujianId, ujian: { dibuatOlehId: session.userId } },
  });
  if (!pengerjaanCek) {
    url.search = `?error=${encodeURIComponent("Pengerjaan tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  try {
    const { selesai, belumDinilai } = await semuaJawabanManualSudahDinilai(pengerjaanId);
    if (!selesai) {
      const pengerjaan = await prisma.ujianPengerjaan.findUnique({ where: { id: pengerjaanId }, include: { ujian: { include: { soal: true } } } });
      const nomorSoal = belumDinilai
        .map((j) => (pengerjaan?.ujian.soal.findIndex((us) => us.soalId === j.soalId) ?? -1) + 1)
        .filter((n) => n > 0)
        .join(", ");
      url.search = `?error=${encodeURIComponent(
        `Belum bisa dikonfirmasi — soal esai nomor ${nomorSoal || "?"} belum diberi skor.`
      )}`;
      return NextResponse.redirect(url, { status: 303 });
    }

    await prisma.ujianPengerjaan.update({
      where: { id: pengerjaanId },
      data: { koreksiDikonfirmasi: true, dikonfirmasiPada: new Date() },
    });

    url.search = `?toast=${encodeURIComponent("Koreksi dikonfirmasi — nilai & komentar sekarang tampil ke murid/ortu.")}`;
    return NextResponse.redirect(url, { status: 303 });
  } catch (err) {
    // Feedback teknis (Sep 2026) — jalur penilaian ujian, wajib ada jejak kalau gagal diam-diam.
    logger.error("Gagal konfirmasi koreksi ujian", { route: "ujian/konfirmasi-koreksi", pengerjaanId, ujianId, guruId: session.userId, ...errorContext(err) });
    url.search = `?error=${encodeURIComponent("Gagal konfirmasi, coba lagi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }
}
