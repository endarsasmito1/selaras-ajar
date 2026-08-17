import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const nama = String(formData.get("nama"));
  const email = String(formData.get("email"));
  const peran = String(formData.get("peran"));
  const telepon = String(formData.get("telepon") ?? "");

  const sudahAda = await prisma.pengguna.findUnique({ where: { email } });
  if (sudahAda) {
    return NextResponse.json({ error: "Email sudah dipakai" }, { status: 400 });
  }

  const passwordHash = await hashPassword("selaras123");
  await prisma.pengguna.create({
    data: {
      sekolahId: session.sekolahId,
      nama,
      email,
      passwordHash,
      peran: peran as "KEPALA_SEKOLAH" | "BENDAHARA" | "GURU" | "ORANG_TUA" | "MURID",
      telepon: telepon || null,
    },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/pengguna";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
