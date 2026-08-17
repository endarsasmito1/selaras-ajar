import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const mapelId = String(formData.get("mapelId"));
  const jenis = String(formData.get("jenis"));
  const pertanyaan = String(formData.get("pertanyaan"));
  const topik = String(formData.get("topik") ?? "");
  const tingkatKesulitan = String(formData.get("tingkatKesulitan") ?? "sedang");
  const poinDefault = Number(formData.get("poinDefault") ?? 10);

  let opsi: string | null = null;
  let kunciJawaban: string | null = null;

  if (jenis === "PILIHAN_GANDA") {
    const opsiList = (formData.getAll("opsi") as string[]).filter((o) => o.trim() !== "");
    const kunciIdx = formData.get("kunciJawaban");
    if (opsiList.length < 2 || kunciIdx === null || kunciIdx === "") {
      return NextResponse.json(
        { error: "Soal pilihan ganda wajib punya minimal 2 opsi dan kunci jawaban" },
        { status: 400 }
      );
    }
    opsi = JSON.stringify(opsiList);
    kunciJawaban = String(kunciIdx);
  } else if (jenis === "JAWABAN_SINGKAT") {
    kunciJawaban = String(formData.get("kunciSingkat") ?? "");
  }

  const soal = await prisma.soal.create({
    data: {
      sekolahId: session.sekolahId,
      mapelId,
      dibuatOlehId: session.userId,
      jenis: jenis as "PILIHAN_GANDA" | "JAWABAN_SINGKAT" | "ESAI",
      pertanyaan,
      opsi,
      kunciJawaban,
      topik: topik || null,
      tingkatKesulitan,
      poinDefault,
    },
  });

  // Kalau dipanggil dari alur susun ujian, langsung tambahkan ke ujian tsb
  const ujianId = formData.get("ujianId");
  if (ujianId) {
    const jumlahSoal = await prisma.ujianSoal.count({ where: { ujianId: String(ujianId) } });
    await prisma.ujianSoal.create({
      data: { ujianId: String(ujianId), soalId: soal.id, urutan: jumlahSoal + 1, poin: poinDefault },
    });
    const url = req.nextUrl.clone();
    url.pathname = `/guru/ujian/${ujianId}/edit`;
    url.search = "";
    return NextResponse.redirect(url, { status: 303 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/guru/bank-soal";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
