import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const ujianId = String(formData.get("ujianId"));

  const ujian = await prisma.ujian.findFirst({
    where: { id: ujianId, kelas: { some: { kelas: { sekolahId: session.sekolahId } } } },
    include: { kelas: true, soal: true },
  });
  if (!ujian) {
    return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });
  }
  if (ujian.soal.length === 0) {
    return NextResponse.json({ error: "Ujian belum punya soal" }, { status: 400 });
  }

  // 1.8, diminta eksplisit (U-1): ujian yang menyasar >1 kelas digandakan jadi N ujian
  // terpisah — satu per kelas — begitu dipublish, supaya tiap kelas punya siklus hasil/
  // koreksi/analisis yang sepenuhnya independen (bukan lagi satu record dibagi banyak kelas).
  if (ujian.kelas.length > 1) {
    await prisma.$transaction(async (tx) => {
      for (const uk of ujian.kelas) {
        await tx.ujian.create({
          data: {
            mapelId: ujian.mapelId,
            dibuatOlehId: ujian.dibuatOlehId,
            judul: ujian.judul,
            jenis: ujian.jenis,
            jenisPenilaian: ujian.jenisPenilaian,
            status: "PUBLISHED",
            durasiMenit: ujian.durasiMenit,
            acakSoal: ujian.acakSoal,
            acakJawaban: ujian.acakJawaban,
            sekaliAkses: ujian.sekaliAkses,
            // 1.23 — bug ditemukan saat investigasi: fan-out ini sebelumnya TIDAK nge-copy
            // tampilkanHasilSetelahSubmit (1.21), jadi tiap ujian hasil pecahan kelas selalu balik
            // ke default biarpun guru sudah atur ulang — dibenerin bareng nambah babId & rename ke modeHasil.
            modeHasil: ujian.modeHasil,
            jadwalHasilManual: ujian.jadwalHasilManual,
            babId: ujian.babId,
            rppId: ujian.rppId,
            kelas: { create: [{ kelasId: uk.kelasId, jamMulai: uk.jamMulai, jamSelesai: uk.jamSelesai }] },
            soal: { create: ujian.soal.map((s) => ({ soalId: s.soalId, urutan: s.urutan, poin: s.poin })) },
          },
        });
      }
      await tx.ujianSoal.deleteMany({ where: { ujianId } });
      await tx.ujianKelas.deleteMany({ where: { ujianId } });
      await tx.ujian.delete({ where: { id: ujianId } });
    });
  } else {
    await prisma.ujian.update({ where: { id: ujianId }, data: { status: "PUBLISHED" } });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/guru/ujian";
  url.search = "?ujian_diterbitkan=1";
  return NextResponse.redirect(url, { status: 303 });
}
