import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "GURU" && session.peran !== "KEPALA_SEKOLAH")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const jadwalEntryId = String(formData.get("jadwalEntryId") ?? "");
  const keterangan = String(formData.get("keterangan") ?? "Berhalangan").trim();

  const now = new Date();
  const tanggalOnly = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  await prisma.presensiGuru.upsert({
    where: { jadwalEntryId_tanggal: { jadwalEntryId, tanggal: tanggalOnly } },
    update: { hadir: false, sumber: "MANUAL", keterangan },
    create: { jadwalEntryId, tanggal: tanggalOnly, hadir: false, sumber: "MANUAL", keterangan },
  });

  const url = req.nextUrl.clone();
  url.pathname = session.peran === "GURU" ? "/guru/jadwal" : "/kepsek/presensi-guru";
  url.search = "?hadir_disimpan=1";
  return NextResponse.redirect(url, { status: 303 });
}
