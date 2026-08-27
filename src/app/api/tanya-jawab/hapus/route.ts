import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 1.23 — sengaja gak ada route hapus utk murid sama sekali: larangan "murid gak bisa hapus
// pertanyaan sendiri" ditegakkan lewat ketiadaan endpoint, bukan pengecekan role runtime.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tanyaJawabId = String(formData.get("tanyaJawabId") ?? "");
  const item = await prisma.tanyaJawabKelas.findUnique({ where: { id: tanyaJawabId } });

  const url = req.nextUrl.clone();
  if (item) {
    // Moderasi: guru yg diampu kelas+mapel thread ini (bukan cuma pemilik postingan) boleh hapus.
    const guru = await prisma.guruProfil.findUnique({ where: { penggunaId: session.userId } });
    const penugasan = guru
      ? await prisma.penugasanGuru.findFirst({
          where: { guruId: guru.id, kelasId: item.kelasId, mapelId: item.mapelId },
        })
      : null;
    if (penugasan) {
      await prisma.tanyaJawabKelas.deleteMany({ where: { OR: [{ id: tanyaJawabId }, { parentId: tanyaJawabId }] } });
    }
    url.pathname = "/guru/tanya-jawab";
    url.search = `?kelas=${item.kelasId}&mapel=${item.mapelId}`;
  } else {
    url.pathname = "/guru/tanya-jawab";
    url.search = "";
  }
  return NextResponse.redirect(url, { status: 303 });
}
