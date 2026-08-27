import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/apikey";

/**
 * 1.12, diminta eksplisit — endpoint contoh diautentikasi via API key (header `X-API-Key`),
 * terpisah dari sesi login cookie yang dipakai UI. Dipakai utk verifikasi Postman/integrasi
 * eksternal bisa panggil Selaras Ajar pakai API key, bukan buat tes API list-sekolah pihak
 * ketiga manapun (itu di luar app ini — lihat lib/apikey.ts utk cara bikin key-nya).
 */
export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "API key tidak valid atau sudah dicabut. Sertakan header X-API-Key." }, { status: 401 });
  }

  const sekolah = await prisma.sekolah.findUnique({
    where: { id: auth.sekolahId },
    select: { id: true, nama: true, alamat: true, jenjang: true },
  });
  if (!sekolah) return NextResponse.json({ error: "Sekolah tidak ditemukan" }, { status: 404 });

  const [jumlahSiswa, jumlahGuru, jumlahKelas] = await Promise.all([
    prisma.siswa.count({ where: { sekolahId: sekolah.id, aktif: true } }),
    prisma.guruProfil.count({ where: { pengguna: { sekolahId: sekolah.id, aktif: true } } }),
    prisma.kelas.count({ where: { sekolahId: sekolah.id } }),
  ]);

  return NextResponse.json({
    id: sekolah.id,
    nama: sekolah.nama,
    alamat: sekolah.alamat,
    jenjang: sekolah.jenjang,
    jumlahSiswaAktif: jumlahSiswa,
    jumlahGuru,
    jumlahKelas,
  });
}
