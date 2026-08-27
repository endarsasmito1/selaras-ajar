import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const soalId = String(formData.get("soalId") ?? "");
  const jenis = String(formData.get("jenis") ?? "");
  const pertanyaan = String(formData.get("pertanyaan") ?? "").trim();
  const topik = String(formData.get("topik") ?? "");
  const tingkatKesulitan = String(formData.get("tingkatKesulitan") ?? "sedang");
  const poinDefault = Number(formData.get("poinDefault") ?? 10);
  const durasiDetikRaw = formData.get("durasiDetik");
  const durasiDetik = (jenis === "JAWABAN_SINGKAT" || jenis === "ESAI") && durasiDetikRaw ? Number(durasiDetikRaw) : null;

  const editUrl = req.nextUrl.clone();
  editUrl.pathname = `/guru/bank-soal/${soalId}/edit`;

  if (!soalId || !pertanyaan) {
    editUrl.search = `?error=${encodeURIComponent("Pertanyaan wajib diisi")}`;
    return NextResponse.redirect(editUrl, { status: 303 });
  }

  const soalMilikSekolah = await prisma.soal.findFirst({ where: { id: soalId, sekolahId: session.sekolahId } });
  if (!soalMilikSekolah) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  let opsi: string | null = null;
  let kunciJawaban: string | null = null;
  let penguranganMode: "PERSEN" | "POIN" | null = null;
  let penguranganNilai: number | null = null;

  if (jenis === "PILIHAN_GANDA" || jenis === "PILIHAN_GANDA_MINUS") {
    const opsiRaw = formData.getAll("opsi") as string[];
    const kunciIdx = formData.get("kunciJawaban");
    if (opsiRaw.length < 2 || opsiRaw.some((o) => o.trim() === "") || kunciIdx === null || kunciIdx === "") {
      editUrl.search = `?error=${encodeURIComponent("Soal pilihan ganda wajib punya semua opsi terisi dan kunci jawaban (BS-5)")}`;
      return NextResponse.redirect(editUrl, { status: 303 });
    }
    opsi = JSON.stringify(opsiRaw);
    kunciJawaban = String(kunciIdx);
    if (jenis === "PILIHAN_GANDA_MINUS") {
      const modeRaw = String(formData.get("penguranganMode") ?? "");
      const nilaiRaw = Number(formData.get("penguranganNilai") ?? NaN);
      if ((modeRaw !== "PERSEN" && modeRaw !== "POIN") || !Number.isFinite(nilaiRaw) || nilaiRaw <= 0 || (modeRaw === "PERSEN" && nilaiRaw > 100)) {
        editUrl.search = `?error=${encodeURIComponent("Soal nilai minus wajib punya mode & besaran potongan valid (persen maks 100)")}`;
        return NextResponse.redirect(editUrl, { status: 303 });
      }
      penguranganMode = modeRaw;
      penguranganNilai = nilaiRaw;
    }
  } else if (jenis === "PILIHAN_GANDA_KOMPLEKS") {
    const opsiRaw = formData.getAll("opsi") as string[];
    const kunciMulti = formData.getAll("kunciJawabanMulti") as string[];
    if (opsiRaw.length < 2 || opsiRaw.some((o) => o.trim() === "") || kunciMulti.length < 2) {
      editUrl.search = `?error=${encodeURIComponent("PG Kompleks wajib punya semua opsi terisi & minimal 2 kunci jawaban dicentang")}`;
      return NextResponse.redirect(editUrl, { status: 303 });
    }
    opsi = JSON.stringify(opsiRaw);
    kunciJawaban = JSON.stringify(kunciMulti.map(Number).sort((a, b) => a - b));
  } else if (jenis === "JAWABAN_SINGKAT") {
    kunciJawaban = String(formData.get("kunciSingkat") ?? "");
  }

  const updated = await prisma.soal.update({
    where: { id: soalId },
    data: {
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

  const url = req.nextUrl.clone();
  url.pathname = `/guru/bank-soal/mapel/${updated.mapelId}`;
  url.search = "?soal_diubah=1";
  return NextResponse.redirect(url, { status: 303 });
}
