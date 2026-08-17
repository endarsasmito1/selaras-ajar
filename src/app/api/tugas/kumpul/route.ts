import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "MURID") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tugasId = String(formData.get("tugasId"));
  const isiJawaban = String(formData.get("isiJawaban"));

  const siswa = await prisma.siswa.findUnique({ where: { akunId: session.userId } });
  const tugas = await prisma.tugas.findUnique({ where: { id: tugasId } });
  if (!siswa || !tugas) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const terlambat = new Date() > new Date(tugas.tenggat);

  await prisma.pengumpulanTugas.upsert({
    where: { tugasId_siswaId: { tugasId, siswaId: siswa.id } },
    update: { isiJawaban, terlambat, submitAt: new Date() },
    create: { tugasId, siswaId: siswa.id, isiJawaban, terlambat },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/murid/tugas";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
