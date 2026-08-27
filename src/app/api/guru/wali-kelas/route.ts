import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const penggunaId = String(formData.get("penggunaId") ?? "");
  const kelasId = String(formData.get("kelasId") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = `/kepsek/guru/${penggunaId}/edit`;

  // 1.8, diminta eksplisit (MG-2): satu kelas cuma boleh punya satu wali — tolak kalau kelas
  // tujuan sudah punya wali lain (bukan guru ini sendiri), supaya tak menimpa tanpa sadar.
  if (kelasId) {
    const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } });
    if (kelas?.waliKelasId && kelas.waliKelasId !== penggunaId) {
      const waliLama = await prisma.pengguna.findUnique({ where: { id: kelas.waliKelasId } });
      url.search = `?error=${encodeURIComponent(`Kelas "${kelas.nama}" sudah punya wali kelas: ${waliLama?.nama ?? "guru lain"}`)}`;
      return NextResponse.redirect(url, { status: 303 });
    }
  }

  // Lepas kelas lama yang wali kelasnya guru ini (satu guru maksimal satu kelas).
  await prisma.kelas.updateMany({
    where: { sekolahId: session.sekolahId, waliKelasId: penggunaId },
    data: { waliKelasId: null },
  });

  if (kelasId) {
    await prisma.kelas.update({ where: { id: kelasId }, data: { waliKelasId: penggunaId } });
  }

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
