import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

function passwordAcak() {
  return Math.random().toString(36).slice(2, 10);
}

/** 1.14, diminta eksplisit — akun kepala sekolah dipisah dari alur tambah sekolah, ditambahkan belakangan dari halaman detail sekolah. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const sekolahId = String(formData.get("sekolahId") ?? "");
  const kepsekNama = String(formData.get("kepsekNama") ?? "").trim();
  const kepsekEmail = String(formData.get("kepsekEmail") ?? "").trim().toLowerCase();
  const jenisKelaminRaw = String(formData.get("jenisKelamin") ?? "").trim();
  const jenisKelamin = jenisKelaminRaw === "L" || jenisKelaminRaw === "P" ? jenisKelaminRaw : null;

  const url = req.nextUrl.clone();
  url.pathname = `/superadmin/sekolah/${sekolahId}`;

  if (!sekolahId || !kepsekNama || !kepsekEmail) {
    url.search = `?error=${encodeURIComponent("Nama & email kepala sekolah wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const emailSudahAda = await prisma.pengguna.findUnique({ where: { email: kepsekEmail } });
  if (emailSudahAda) {
    url.search = `?error=${encodeURIComponent("Email itu sudah dipakai akun lain")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const password = passwordAcak();
  await prisma.pengguna.create({
    data: {
      sekolahId,
      nama: kepsekNama,
      email: kepsekEmail,
      passwordHash: await hashPassword(password),
      peran: "KEPALA_SEKOLAH",
      jenisKelamin,
    },
  });

  url.search = `?kepsek_dibuat=1&email=${encodeURIComponent(kepsekEmail)}&password=${encodeURIComponent(password)}`;
  return NextResponse.redirect(url, { status: 303 });
}
