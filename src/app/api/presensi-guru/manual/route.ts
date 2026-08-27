import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const jadwalEntryId = String(formData.get("jadwalEntryId") ?? "");

  const now = new Date();
  const tanggalOnly = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  await prisma.presensiGuru.upsert({
    where: { jadwalEntryId_tanggal: { jadwalEntryId, tanggal: tanggalOnly } },
    update: { hadir: true, sumber: "MANUAL" },
    create: { jadwalEntryId, tanggal: tanggalOnly, hadir: true, sumber: "MANUAL" },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/guru/jadwal";
  url.search = "?hadir_disimpan=1";
  return NextResponse.redirect(url, { status: 303 });
}
