import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    url.search = `?error=${encodeURIComponent("File CSV tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const text = await file.text();
  const rows = parseCsv(text).slice(1);
  const existing = new Set(
    (await prisma.mataPelajaran.findMany({ where: { sekolahId: session.sekolahId }, select: { nama: true } })).map((m) => m.nama)
  );

  let diproses = 0;
  for (const row of rows) {
    const [nama, kkmStr] = row;
    if (!nama || existing.has(nama)) continue;
    const kkm = kkmStr ? Number(kkmStr) : 70;
    await prisma.mataPelajaran.create({ data: { sekolahId: session.sekolahId, nama, kkm: Number.isFinite(kkm) ? kkm : 70 } });
    existing.add(nama);
    diproses++;
  }

  url.search = `?impor_mapel=${diproses}`;
  return NextResponse.redirect(url, { status: 303 });
}
