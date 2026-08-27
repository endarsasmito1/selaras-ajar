import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTahunAjaranAktif } from "@/lib/data";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const nama = String(formData.get("nama") ?? "").trim();
  const tingkat = Number(formData.get("tingkat") ?? 0);

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  if (!nama || !tingkat) {
    url.search = `?error=${encodeURIComponent("Nama & tingkat kelas wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const tahunAktif = await getTahunAjaranAktif(session.sekolahId);
  if (!tahunAktif) {
    url.search = `?error=${encodeURIComponent("Belum ada tahun ajaran aktif — aktifkan dulu di menu Tahun Ajaran")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const sudahAda = await prisma.kelas.findFirst({ where: { sekolahId: session.sekolahId, tahunAjaranId: tahunAktif.id, nama } });
  if (sudahAda) {
    url.search = `?error=${encodeURIComponent(`Kelas "${nama}" sudah ada di tahun ajaran aktif`)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.kelas.create({
    data: { sekolahId: session.sekolahId, tahunAjaranId: tahunAktif.id, nama, tingkat },
  });

  url.search = `?kelas_dibuat=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
