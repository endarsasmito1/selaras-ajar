import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const ujianId = String(formData.get("ujianId"));

  const jumlahSoal = await prisma.ujianSoal.count({ where: { ujianId } });
  if (jumlahSoal === 0) {
    return NextResponse.json({ error: "Ujian belum punya soal" }, { status: 400 });
  }

  await prisma.ujian.update({ where: { id: ujianId }, data: { status: "PUBLISHED" } });

  const url = req.nextUrl.clone();
  url.pathname = "/guru/ujian";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
