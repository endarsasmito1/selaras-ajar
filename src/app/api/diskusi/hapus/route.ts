import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const komentarId = String(formData.get("komentarId") ?? "");
  const komentar = await prisma.komentarKonten.findUnique({
    where: { id: komentarId },
    include: { materi: true, tugas: true },
  });

  const url = req.nextUrl.clone();
  if (komentar) {
    // DK-4: moderasi — guru yang jadi pemilik materi/tugas boleh hapus komentar siapa pun di sana.
    const pemilik = komentar.materi?.penggunaId ?? komentar.tugas?.penggunaId;
    if (pemilik === session.userId) {
      await prisma.komentarKonten.deleteMany({ where: { OR: [{ id: komentarId }, { parentId: komentarId }] } });
    }
    url.pathname = komentar.materiId ? "/guru/materi" : `/guru/tugas/${komentar.tugasId}`;
  } else {
    url.pathname = "/guru/tugas";
  }
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
