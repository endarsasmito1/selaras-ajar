import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const namaCalon = String(formData.get("namaCalon"));
  const jenjangDaftar = String(formData.get("jenjangDaftar"));
  const namaOrtu = String(formData.get("namaOrtu"));
  const kontak = String(formData.get("kontak"));

  // Prototype single-tenant — ambil sekolah pertama. Produk multi-sekolah nyata
  // butuh identifikasi sekolah dari subdomain/slug publik.
  const sekolah = await prisma.sekolah.findFirst();
  if (!sekolah) {
    return NextResponse.json({ error: "Sekolah tidak ditemukan" }, { status: 500 });
  }

  await prisma.pPDBPendaftar.create({
    data: { sekolahId: sekolah.id, namaCalon, jenjangDaftar, namaOrtu, kontak },
  });

  const url = req.nextUrl.clone();
  url.pathname = "/ppdb";
  url.search = "?sukses=1";
  return NextResponse.redirect(url, { status: 303 });
}
