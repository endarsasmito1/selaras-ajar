import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

function passwordAcak() {
  return Math.random().toString(36).slice(2, 10);
}

/** Dipakai saat siswa belum punya wali terdaftar sama sekali — buat akun ORANG_TUA baru + WaliSiswa. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const hubungan = String(formData.get("hubungan") ?? "Wali").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telepon = String(formData.get("telepon") ?? "").trim();
  const jenisKelaminRaw = String(formData.get("jenisKelamin") ?? "").trim();
  const jenisKelamin = jenisKelaminRaw === "L" || jenisKelaminRaw === "P" ? jenisKelaminRaw : null;

  const url = req.nextUrl.clone();
  url.pathname = `/kepsek/siswa/${siswaId}`;

  if (!nama || !email) {
    url.search = `?error=${encodeURIComponent("Nama & email wali wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const siswa = await prisma.siswa.findFirst({ where: { id: siswaId, sekolahId: session.sekolahId } });
  if (!siswa) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const emailSudahAda = await prisma.pengguna.findUnique({ where: { email } });
  if (emailSudahAda) {
    url.search = `?error=${encodeURIComponent("Email itu sudah dipakai akun lain")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const password = passwordAcak();
  const ortu = await prisma.pengguna.create({
    data: {
      sekolahId: session.sekolahId,
      nama,
      email,
      telepon: telepon || null,
      passwordHash: await hashPassword(password),
      peran: "ORANG_TUA",
      jenisKelamin,
    },
  });
  await prisma.waliSiswa.create({ data: { siswaId, penggunaId: ortu.id, hubungan: hubungan || "Wali" } });

  url.search = `?wali_dibuat=1&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  return NextResponse.redirect(url, { status: 303 });
}
