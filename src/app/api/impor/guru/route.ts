import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";

const PASSWORD_DEFAULT = "selaras123";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/guru";

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    url.search = `?error=${encodeURIComponent("File CSV tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const text = await file.text();
  const rows = parseCsv(text).slice(1);
  const passwordHash = await hashPassword(PASSWORD_DEFAULT);

  let dibuat = 0;
  for (const row of rows) {
    const [nama, emailRaw, telepon, nip, mapelUtama] = row;
    const email = (emailRaw ?? "").trim().toLowerCase();
    if (!nama || !email) continue;

    const sudahAda = await prisma.pengguna.findUnique({ where: { email } });
    if (sudahAda) continue;

    const pengguna = await prisma.pengguna.create({
      data: {
        sekolahId: session.sekolahId,
        nama,
        email,
        passwordHash,
        peran: "GURU",
        telepon: telepon || null,
      },
    });
    await prisma.guruProfil.create({
      data: { penggunaId: pengguna.id, nip: nip || null, mapelUtama: mapelUtama || null },
    });
    dibuat++;
  }

  url.search = `?impor_guru=${dibuat}`;
  return NextResponse.redirect(url, { status: 303 });
}
