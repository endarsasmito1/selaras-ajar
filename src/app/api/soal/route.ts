import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const mapelId = String(formData.get("mapelId") ?? "");
  const jenis = String(formData.get("jenis") ?? "");
  const pertanyaan = String(formData.get("pertanyaan") ?? "").trim();
  const topik = String(formData.get("topik") ?? "");
  const tingkatKesulitan = String(formData.get("tingkatKesulitan") ?? "sedang");
  const poinDefault = Number(formData.get("poinDefault") ?? 10);
  const durasiDetikRaw = formData.get("durasiDetik");
  const durasiDetik = (jenis === "JAWABAN_SINGKAT" || jenis === "ESAI") && durasiDetikRaw ? Number(durasiDetikRaw) : null;

  const bankSoalUrl = req.nextUrl.clone();
  bankSoalUrl.pathname = mapelId ? `/guru/bank-soal/mapel/${mapelId}` : "/guru/bank-soal";

  if (!mapelId || !pertanyaan) {
    bankSoalUrl.search = `?error=${encodeURIComponent("Mata pelajaran & pertanyaan wajib diisi")}`;
    return NextResponse.redirect(bankSoalUrl, { status: 303 });
  }

  const mapelValid = await prisma.mataPelajaran.findFirst({ where: { id: mapelId, sekolahId: session.sekolahId } });
  if (!mapelValid) {
    return NextResponse.json({ error: "Mata pelajaran tidak ditemukan" }, { status: 404 });
  }

  let opsi: string | null = null;
  let kunciJawaban: string | null = null;
  let penguranganMode: "PERSEN" | "POIN" | null = null;
  let penguranganNilai: number | null = null;

  if (jenis === "PILIHAN_GANDA" || jenis === "PILIHAN_GANDA_MINUS") {
    const opsiRaw = formData.getAll("opsi") as string[];
    const kunciIdx = formData.get("kunciJawaban");
    // 1.10, diminta eksplisit: SEMUA field opsi wajib diisi (bukan cuma minimal 2 dari beberapa kosong).
    if (opsiRaw.length < 2 || opsiRaw.some((o) => o.trim() === "") || kunciIdx === null || kunciIdx === "") {
      bankSoalUrl.search = `?error=${encodeURIComponent("Soal pilihan ganda wajib punya semua opsi terisi dan kunci jawaban (BS-5)")}`;
      return NextResponse.redirect(bankSoalUrl, { status: 303 });
    }
    opsi = JSON.stringify(opsiRaw);
    kunciJawaban = String(kunciIdx);
    if (jenis === "PILIHAN_GANDA_MINUS") {
      const modeRaw = String(formData.get("penguranganMode") ?? "");
      const nilaiRaw = Number(formData.get("penguranganNilai") ?? NaN);
      if ((modeRaw !== "PERSEN" && modeRaw !== "POIN") || !Number.isFinite(nilaiRaw) || nilaiRaw <= 0 || (modeRaw === "PERSEN" && nilaiRaw > 100)) {
        bankSoalUrl.search = `?error=${encodeURIComponent("Soal nilai minus wajib punya mode & besaran potongan valid (persen maks 100)")}`;
        return NextResponse.redirect(bankSoalUrl, { status: 303 });
      }
      penguranganMode = modeRaw;
      penguranganNilai = nilaiRaw;
    }
  } else if (jenis === "PILIHAN_GANDA_KOMPLEKS") {
    const opsiRaw = formData.getAll("opsi") as string[];
    const kunciMulti = formData.getAll("kunciJawabanMulti") as string[];
    if (opsiRaw.length < 2 || opsiRaw.some((o) => o.trim() === "") || kunciMulti.length < 2) {
      bankSoalUrl.search = `?error=${encodeURIComponent("PG Kompleks wajib punya semua opsi terisi & minimal 2 kunci jawaban dicentang")}`;
      return NextResponse.redirect(bankSoalUrl, { status: 303 });
    }
    opsi = JSON.stringify(opsiRaw);
    kunciJawaban = JSON.stringify(kunciMulti.map(Number).sort((a, b) => a - b));
  } else if (jenis === "JAWABAN_SINGKAT") {
    kunciJawaban = String(formData.get("kunciSingkat") ?? "");
  }

  const soal = await prisma.soal.create({
    data: {
      sekolahId: session.sekolahId,
      mapelId,
      dibuatOlehId: session.userId,
      jenis: jenis as "PILIHAN_GANDA" | "PILIHAN_GANDA_KOMPLEKS" | "PILIHAN_GANDA_MINUS" | "JAWABAN_SINGKAT" | "ESAI",
      pertanyaan,
      opsi,
      kunciJawaban,
      topik: topik || null,
      tingkatKesulitan,
      poinDefault,
      penguranganMode,
      penguranganNilai,
      durasiDetik,
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
  url.pathname = `/guru/bank-soal/mapel/${mapelId}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
