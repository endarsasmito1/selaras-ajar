import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, verifyPassword, hashPassword } from "@/lib/auth";

/** 1.10, diminta eksplisit — ganti password dari menu Akun, tersedia untuk semua peran. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const url = req.nextUrl.clone();
  url.pathname = req.headers.get("referer") ? new URL(req.headers.get("referer")!).pathname : "/";
  url.search = "";

  const formData = await req.formData();
  const passwordLama = String(formData.get("passwordLama") ?? "");
  const passwordBaru = String(formData.get("passwordBaru") ?? "");
  const konfirmasiPasswordBaru = String(formData.get("konfirmasiPasswordBaru") ?? "");

  if (!passwordLama || !passwordBaru || !konfirmasiPasswordBaru) {
    url.search = `?passwordError=${encodeURIComponent("Semua kolom wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }
  if (passwordBaru.length < 6) {
    url.search = `?passwordError=${encodeURIComponent("Password baru minimal 6 karakter")}`;
    return NextResponse.redirect(url, { status: 303 });
  }
  if (passwordBaru !== konfirmasiPasswordBaru) {
    url.search = `?passwordError=${encodeURIComponent("Konfirmasi password baru tidak cocok")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const user = await prisma.pengguna.findUnique({ where: { id: session.userId } });
  if (!user) {
    url.search = `?passwordError=${encodeURIComponent("Akun tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const cocok = await verifyPassword(passwordLama, user.passwordHash);
  if (!cocok) {
    url.search = `?passwordError=${encodeURIComponent("Password lama salah")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.pengguna.update({
    where: { id: session.userId },
    data: { passwordHash: await hashPassword(passwordBaru) },
  });

  url.search = "?passwordDiubah=1";
  return NextResponse.redirect(url, { status: 303 });
}
