import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv, simpanBatch, type BarisImporSoal } from "@/lib/csv";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const mapelId = String(formData.get("mapelId") ?? "");
  const file = formData.get("file");

  const importUrl = req.nextUrl.clone();
  importUrl.pathname = "/guru/bank-soal/impor";

  if (!mapelId || typeof file === "string" || !file) {
    importUrl.search = `?error=${encodeURIComponent("Pilih mata pelajaran & file CSV")}`;
    return NextResponse.redirect(importUrl, { status: 303 });
  }

  const mapelValid = await prisma.mataPelajaran.findFirst({ where: { id: mapelId, sekolahId: session.sekolahId } });
  if (!mapelValid) {
    return NextResponse.json({ error: "Mata pelajaran tidak ditemukan" }, { status: 404 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    importUrl.search = `?error=${encodeURIComponent("File CSV kosong atau tak punya baris data")}`;
    return NextResponse.redirect(importUrl, { status: 303 });
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {
    jenis: header.indexOf("jenis"),
    pertanyaan: header.indexOf("pertanyaan"),
    opsiA: header.indexOf("opsi_a"),
    opsiB: header.indexOf("opsi_b"),
    opsiC: header.indexOf("opsi_c"),
    opsiD: header.indexOf("opsi_d"),
    kunci: header.indexOf("kunci"),
    topik: header.indexOf("topik"),
  };

  const valid: BarisImporSoal[] = [];
  const bermasalah: BarisImporSoal[] = [];
  const jenisValid = new Set(["PILIHAN_GANDA", "JAWABAN_SINGKAT", "ESAI"]);

  rows.slice(1).forEach((r, i) => {
    const baris = i + 2;
    const jenis = (r[idx.jenis] ?? "").trim().toUpperCase();
    const pertanyaan = (r[idx.pertanyaan] ?? "").trim();
    const item: BarisImporSoal = {
      baris,
      mapelNama: "",
      jenis: (jenisValid.has(jenis) ? jenis : "ESAI") as BarisImporSoal["jenis"],
      pertanyaan,
      opsiA: idx.opsiA >= 0 ? r[idx.opsiA] : undefined,
      opsiB: idx.opsiB >= 0 ? r[idx.opsiB] : undefined,
      opsiC: idx.opsiC >= 0 ? r[idx.opsiC] : undefined,
      opsiD: idx.opsiD >= 0 ? r[idx.opsiD] : undefined,
      kunciJawaban: idx.kunci >= 0 ? r[idx.kunci] : undefined,
      topik: idx.topik >= 0 ? r[idx.topik] : undefined,
    };

    if (!jenisValid.has(jenis)) {
      bermasalah.push({ ...item, error: `Baris ${baris}: jenis "${r[idx.jenis]}" tidak dikenal` });
      return;
    }
    if (!pertanyaan) {
      bermasalah.push({ ...item, error: `Baris ${baris}: pertanyaan kosong` });
      return;
    }
    if (jenis === "PILIHAN_GANDA") {
      const opsiTerisi = [item.opsiA, item.opsiB, item.opsiC, item.opsiD].filter((o) => o && o.trim() !== "");
      const kunciHuruf = (item.kunciJawaban ?? "").trim().toUpperCase();
      if (opsiTerisi.length < 2 || !["A", "B", "C", "D"].includes(kunciHuruf)) {
        bermasalah.push({ ...item, error: `Baris ${baris}: pilihan ganda wajib minimal 2 opsi & kunci A-D (BS-5)` });
        return;
      }
    }
    valid.push(item);
  });

  const batchId = simpanBatch({
    jenis: "soal",
    valid,
    bermasalah,
    createdAt: Date.now(),
    mapelId,
    sekolahId: session.sekolahId,
    guruId: session.userId,
  });

  const url = req.nextUrl.clone();
  url.pathname = "/guru/bank-soal/impor/preview";
  url.search = `?batch=${batchId}`;
  return NextResponse.redirect(url, { status: 303 });
}
