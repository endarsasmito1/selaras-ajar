import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Peran } from "@/generated/prisma/client";

const PERAN_BISA_DITAMBAH: Peran[] = ["TU", "BENDAHARA"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const penggunaId = String(formData.get("penggunaId") ?? "");
  const peran = String(formData.get("peran") ?? "") as Peran;

  const target = await prisma.pengguna.findFirst({ where: { id: penggunaId, sekolahId: session.sekolahId } });

  const url = req.nextUrl.clone();
  url.pathname = target ? `/kepsek/guru/${target.id}/edit` : "/kepsek/guru";
  url.search = "";

  if (target && PERAN_BISA_DITAMBAH.includes(peran)) {
    await prisma.penggunaPeran.upsert({
      where: { penggunaId_sekolahId_peran: { penggunaId: target.id, sekolahId: session.sekolahId, peran } },
      update: {},
      create: { penggunaId: target.id, sekolahId: session.sekolahId, peran },
    });
  }

  return NextResponse.redirect(url, { status: 303 });
}
