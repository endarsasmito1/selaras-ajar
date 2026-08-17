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
  const instruksi = String(formData.get("instruksi"));
  const tenggat = String(formData.get("tenggat"));

  await prisma.tugas.create({
    data: { kelasId, mapelId, penggunaId: session.userId, judul, instruksi, tenggat: new Date(tenggat) },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/guru/tugas";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
