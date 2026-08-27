import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function bumpNamaKelas(nama: string, tingkatBaru: number) {
  return nama.replace(/^\d+/, String(tingkatBaru));
}

/**
 * F-2 (1.7) — langkah 1: buat tahun ajaran baru (belum aktif) + kelas tujuan "default" 1:1 per
 * kelas asal (tingkat+1, nama di-bump). Belum memindahkan siswa apa pun — itu terjadi di langkah
 * finalisasi (jalankan/route.ts) setelah kepsek meninjau & menyesuaikan rombel tujuan per siswa.
 */
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

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/tahun-ajaran/kenaikan-kelas";

  const tahunLama = await prisma.tahunAjaran.findFirst({ where: { sekolahId: session.sekolahId, aktif: true } });
  if (!tahunLama) {
    url.search = `?error=${encodeURIComponent("Tidak ada tahun ajaran aktif")}`;
    return NextResponse.redirect(url, { status: 303 });
  }
  if (!label || !mulai || !selesai) {
    url.search = `?error=${encodeURIComponent("Label, tanggal mulai & selesai wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const kelasLama = await prisma.kelas.findMany({ where: { tahunAjaranId: tahunLama.id } });

  const tahunBaru = await prisma.tahunAjaran.create({
    data: { sekolahId: session.sekolahId, label, semester, aktif: false, mulai: new Date(mulai), selesai: new Date(selesai) },
  });

  for (const k of kelasLama) {
    const tingkatBaru = k.tingkat + 1;
    if (tingkatBaru > tingkatMaks) continue; // tak ada kelas tujuan default -> siswa default-nya Lulus
    await prisma.kelas.create({
      data: {
        sekolahId: session.sekolahId,
        tahunAjaranId: tahunBaru.id,
        nama: bumpNamaKelas(k.nama, tingkatBaru),
        tingkat: tingkatBaru,
        waliKelasId: k.waliKelasId,
      },
    });
  }

  url.pathname = `/kepsek/tahun-ajaran/kenaikan-kelas/${tahunBaru.id}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
