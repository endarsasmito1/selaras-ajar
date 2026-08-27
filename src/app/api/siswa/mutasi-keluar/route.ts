import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId"));
  const tanggalKeluar = String(formData.get("tanggalKeluar") ?? "");
  const keterangan = String(formData.get("keterangan") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/siswa/mutasi";

  if (!tanggalKeluar || !keterangan) {
    url.search = `?error=${encodeURIComponent("Tanggal keluar & keterangan wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const siswa = await prisma.siswa.findFirst({ where: { id: siswaId, sekolahId: session.sekolahId } });
  if (!siswa) {
    url.search = `?error=${encodeURIComponent("Siswa tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.siswa.update({
    where: { id: siswaId },
    data: {
      aktif: false,
      statusKeluar: "MUTASI_KELUAR",
      tanggalKeluar: new Date(tanggalKeluar),
      keteranganKeluar: keterangan,
    },
  });

  url.search = `?keluar=${encodeURIComponent(siswa.nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
