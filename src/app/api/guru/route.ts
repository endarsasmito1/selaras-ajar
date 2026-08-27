import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

const PASSWORD_DEFAULT = "selaras123";

/** MG-1 (1.8, diminta eksplisit): tambah guru manual langsung dari halaman Data Guru — sebelumnya cuma impor CSV. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const nama = String(formData.get("nama") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telepon = String(formData.get("telepon") ?? "").trim();
  const jenisKelaminRaw = String(formData.get("jenisKelamin") ?? "").trim();
  const jenisKelamin = jenisKelaminRaw === "L" || jenisKelaminRaw === "P" ? jenisKelaminRaw : null;
  const nip = String(formData.get("nip") ?? "").trim();
  const mapelUtama = String(formData.get("mapelUtama") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/guru";

  if (!nama || !email) {
    url.search = `?error=${encodeURIComponent("Nama & email wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const sudahAda = await prisma.pengguna.findUnique({ where: { email } });
  if (sudahAda) {
    url.search = `?error=${encodeURIComponent(`Email "${email}" sudah terdaftar`)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const passwordHash = await hashPassword(PASSWORD_DEFAULT);
  const pengguna = await prisma.pengguna.create({
    data: { sekolahId: session.sekolahId, nama, email, passwordHash, peran: "GURU", telepon: telepon || null, jenisKelamin },
  });
  await prisma.guruProfil.create({
    data: { penggunaId: pengguna.id, nip: nip || null, mapelUtama: mapelUtama || null },
  });

  url.search = `?guru_dibuat=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
