import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const kelasId = String(formData.get("kelasId") ?? "");
  const jenisKelamin = String(formData.get("jenisKelamin") ?? "");
  const tanggalLahir = String(formData.get("tanggalLahir") ?? "");
  const alamat = String(formData.get("alamat") ?? "").trim();
  const aktif = formData.get("aktif") === "on";

  const url = req.nextUrl.clone();

  if (!nama || !kelasId || !jenisKelamin) {
    url.pathname = `/kepsek/siswa/${siswaId}/edit`;
    url.search = `?error=${encodeURIComponent("Nama, kelas, dan jenis kelamin wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const [siswaLama, kelasTujuan] = await Promise.all([
    prisma.siswa.findFirst({ where: { id: siswaId, sekolahId: session.sekolahId } }),
    prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } }),
  ]);
  if (!siswaLama || !kelasTujuan) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.siswa.update({
    where: { id: siswaId },
    data: {
      nama,
      kelasId,
      jenisKelamin,
      aktif,
      tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
      alamat: alamat || null,
    },
  });

  url.pathname = "/kepsek/siswa";
  url.search = `?siswa_diubah=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
