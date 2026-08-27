import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const soalId = String(formData.get("soalId") ?? "");

  await prisma.soal.deleteMany({ where: { id: soalId, sekolahId: null } });

  const url = req.nextUrl.clone();
  url.pathname = "/superadmin/bank-soal";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
