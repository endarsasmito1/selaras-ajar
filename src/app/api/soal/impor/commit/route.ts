import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ambilBatch, hapusBatch } from "@/lib/csv";

const HURUF_KE_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const batchId = String(formData.get("batchId") ?? "");
  const batch = ambilBatch(batchId);

  if (!batch || batch.jenis !== "soal") {
    return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
  }

  for (const row of batch.valid) {
    let opsi: string | null = null;
    let kunciJawaban: string | null = null;
    if (row.jenis === "PILIHAN_GANDA") {
      const opsiArr = [row.opsiA, row.opsiB, row.opsiC, row.opsiD].filter((o): o is string => !!o && o.trim() !== "");
      opsi = JSON.stringify(opsiArr);
      const kunciHuruf = (row.kunciJawaban ?? "").trim().toUpperCase();
      kunciJawaban = String(HURUF_KE_INDEX[kunciHuruf] ?? 0);
    } else if (row.jenis === "JAWABAN_SINGKAT") {
      kunciJawaban = row.kunciJawaban ?? "";
    }

    await prisma.soal.create({
      data: {
        sekolahId: batch.sekolahId,
        mapelId: batch.mapelId,
        dibuatOlehId: batch.guruId,
        jenis: row.jenis,
        pertanyaan: row.pertanyaan,
        opsi,
        kunciJawaban,
        topik: row.topik || null,
        tingkatKesulitan: "sedang",
        poinDefault: 10,
      },
    });
  }

  hapusBatch(batchId);

  const url = req.nextUrl.clone();
  url.pathname = "/guru/bank-soal";
  url.search = `?soal_diimpor=${batch.valid.length}`;
  return NextResponse.redirect(url, { status: 303 });
}
