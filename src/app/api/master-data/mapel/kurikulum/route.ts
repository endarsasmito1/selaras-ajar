import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { KURIKULUM_MAPEL } from "@/lib/kurikulum";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  const sekolah = await prisma.sekolah.findUnique({
    where: { id: session.sekolahId },
    select: { jenjang: true, kurikulum: { include: { mapel: true } } },
  });

  // Kurikulum yang dipilih sekolah (dikelola superadmin) diprioritaskan; fallback ke preset
  // hardcode Kurikulum Merdeka kalau sekolah belum pilih kurikulum sama sekali (1.20, backward compatible).
  const preset: { nama: string; kkm: number }[] | undefined =
    sekolah?.kurikulum?.mapel.map((m) => ({ nama: m.nama, kkm: m.kkm })) ??
    (sekolah ? KURIKULUM_MAPEL[sekolah.jenjang as keyof typeof KURIKULUM_MAPEL] : undefined);
  if (!preset) {
    url.search = `?error=${encodeURIComponent("Jenjang sekolah tidak dikenali — tambah mapel manual saja")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const existing = new Set(
    (await prisma.mataPelajaran.findMany({ where: { sekolahId: session.sekolahId }, select: { nama: true } })).map((m) => m.nama)
  );

  let ditambahkan = 0;
  for (const m of preset) {
    if (existing.has(m.nama)) continue;
    await prisma.mataPelajaran.create({ data: { sekolahId: session.sekolahId, nama: m.nama, kkm: m.kkm } });
    existing.add(m.nama);
    ditambahkan++;
  }

  url.search = `?impor_mapel=${ditambahkan}`;
  return NextResponse.redirect(url, { status: 303 });
}
