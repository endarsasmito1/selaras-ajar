import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTahunAjaranAktif } from "@/lib/data";
import { parseCsv } from "@/lib/csv";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  const tahunAktif = await getTahunAjaranAktif(session.sekolahId);
  if (!tahunAktif) {
    url.search = `?error=${encodeURIComponent("Belum ada tahun ajaran aktif — aktifkan dulu di menu Tahun Ajaran")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    url.search = `?error=${encodeURIComponent("File CSV tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const text = await file.text();
  const rows = parseCsv(text).slice(1); // lewati header
  const existing = new Set(
    (await prisma.kelas.findMany({ where: { sekolahId: session.sekolahId, tahunAjaranId: tahunAktif.id }, select: { nama: true } })).map(
      (k) => k.nama
    )
  );

  let diproses = 0;
  for (const row of rows) {
    const [nama, tingkatStr] = row;
    const tingkat = Number(tingkatStr);
    if (!nama || !tingkat || existing.has(nama)) continue;
    await prisma.kelas.create({ data: { sekolahId: session.sekolahId, tahunAjaranId: tahunAktif.id, nama, tingkat } });
    existing.add(nama);
    diproses++;
  }

  url.search = `?impor_kelas=${diproses}`;
  return NextResponse.redirect(url, { status: 303 });
}
