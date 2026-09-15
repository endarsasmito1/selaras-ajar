import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId") ?? "");
  const mapelId = String(formData.get("mapelId") ?? "");
  const kelasId = String(formData.get("kelasId") ?? "");
  const periode = String(formData.get("periode") ?? "");
  const isi = String(formData.get("isi") ?? "").trim();
  // Feedback teknis (Sep 2026) — dari halaman Performa Murid (bukan cuma /guru/nilai/asesmen),
  // supaya guru kembali ke halaman asalnya, bukan selalu dilempar ke /guru/nilai/asesmen.
  const kembaliKe = String(formData.get("kembaliKe") ?? "/guru/nilai/asesmen");

  const url = req.nextUrl.clone();
  url.pathname = kembaliKe;
  url.search = kembaliKe === "/guru/nilai/asesmen" ? `?kelas=${kelasId}` : "";

  if (!isi) {
    url.searchParams.set("error", "Catatan tidak boleh kosong");
    return NextResponse.redirect(url, { status: 303 });
  }

  // Feedback teknis (Sep 2026) — sebelumnya siswaId/mapelId/kelasId dari form dipakai LANGSUNG tanpa
  // verifikasi guru ini benar ditugaskan (PenugasanGuru) mengajar mapel itu di kelas itu, dan tanpa
  // verifikasi siswa itu benar murid kelas itu — pola sama dgn celah materi/rpp yg sudah diperbaiki
  // sesi ini (lihat src/lib/guard.ts).
  const guru = await prisma.guruProfil.findUnique({ where: { penggunaId: session.userId } });
  const [penugasan, siswa] = await Promise.all([
    guru ? prisma.penugasanGuru.findFirst({ where: { guruId: guru.id, kelasId, mapelId } }) : null,
    prisma.siswa.findFirst({ where: { id: siswaId, kelasId, sekolahId: session.sekolahId } }),
  ]);
  if (!penugasan || !siswa) {
    url.searchParams.set("error", "Tidak diizinkan mencatat asesmen untuk murid/mapel ini");
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.catatanAsesmen.create({
    data: { siswaId, mapelId, periode, isi, penggunaId: session.userId },
  });

  return NextResponse.redirect(url, { status: 303 });
}
