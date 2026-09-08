import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logger, errorContext } from "@/lib/logger";

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

  try {
    // Dicek dulu (bukan langsung .update()) — pola yang sama ditemukan di izin/putuskan &
    // ppdb/putuskan: sebelumnya gak ada existence check (500 kalau id gak ada) DAN gak ada
    // filter sekolahId (bendahara sekolah lain yang tau/nebak id ini bisa nandain tagihan sekolah
    // lain lunas — celah lintas tenant di data finansial, lebih genting drpd 2 kasus sebelumnya).
    const existing = await prisma.tagihan.findFirst({ where: { id: tagihanId, siswa: { sekolahId: session.sekolahId } } });
    if (!existing) {
      url.search = `?error=${encodeURIComponent("Tagihan tidak ditemukan")}`;
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
  } catch (err) {
    // Feedback teknis (Sep 2026) — jalur pembayaran/finansial, wajib ada jejak kalau gagal
    // diam-diam (sebelumnya nol logging sama sekali di seluruh API).
    logger.error("Gagal menandai tagihan lunas", { route: "tagihan/lunas", tagihanId, sekolahId: session.sekolahId, ...errorContext(err) });
    url.search = `?error=${encodeURIComponent("Gagal menyimpan pembayaran, coba lagi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }
}
