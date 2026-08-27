import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { cekBentrokJadwal } from "@/lib/data";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU" && session.peran !== "GURU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const entryId = String(formData.get("entryId") ?? "");
  const kelasId = String(formData.get("kelasId") ?? "");
  const hari = Number(formData.get("hari") ?? 0);
  const jamMulai = String(formData.get("jamMulai") ?? "");
  const jamSelesai = String(formData.get("jamSelesai") ?? "");
  const tahunAjaranId = String(formData.get("tahunAjaranId") ?? "");
  const penugasan = String(formData.get("penugasan") ?? "");
  const [mapelId, guruId] = penugasan.split("|");

  const url = req.nextUrl.clone();
  url.pathname = session.peran === "GURU" ? `/guru/jadwal/${kelasId}` : `/kepsek/jadwal/${kelasId}`;

  if (!kelasId || !hari || !jamMulai || !jamSelesai || !tahunAjaranId || !mapelId || !guruId) {
    url.search = `?error=${encodeURIComponent("Data jadwal tidak lengkap")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  if (jamMulai >= jamSelesai) {
    url.search = `?error=${encodeURIComponent("Jam mulai harus lebih awal dari jam selesai")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const [kelasValid, mapelValid, guruValid] = await Promise.all([
    prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } }),
    prisma.mataPelajaran.findFirst({ where: { id: mapelId, sekolahId: session.sekolahId } }),
    prisma.guruProfil.findFirst({ where: { id: guruId, pengguna: { sekolahId: session.sekolahId } } }),
  ]);
  if (!kelasValid || !mapelValid || !guruValid) {
    url.search = `?error=${encodeURIComponent("Data jadwal tidak valid")}`;
    return NextResponse.redirect(url, { status: 303 });
  }
  if (entryId) {
    const existingEntry = await prisma.jadwalEntry.findFirst({ where: { id: entryId, kelasId } });
    if (!existingEntry) {
      url.search = `?error=${encodeURIComponent("Sesi tidak ditemukan")}`;
      return NextResponse.redirect(url, { status: 303 });
    }
  }

  // Guru cuma boleh bikin/ubah jadwal utk dirinya sendiri, dan hanya mapel yang benar-benar ia ampu di kelas itu.
  if (session.peran === "GURU") {
    const guruProfil = await prisma.guruProfil.findUnique({ where: { penggunaId: session.userId } });
    const penugasanValid = guruProfil
      ? await prisma.penugasanGuru.findFirst({ where: { guruId: guruProfil.id, kelasId, mapelId } })
      : null;
    if (!guruProfil || guruId !== guruProfil.id || !penugasanValid) {
      url.search = `?error=${encodeURIComponent("Kamu cuma bisa mengisi jadwal utk mapel yang kamu ampu sendiri di kelas ini")}`;
      return NextResponse.redirect(url, { status: 303 });
    }
    if (entryId) {
      const existing = await prisma.jadwalEntry.findUnique({ where: { id: entryId } });
      if (!existing || existing.guruId !== guruProfil.id) {
        url.search = `?error=${encodeURIComponent("Kamu cuma bisa mengubah sesi milikmu sendiri")}`;
        return NextResponse.redirect(url, { status: 303 });
      }
    }
  }

  // JP-3: bentrok dicek di aplikasi (overlap rentang waktu) — tak ada lagi unique constraint slot.
  const bentrok = await cekBentrokJadwal({ kelasId, guruId, hari, jamMulai, jamSelesai, tahunAjaranId, kecualiEntryId: entryId || undefined });
  if (bentrok) {
    const siapa = bentrok.kelasId === kelasId ? `kelas ini` : `guru ${bentrok.guru.pengguna.nama}`;
    url.search = `?error=${encodeURIComponent(`Bentrok jadwal — ${siapa} sudah punya "${bentrok.mapel.nama}" jam ${bentrok.jamMulai}–${bentrok.jamSelesai} di hari yang sama`)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  if (entryId) {
    // JP-2 (1.7) — edit kartu sesi yang sudah ada, bukan hapus-buat-ulang.
    await prisma.jadwalEntry.update({ where: { id: entryId }, data: { mapelId, guruId, hari, jamMulai, jamSelesai } });
  } else {
    await prisma.jadwalEntry.create({
      data: { kelasId, mapelId, guruId, hari, jamMulai, jamSelesai, tahunAjaranId },
    });
  }

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
