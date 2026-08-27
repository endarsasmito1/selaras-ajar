import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** F-2 (1.7) — tambah rombel tujuan tambahan saat meninjau kenaikan kelas (mis. pecah 4A ke 5B & 5C). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tahunBaruId = String(formData.get("tahunBaruId") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const tingkat = Number(formData.get("tingkat") ?? 0);

  const url = req.nextUrl.clone();
  url.pathname = `/kepsek/tahun-ajaran/kenaikan-kelas/${tahunBaruId}`;

  const tahunBaru = await prisma.tahunAjaran.findFirst({ where: { id: tahunBaruId, sekolahId: session.sekolahId, aktif: false } });
  if (!tahunBaru || !nama || !tingkat) {
    url.search = `?error=${encodeURIComponent("Data rombel tujuan tidak lengkap")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const sudahAda = await prisma.kelas.findFirst({ where: { tahunAjaranId: tahunBaruId, nama } });
  if (sudahAda) {
    url.search = `?error=${encodeURIComponent(`Rombel "${nama}" sudah ada di tahun ajaran ini`)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.kelas.create({ data: { sekolahId: session.sekolahId, tahunAjaranId: tahunBaruId, nama, tingkat } });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
