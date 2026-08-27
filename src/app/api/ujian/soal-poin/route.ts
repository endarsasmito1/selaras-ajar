import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * 1.23 — sebelumnya `UjianSoal.poin` dicopy dari `Soal.poinDefault` sekali di soal-tambah lalu
 * beku (tak ada UI edit sama sekali). Cuma bisa diubah selagi ujian masih DRAFT — begitu
 * PUBLISHED, poin harus tetap seperti yang murid lihat saat mengerjakan.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const ujianId = String(formData.get("ujianId") ?? "");
  const soalId = String(formData.get("soalId") ?? "");
  const poin = Number(formData.get("poin") ?? NaN);

  const url = req.nextUrl.clone();
  url.pathname = `/guru/ujian/${ujianId}/edit`;
  url.search = "";

  if (!Number.isFinite(poin) || poin <= 0) {
    url.search = `?error=${encodeURIComponent("Poin harus angka lebih dari 0")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const ujian = await prisma.ujian.findFirst({
    where: { id: ujianId, dibuatOlehId: session.userId, status: "DRAFT" },
  });
  if (!ujian) {
    return NextResponse.json({ error: "Ujian tidak ditemukan atau sudah diterbitkan" }, { status: 404 });
  }

  await prisma.ujianSoal.update({
    where: { ujianId_soalId: { ujianId, soalId } },
    data: { poin },
  });

  return NextResponse.redirect(url, { status: 303 });
}
