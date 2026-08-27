import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { simpanFileUpload, ambilFileValid } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "MURID") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tugasId = String(formData.get("tugasId") ?? "");
  const isiJawaban = String(formData.get("isiJawaban") ?? "").trim();
  const tautanUrl = String(formData.get("tautanUrl") ?? "").trim();
  const lampiranFile = ambilFileValid(formData, "lampiranFile");

  const siswa = await prisma.siswa.findUnique({ where: { akunId: session.userId } });
  const tugas = await prisma.tugas.findUnique({ where: { id: tugasId } });
  if (!siswa || !tugas) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const url = req.nextUrl.clone();
  if (!isiJawaban && !lampiranFile && !tautanUrl) {
    url.pathname = `/murid/tugas/${tugasId}`;
    url.search = `?error=${encodeURIComponent("Isi minimal salah satu: jawaban teks, lampiran, atau tautan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const terlambat = new Date() > new Date(tugas.tenggat);
  const lampiranUrl = lampiranFile ? await simpanFileUpload(lampiranFile, "pengumpulan-tugas") : undefined;

  await prisma.pengumpulanTugas.upsert({
    where: { tugasId_siswaId: { tugasId, siswaId: siswa.id } },
    update: {
      isiJawaban: isiJawaban || null,
      ...(lampiranUrl ? { lampiranUrl } : {}),
      tautanUrl: tautanUrl || null,
      terlambat,
      submitAt: new Date(),
    },
    create: {
      tugasId,
      siswaId: siswa.id,
      isiJawaban: isiJawaban || null,
      lampiranUrl: lampiranUrl ?? null,
      tautanUrl: tautanUrl || null,
      terlambat,
    },
  });

  url.pathname = "/murid/tugas";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
