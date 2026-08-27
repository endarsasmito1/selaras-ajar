import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { simpanFileUpload, ambilFileValid } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId") ?? "");
  const mapelId = String(formData.get("mapelId") ?? "");
  const judul = String(formData.get("judul") ?? "").trim();
  const instruksi = String(formData.get("instruksi") ?? "").trim();
  const tenggat = String(formData.get("tenggat") ?? "");
  const tautanUrl = String(formData.get("tautanUrl") ?? "").trim();
  const lampiranFile = ambilFileValid(formData, "lampiranFile");

  const url = req.nextUrl.clone();
  url.pathname = "/guru/tugas";

  if (!kelasId || !mapelId || !judul || !instruksi || !tenggat) {
    url.search = `?error=${encodeURIComponent("Kelas, mapel, judul, instruksi, dan tenggat wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const lampiranUrl = lampiranFile ? await simpanFileUpload(lampiranFile, "tugas") : null;

  await prisma.tugas.create({
    data: {
      kelasId,
      mapelId,
      penggunaId: session.userId,
      judul,
      instruksi,
      lampiranUrl,
      tautanUrl: tautanUrl || null,
      tenggat: new Date(tenggat),
    },
  });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
