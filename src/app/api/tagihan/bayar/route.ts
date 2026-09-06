import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "ORANG_TUA") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  // 1.24 (F-ortu) — bisa lebih dari 1 tagihanId sekaligus: padanan tombol "Bayar Semua Tagihan"
  // di prototipe (ortu/index.html) yang mengonsolidasi >1 anak nunggak jadi 1 alur bayar, bukan
  // N tombol emas terpisah per anak. Tombol "Bayar" satuan yg sudah ada tetap jalan sama persis
  // (getAll dgn 1 value = array 1 elemen), gak ada perubahan perilaku utknya.
  const tagihanIds = formData.getAll("tagihanId").map(String).filter(Boolean);

  if (tagihanIds.length === 0) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  const tagihanList = await prisma.tagihan.findMany({
    where: { id: { in: tagihanIds } },
    include: { siswa: { include: { wali: true } } },
  });

  // Semua tagihan yg diminta HARUS ditemukan & milik anak org tua yg login — kalau satu aja gak
  // valid (mis. id ditebak/dipalsu), tolak SELURUH batch drpd bayar sebagian diam-diam.
  const semuaValid =
    tagihanList.length === tagihanIds.length &&
    tagihanList.every((t) => t.siswa.wali.some((w) => w.penggunaId === session.userId));
  if (!semuaValid) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  await prisma.tagihan.updateMany({
    where: { id: { in: tagihanIds } },
    data: { status: "LUNAS", dibayarPada: new Date(), metodeBayar: "QRIS" },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/ortu";
  url.search = `?toast=${encodeURIComponent(tagihanIds.length > 1 ? `${tagihanIds.length} tagihan berhasil dibayar.` : "Tagihan berhasil dibayar.")}&tone=success`;
  return NextResponse.redirect(url, { status: 303 });
}
