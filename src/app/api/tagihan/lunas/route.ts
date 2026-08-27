import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "BENDAHARA" && session.peran !== "KEPALA_SEKOLAH")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tagihanId = String(formData.get("tagihanId") ?? "");
  const metode = String(formData.get("metode") ?? "Tunai");
  const catatan = String(formData.get("catatan") ?? "").trim();
  const tanggalBayar = String(formData.get("tanggalBayar") ?? "");
  const nominalRaw = formData.get("nominal");

  const url = req.nextUrl.clone();
  // 1.21 — form "Tandai lunas" sekarang di /keuangan/riwayat (dulu inline di /keuangan).
  url.pathname = "/keuangan/riwayat";

  if (!tagihanId || !tanggalBayar || nominalRaw === null || nominalRaw === "") {
    url.search = `?error=${encodeURIComponent("Nominal & tanggal pembayaran wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.tagihan.update({
    where: { id: tagihanId },
    data: {
      status: "LUNAS",
      dibayarPada: new Date(tanggalBayar),
      metodeBayar: catatan ? `${metode} — ${catatan}` : metode,
    },
  });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
