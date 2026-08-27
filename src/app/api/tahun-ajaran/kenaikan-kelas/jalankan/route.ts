import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** F-2 (1.7) — langkah 2 (final): eksekusi kenaikan kelas sesuai rombel tujuan per siswa yang sudah ditinjau. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tahunBaruId = String(formData.get("tahunBaruId") ?? "");
  const keteranganPindah = String(formData.get("keteranganPindah") ?? "").trim() || "Pindah sekolah saat proses kenaikan kelas";

  const url = req.nextUrl.clone();

  const tahunBaru = await prisma.tahunAjaran.findFirst({ where: { id: tahunBaruId, sekolahId: session.sekolahId, aktif: false } });
  const tahunLama = await prisma.tahunAjaran.findFirst({ where: { sekolahId: session.sekolahId, aktif: true } });
  if (!tahunBaru || !tahunLama) {
    url.pathname = "/kepsek/tahun-ajaran";
    url.search = `?error=${encodeURIComponent("Tahun ajaran tujuan/asal tidak valid")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const kelasLama = await prisma.kelas.findMany({
    where: { tahunAjaranId: tahunLama.id },
    include: { siswa: { where: { aktif: true } } },
  });

  let dipromosikan = 0;
  let diluluskan = 0;
  let dipindah = 0;
  const sekarang = new Date();

  for (const k of kelasLama) {
    for (const s of k.siswa) {
      const target = String(formData.get(`target_${s.id}`) ?? "LULUS");
      if (target === "LULUS") {
        await prisma.siswa.update({
          where: { id: s.id },
          data: { aktif: false, statusKeluar: "LULUS", tanggalKeluar: sekarang, keteranganKeluar: `Lulus dari ${tahunLama.label}` },
        });
        diluluskan++;
      } else if (target === "PINDAH") {
        await prisma.siswa.update({
          where: { id: s.id },
          data: { aktif: false, statusKeluar: "PINDAH_SEKOLAH", tanggalKeluar: sekarang, keteranganKeluar: keteranganPindah },
        });
        dipindah++;
      } else {
        await prisma.siswa.update({ where: { id: s.id }, data: { kelasId: target } });
        dipromosikan++;
      }
    }
  }

  await prisma.tahunAjaran.update({ where: { id: tahunLama.id }, data: { aktif: false } });
  await prisma.tahunAjaran.update({ where: { id: tahunBaru.id }, data: { aktif: true } });

  url.pathname = "/kepsek/tahun-ajaran";
  url.searchParams.set("promosi", String(dipromosikan));
  url.searchParams.set("lulus", String(diluluskan));
  url.searchParams.set("pindah", String(dipindah));
  return NextResponse.redirect(url, { status: 303 });
}
