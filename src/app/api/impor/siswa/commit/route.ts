import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ambilBatch, hapusBatch } from "@/lib/csv";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const batchId = String(formData.get("batchId"));
  const batch = ambilBatch(batchId);
  if (!batch || batch.jenis !== "siswa") {
    return NextResponse.json({ error: "Batch impor tidak ditemukan / sudah kedaluwarsa" }, { status: 404 });
  }

  const kelasSekolah = await prisma.kelas.findMany({ where: { sekolahId: session.sekolahId } });
  const kelasMap = new Map(kelasSekolah.map((k) => [k.nama.toLowerCase(), k]));

  let dibuat = 0;
  let diperbarui = 0;

  for (const row of batch.valid) {
    const kelas = kelasMap.get(row.kelasNama.toLowerCase());
    if (!kelas) continue;

    const siswa = await prisma.siswa.upsert({
      where: { nisn: row.nisn },
      update: { nama: row.nama, kelasId: kelas.id, jenisKelamin: row.jenisKelamin },
      create: {
        sekolahId: session.sekolahId,
        kelasId: kelas.id,
        nisn: row.nisn,
        nama: row.nama,
        jenisKelamin: row.jenisKelamin,
      },
    });

    if (row.waliNama) {
      const emailWali = `wali.${row.nisn}@import.selarasajar.demo`;
      let waliAkun = await prisma.pengguna.findUnique({ where: { email: emailWali } });
      if (!waliAkun) {
        waliAkun = await prisma.pengguna.create({
          data: {
            sekolahId: session.sekolahId,
            nama: row.waliNama,
            email: emailWali,
            passwordHash: "$2a$10$imported.account.not.activated.yet.placeholder",
            peran: "ORANG_TUA",
            telepon: row.waliTelepon || null,
            aktif: false,
          },
        });
      }
      const sudahAda = await prisma.waliSiswa.findUnique({
        where: { siswaId_penggunaId: { siswaId: siswa.id, penggunaId: waliAkun.id } },
      });
      if (!sudahAda) {
        await prisma.waliSiswa.create({ data: { siswaId: siswa.id, penggunaId: waliAkun.id, hubungan: "Wali" } });
      }
    }

    if (row.aksi === "buat") dibuat++;
    else diperbarui++;
  }

  hapusBatch(batchId);

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/siswa";
  url.searchParams.set("impor_dibuat", String(dibuat));
  url.searchParams.set("impor_diperbarui", String(diperbarui));
  return NextResponse.redirect(url, { status: 303 });
}
