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

  const url = req.nextUrl.clone();
  url.pathname = "/guru/izin";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
