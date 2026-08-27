import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTahunAjaranAktif } from "@/lib/data";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tema = String(formData.get("tema") ?? "").trim();
  const dimensi = formData.getAll("dimensi") as string[];

  const url = req.nextUrl.clone();
  url.pathname = "/guru/projek/baru";

  if (!tema || dimensi.length === 0) {
    url.search = `?error=${encodeURIComponent("Tema & minimal satu dimensi P5 wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const tahunAktif = await getTahunAjaranAktif(session.sekolahId);
  if (!tahunAktif) {
    url.search = `?error=${encodeURIComponent("Belum ada tahun ajaran aktif")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.projek.create({
    data: {
      sekolahId: session.sekolahId,
      tahunAjaranId: tahunAktif.id,
      tema,
      dimensiP5: JSON.stringify(dimensi),
      dibuatOlehId: session.userId,
    },
  });

  url.pathname = "/guru/projek";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
