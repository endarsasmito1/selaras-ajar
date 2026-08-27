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
  const komponenList = ["Ulangan Harian", "Tugas", "UTS", "UAS"];

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  let total = 0;
  const nilaiList: { komponen: string; persentase: number }[] = [];
  for (const k of komponenList) {
    const v = Number(formData.get(`bobot_${k}`) ?? 0);
    total += v;
    nilaiList.push({ komponen: k, persentase: v });
  }

  // N-1 (1.7, diminta eksplisit): total bobot wajib tepat 100% — ditolak dengan pesan jelas, bukan diam-diam disimpan salah.
  if (total !== 100) {
    url.search = `?error=${encodeURIComponent(`Total bobot harus 100%, sekarang ${total}%`)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  for (const n of nilaiList) {
    await prisma.bobotKomponen.upsert({
      where: { mapelId_komponen: { mapelId, komponen: n.komponen } },
      update: { persentase: n.persentase },
      create: { mapelId, komponen: n.komponen, persentase: n.persentase },
    });
  }

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
