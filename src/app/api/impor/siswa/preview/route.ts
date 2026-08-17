import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseCsv, simpanBatch, type BarisImporSiswa } from "@/lib/csv";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "KEPALA_SEKOLAH") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return NextResponse.json({ error: "File kosong atau tidak punya data" }, { status: 400 });
  }

  const header = rows[0].map((h) => h.toLowerCase().trim());
  const idx = {
    nisn: header.indexOf("nisn"),
    nama: header.indexOf("nama"),
    kelas: header.indexOf("kelas"),
    jk: header.indexOf("jenis_kelamin"),
    wali: header.indexOf("nama_wali"),
    telp: header.indexOf("telepon_wali"),
  };

  const kelasSekolah = await prisma.kelas.findMany({ where: { sekolahId: session.sekolahId } });
  const kelasMap = new Map(kelasSekolah.map((k) => [k.nama.toLowerCase(), k]));
  const existingSiswa = await prisma.siswa.findMany({ where: { sekolahId: session.sekolahId } });
  const nisnMap = new Map(existingSiswa.map((s) => [s.nisn, s]));

  const nisnDalamFile = new Set<string>();
  const valid: BarisImporSiswa[] = [];
  const bermasalah: BarisImporSiswa[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const nomorBaris = i + 1;
    const nisn = (r[idx.nisn] ?? "").trim();
    const nama = (r[idx.nama] ?? "").trim();
    const kelasNama = (r[idx.kelas] ?? "").trim();
    const jenisKelamin = (r[idx.jk] ?? "L").trim().toUpperCase();
    const waliNama = idx.wali >= 0 ? (r[idx.wali] ?? "").trim() : "";
    const waliTelepon = idx.telp >= 0 ? (r[idx.telp] ?? "").trim() : "";

    const baris: BarisImporSiswa = { baris: nomorBaris, nisn, nama, kelasNama, jenisKelamin, waliNama, waliTelepon };

    if (!nisn) {
      bermasalah.push({ ...baris, error: "NISN kosong" });
      continue;
    }
    if (nisnDalamFile.has(nisn)) {
      bermasalah.push({ ...baris, error: "NISN duplikat di dalam file ini" });
      continue;
    }
    if (!nama) {
      bermasalah.push({ ...baris, error: "Nama kosong" });
      continue;
    }
    if (!kelasMap.has(kelasNama.toLowerCase())) {
      bermasalah.push({ ...baris, error: `Kelas "${kelasNama}" tidak ditemukan` });
      continue;
    }
    if (jenisKelamin !== "L" && jenisKelamin !== "P") {
      bermasalah.push({ ...baris, error: 'Jenis kelamin harus "L" atau "P"' });
      continue;
    }

    nisnDalamFile.add(nisn);
    baris.aksi = nisnMap.has(nisn) ? "perbarui" : "buat";
    valid.push(baris);
  }

  const batchId = simpanBatch({ jenis: "siswa", valid, bermasalah, createdAt: Date.now() });

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/ekspor/impor-preview";
  url.search = `?batch=${batchId}`;
  return NextResponse.redirect(url, { status: 303 });
}
