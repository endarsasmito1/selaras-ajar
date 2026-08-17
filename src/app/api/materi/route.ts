import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId"));
  const mapelId = String(formData.get("mapelId"));
  const judul = String(formData.get("judul"));
  const tipe = String(formData.get("tipe"));
  const isi = String(formData.get("isi"));
  const bab = String(formData.get("bab") ?? "");

  await prisma.materiBelajar.create({
    data: { kelasId, mapelId, penggunaId: session.userId, judul, tipe, isi, bab: bab || null },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/guru/materi";
  url.search = `?kelas=${kelasId}`;
  return NextResponse.redirect(url, { status: 303 });
}
