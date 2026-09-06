import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { upsertNotifikasi } from "@/lib/notifikasi";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tugasId = String(formData.get("tugasId"));
  const pengumpulanIds = formData.getAll("pengumpulanId") as string[];

  for (const pid of pengumpulanIds) {
    const nilaiRaw = formData.get(`nilai_${pid}`);
    const catatan = formData.get(`catatan_${pid}`);
    if (nilaiRaw === null || nilaiRaw === "") continue;
    const pengumpulan = await prisma.pengumpulanTugas.update({
      where: { id: pid },
      data: { nilai: Number(nilaiRaw), catatanGuru: catatan ? String(catatan) : null },
      include: { siswa: { include: { wali: true } }, tugas: true },
    });
    // NTF-M-03 — beritahu murid begitu nilai tugasnya keluar (cuma kalau punya akun murid sendiri —
    // siswa titipan/blm py akun dilewati begitu saja, gak ada penerima yg valid).
    if (pengumpulan.siswa.akunId) {
      await upsertNotifikasi({
        penggunaId: pengumpulan.siswa.akunId,
        tipe: "tugas-dinilai",
        entitasKey: pengumpulan.id,
        judul: `Nilai tugas "${pengumpulan.tugas.judul}" sudah keluar`,
        deskripsi: `Nilai: ${Number(nilaiRaw)}`,
        href: `/murid/tugas/${tugasId}`,
        prioritas: "RENDAH",
      });
    }
    // NTF-O-07 — mirror ke semua wali/orang tua siswa ybs.
    await Promise.all(
      pengumpulan.siswa.wali.map((w) =>
        upsertNotifikasi({
          penggunaId: w.penggunaId,
          tipe: "anak-tugas-dinilai",
          entitasKey: pengumpulan.id,
          judul: `Nilai tugas "${pengumpulan.tugas.judul}" ${pengumpulan.siswa.nama} sudah keluar`,
          deskripsi: `Nilai: ${Number(nilaiRaw)}`,
          href: `/ortu/performa/${pengumpulan.siswaId}`,
          prioritas: "RENDAH",
        })
      )
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = `/guru/tugas/${tugasId}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
