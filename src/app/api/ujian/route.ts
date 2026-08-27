import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { cariAtauBuatBab } from "@/lib/data";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const judul = String(formData.get("judul"));
  const jenis = String(formData.get("jenis") ?? "UJIAN");
  const jenisPenilaian = String(formData.get("jenisPenilaian") ?? "HARIAN");
  const pasangan = formData.getAll("penugasan").map((v) => String(v).split("|"));
  const babId = String(formData.get("babId") ?? "");
  const babBaru = String(formData.get("babBaru") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/guru/ujian/baru";

  if (pasangan.length === 0) {
    url.search = `?error=${encodeURIComponent("Pilih minimal satu kelas")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const mapelIdSet = new Set(pasangan.map(([, mapelId]) => mapelId));
  if (mapelIdSet.size > 1) {
    url.search = `?error=${encodeURIComponent("Semua kelas yang dipilih harus untuk mapel yang sama — buat ujian terpisah untuk mapel lain")}`;
    return NextResponse.redirect(url, { status: 303 });
  }
  const mapelId = pasangan[0][1];
  const kelasIds = pasangan.map(([kelasId]) => kelasId);

  // 1.23 — bab wajib: nama baru (kalau diisi) menang, find-or-create; kalau tidak, wajib pilih dari dropdown.
  let resolvedBabId: string;
  if (babBaru) {
    const bab = await cariAtauBuatBab(session.sekolahId, mapelId, babBaru);
    resolvedBabId = bab.id;
  } else if (babId) {
    const bab = await prisma.bab.findUnique({ where: { id: babId } });
    if (!bab || bab.mapelId !== mapelId) {
      url.search = `?error=${encodeURIComponent("Bab yang dipilih bukan dari mapel yang sama dengan kelas yang dicentang")}`;
      return NextResponse.redirect(url, { status: 303 });
    }
    resolvedBabId = bab.id;
  } else {
    url.search = `?error=${encodeURIComponent("Bab wajib dipilih atau diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const ujian = await prisma.ujian.create({
    data: {
      mapelId,
      dibuatOlehId: session.userId,
      judul,
      jenis: jenis as "UJIAN" | "LATIHAN",
      jenisPenilaian: jenisPenilaian as "HARIAN" | "UTS" | "UAS",
      status: "DRAFT",
      babId: resolvedBabId,
      kelas: { create: kelasIds.map((kelasId) => ({ kelasId })) },
    },
  });

  url.pathname = `/guru/ujian/${ujian.id}/edit`;
  url.search = "?ujian_dibuat=1";
  return NextResponse.redirect(url, { status: 303 });
}
