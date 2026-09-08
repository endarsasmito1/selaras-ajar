import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkThrottle, getClientIp } from "@/lib/rate-limit";

const PPDB_THROTTLE_LIMIT = 10;
const PPDB_THROTTLE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Throttle (Sep 2026, feedback teknis) — endpoint ini publik tanpa auth, sebelumnya bisa
  // di-spam bikin ribuan pendaftar palsu yang harus ditinjau manual satu-satu oleh kepsek.
  const ip = getClientIp(req);
  if (!checkThrottle(`ppdb:${ip}`, PPDB_THROTTLE_LIMIT, PPDB_THROTTLE_WINDOW_MS)) {
    return NextResponse.json({ error: "Terlalu banyak pendaftaran dari sumber ini. Coba lagi nanti." }, { status: 429 });
  }

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
