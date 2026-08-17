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
  const jenis = String(formData.get("jenis") ?? "UJIAN");

  const ujian = await prisma.ujian.create({
    data: {
      kelasId,
      mapelId,
      dibuatOlehId: session.userId,
      judul,
      jenis: jenis as "UJIAN" | "LATIHAN",
      status: "DRAFT",
    },
  });

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujian.id}/edit`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
