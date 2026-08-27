import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const mapelId = String(formData.get("mapelId"));
  const kkm = Number(formData.get("kkm"));
  const kkmUTSRaw = String(formData.get("kkmUTS") ?? "").trim();
  const kkmUASRaw = String(formData.get("kkmUAS") ?? "").trim();
  const kkmUTS = kkmUTSRaw ? Number(kkmUTSRaw) : null;
  const kkmUAS = kkmUASRaw ? Number(kkmUASRaw) : null;

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  if (!mapelId || !Number.isFinite(kkm) || kkm < 0 || kkm > 100) {
    url.search = `?error=${encodeURIComponent("KKM harus angka 0-100")}`;
    return NextResponse.redirect(url, { status: 303 });
  }
  if ((kkmUTS !== null && (!Number.isFinite(kkmUTS) || kkmUTS < 0 || kkmUTS > 100)) || (kkmUAS !== null && (!Number.isFinite(kkmUAS) || kkmUAS < 0 || kkmUAS > 100))) {
    url.search = `?error=${encodeURIComponent("KKM UTS/UAS harus angka 0-100 atau dikosongkan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const mapel = await prisma.mataPelajaran.findFirst({ where: { id: mapelId, sekolahId: session.sekolahId } });
  if (!mapel) {
    url.search = `?error=${encodeURIComponent("Mapel tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.mataPelajaran.update({ where: { id: mapelId }, data: { kkm, kkmUTS, kkmUAS } });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
