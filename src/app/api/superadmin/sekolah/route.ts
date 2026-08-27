import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const nama = String(formData.get("nama") ?? "").trim();
  const jenjang = String(formData.get("jenjang") ?? "SD");
  // 1.12/1.13 — terisi otomatis lewat pencarian api.co.id di form (TambahSekolahFlow), tapi tetap boleh
  // kosong/diedit manual (mis. sekolah baru yang belum terdaftar NPSN-nya).
  const npsn = String(formData.get("npsn") ?? "").trim() || null;
  const alamat = String(formData.get("alamat") ?? "").trim() || null;
  const kecamatan = String(formData.get("kecamatan") ?? "").trim() || null;
  const kabupatenKota = String(formData.get("kabupatenKota") ?? "").trim() || null;
  const provinsi = String(formData.get("provinsi") ?? "").trim() || null;
  const kodePos = String(formData.get("kodePos") ?? "").trim() || null;
  const latitudeRaw = String(formData.get("latitude") ?? "").trim();
  const longitudeRaw = String(formData.get("longitude") ?? "").trim();
  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;

  const url = req.nextUrl.clone();
  url.pathname = "/superadmin/sekolah/tambah";

  if (!nama) {
    url.search = `?error=${encodeURIComponent("Nama sekolah wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  // 1.14, diminta eksplisit — akun kepala sekolah TIDAK lagi dibuat di sini (dipisah, ditambahkan
  // belakangan dari halaman detail sekolah lewat "+ Tambah akun kepala sekolah").
  const sekolah = await prisma.sekolah.create({ data: { nama, jenjang, npsn, alamat, kecamatan, kabupatenKota, provinsi, kodePos, latitude, longitude } });

  url.pathname = "/superadmin/sekolah";
  url.search = `?sekolah_dibuat=1&sekolahId=${sekolah.id}`;
  return NextResponse.redirect(url, { status: 303 });
}
