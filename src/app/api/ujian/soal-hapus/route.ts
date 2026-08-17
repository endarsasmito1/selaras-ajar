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
  const soalId = String(formData.get("soalId"));

  await prisma.ujianSoal.deleteMany({ where: { ujianId, soalId } });

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}/edit`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
