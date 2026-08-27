import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId") ?? "");
  const mapelId = String(formData.get("mapelId") ?? "");
  const kelasId = String(formData.get("kelasId") ?? "");
  const periode = String(formData.get("periode") ?? "");
  const isi = String(formData.get("isi") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/guru/nilai/asesmen";
  url.search = `?kelas=${kelasId}`;

  if (!isi) {
    url.search = `?kelas=${kelasId}&error=${encodeURIComponent("Catatan tidak boleh kosong")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.catatanAsesmen.create({
    data: { siswaId, mapelId, periode, isi, penggunaId: session.userId },
  });

  return NextResponse.redirect(url, { status: 303 });
}
