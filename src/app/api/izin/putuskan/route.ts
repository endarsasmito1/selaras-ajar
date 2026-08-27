import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toDateOnlyUTC } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const pengajuanId = String(formData.get("pengajuanId"));
  const keputusan = String(formData.get("keputusan")); // "DISETUJUI" | "DITOLAK"

  const pengajuan = await prisma.pengajuanIzin.update({
    where: { id: pengajuanId },
    data: { status: keputusan as "DISETUJUI" | "DITOLAK", disetujuiOlehId: session.userId },
    include: { siswa: true },
  });

  if (keputusan === "DISETUJUI") {
    const tanggal = toDateOnlyUTC(pengajuan.tanggal);
    await prisma.absensi.upsert({
      where: { siswaId_tanggal: { siswaId: pengajuan.siswaId, tanggal } },
      update: { status: pengajuan.jenis, catatan: pengajuan.keterangan },
      create: { siswaId: pengajuan.siswaId, kelasId: pengajuan.siswa.kelasId, tanggal, status: pengajuan.jenis, catatan: pengajuan.keterangan },
    });
  }

  // 1.23 — bisa dipanggil dari /guru/izin ATAU inline dari /guru/absensi (Isi Absensi), jadi balik
  // ke halaman asalnya (lewat referer) bukan hardcode /guru/izin, biar guru gak kepental halaman.
  const referer = req.headers.get("referer");
  const url = referer ? new URL(referer) : req.nextUrl.clone();
  if (!referer) url.pathname = "/guru/izin";
  return NextResponse.redirect(url, { status: 303 });
}
