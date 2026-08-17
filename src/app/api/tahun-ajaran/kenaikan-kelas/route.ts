import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function bumpNamaKelas(nama: string, tingkatBaru: number) {
  return nama.replace(/^\d+/, String(tingkatBaru));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const label = String(formData.get("label"));
  const semester = String(formData.get("semester") ?? "Ganjil");
  const mulai = String(formData.get("mulai"));
  const selesai = String(formData.get("selesai"));
  const tingkatMaks = Number(formData.get("tingkatMaks") ?? 6);

  const tahunLama = await prisma.tahunAjaran.findFirst({ where: { sekolahId: session.sekolahId, aktif: true } });
  if (!tahunLama) {
    return NextResponse.json({ error: "Tidak ada tahun ajaran aktif" }, { status: 400 });
  }
  const kelasLama = await prisma.kelas.findMany({ where: { tahunAjaranId: tahunLama.id }, include: { siswa: { where: { aktif: true } } } });

  // Nonaktifkan tahun ajaran lama, buat yang baru jadi aktif
  await prisma.tahunAjaran.update({ where: { id: tahunLama.id }, data: { aktif: false } });
  const tahunBaru = await prisma.tahunAjaran.create({
    data: { sekolahId: session.sekolahId, label, semester, aktif: true, mulai: new Date(mulai), selesai: new Date(selesai) },
  });

  let dipromosikan = 0;
  let diluluskan = 0;

  for (const k of kelasLama) {
    const tingkatBaru = k.tingkat + 1;
    if (tingkatBaru > tingkatMaks) {
      // Lulus — nonaktifkan siswa di kelas ini
      await prisma.siswa.updateMany({ where: { kelasId: k.id }, data: { aktif: false } });
      diluluskan += k.siswa.length;
      continue;
    }
    const namaBaru = bumpNamaKelas(k.nama, tingkatBaru);
    const kelasBaru = await prisma.kelas.create({
      data: { sekolahId: session.sekolahId, tahunAjaranId: tahunBaru.id, nama: namaBaru, tingkat: tingkatBaru, waliKelasId: k.waliKelasId },
    });
    await prisma.siswa.updateMany({ where: { kelasId: k.id }, data: { kelasId: kelasBaru.id } });
    dipromosikan += k.siswa.length;
  }

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/tahun-ajaran";
  url.searchParams.set("promosi", `${dipromosikan}`);
  url.searchParams.set("lulus", `${diluluskan}`);
  return NextResponse.redirect(url, { status: 303 });
}
