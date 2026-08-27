import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getKelasDiampu } from "@/lib/data";

/** "Duplikat ke kelas lain" (1.20) — clone Ujian+UjianSoal (referensi Soal yang sama, bukan
 * disalin) jadi draft baru utk kelas target; hasil/nilai ujian asal sama sekali tak tersentuh. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const ujianId = String(formData.get("ujianId") ?? "");
  // 1.21 — multi-kelas (bukan cuma 1) + judul custom opsional, diisi sekaligus di form duplikat
  // (bukan rename belakangan di halaman edit — walau itu tetap bisa kapan saja).
  const kelasTargetIds = formData.getAll("kelasTargetIds").map(String).filter(Boolean);
  const judulBaruRaw = String(formData.get("judulBaru") ?? "").trim();

  const ujian = await prisma.ujian.findFirst({
    where: { id: ujianId, kelas: { some: { kelas: { sekolahId: session.sekolahId } } } },
    include: { soal: true },
  });
  if (!ujian) {
    return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });
  }
  if (kelasTargetIds.length === 0) {
    const url = req.nextUrl.clone();
    url.pathname = `/guru/ujian/${ujianId}`;
    url.search = "?error=" + encodeURIComponent("Pilih minimal 1 kelas target");
    return NextResponse.redirect(url, { status: 303 });
  }

  // Semua kelas target wajib sungguh diampu guru ini utk mapel yg sama (bukan sekadar sekolah yg sama).
  const penugasanGuru = await getKelasDiampu(session.userId);
  const kelasDiampuUntukMapelIni = new Set(
    penugasanGuru.filter((p) => p.mapelId === ujian.mapelId).map((p) => p.kelasId)
  );
  const semuaValid = kelasTargetIds.every((id) => kelasDiampuUntukMapelIni.has(id));
  if (!semuaValid) {
    return NextResponse.json({ error: "Kelas target tidak valid" }, { status: 400 });
  }

  const salinan = await prisma.ujian.create({
    data: {
      mapelId: ujian.mapelId,
      dibuatOlehId: session.userId,
      judul: judulBaruRaw || `${ujian.judul} (salinan)`,
      jenis: ujian.jenis,
      jenisPenilaian: ujian.jenisPenilaian,
      status: "DRAFT",
      durasiMenit: ujian.durasiMenit,
      acakSoal: ujian.acakSoal,
      acakJawaban: ujian.acakJawaban,
      sekaliAkses: ujian.sekaliAkses,
      // 1.23 — bug ditemukan saat investigasi: duplikat sebelumnya TIDAK nge-copy
      // tampilkanHasilSetelahSubmit, jadi salinan selalu balik ke default — dibenerin bareng
      // nambah babId (ikut bab ujian asalnya, guru bisa ganti lagi di halaman edit) & rename ke modeHasil.
      modeHasil: ujian.modeHasil,
      jadwalHasilManual: ujian.jadwalHasilManual,
      babId: ujian.babId,
      rppId: ujian.rppId,
      kelas: { create: kelasTargetIds.map((kelasId) => ({ kelasId })) },
      soal: { create: ujian.soal.map((s) => ({ soalId: s.soalId, urutan: s.urutan, poin: s.poin })) },
    },
  });

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${salinan.id}/edit`;
  url.search = "?ujian_dibuat=1";
  return NextResponse.redirect(url, { status: 303 });
}
