import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "GURU" && session.peran !== "ORANG_TUA")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const penerimaId = String(formData.get("penerimaId"));
  const judul = String(formData.get("judul") ?? "Pesan");
  const isi = String(formData.get("isi"));
  const parentId = formData.get("parentId") ? String(formData.get("parentId")) : null;

  await prisma.pesan.create({
    data: { pengirimId: session.userId, penerimaId, judul, isi, parentId },
  });

  const url = req.nextUrl.clone();
  url.pathname = session.peran === "GURU" ? "/guru/pesan" : "/ortu/pesan";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
