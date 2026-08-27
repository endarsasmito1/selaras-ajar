import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/pengumuman";

  if (!judul || !isi) {
    url.search = `?error=${encodeURIComponent("Judul & isi pengumuman wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.pengumumanSekolah.create({
    data: { sekolahId: session.sekolahId, judul, isi, dibuatOlehId: session.userId },
  });

  url.search = `?pengumuman_dibuat=${encodeURIComponent(judul)}`;
  return NextResponse.redirect(url, { status: 303 });
}
