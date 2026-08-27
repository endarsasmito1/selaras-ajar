import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const mapelNama = String(formData.get("mapelNama") ?? "").trim();
  const rekomendasiKelas = String(formData.get("rekomendasiKelas") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "");
  const pertanyaan = String(formData.get("pertanyaan") ?? "").trim();
  const tingkatKesulitan = String(formData.get("tingkatKesulitan") ?? "sedang");
  const poinDefault = Number(formData.get("poinDefault") ?? 10);
  const durasiDetikRaw = formData.get("durasiDetik");
  const durasiDetik = (jenis === "JAWABAN_SINGKAT" || jenis === "ESAI") && durasiDetikRaw ? Number(durasiDetikRaw) : null;

  const url = req.nextUrl.clone();
  url.pathname = "/superadmin/bank-soal";

  if (!mapelNama || !pertanyaan) {
    url.search = `?error=${encodeURIComponent("Mapel & pertanyaan wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  let opsi: string | null = null;
  let kunciJawaban: string | null = null;
  let penguranganMode: "PERSEN" | "POIN" | null = null;
  let penguranganNilai: number | null = null;

  if (jenis === "PILIHAN_GANDA" || jenis === "PILIHAN_GANDA_MINUS") {
    const opsiRaw = formData.getAll("opsi") as string[];
    const kunciIdx = formData.get("kunciJawaban");
    if (opsiRaw.length < 2 || opsiRaw.some((o) => o.trim() === "") || kunciIdx === null || kunciIdx === "") {
      url.search = `?error=${encodeURIComponent("Soal pilihan ganda wajib punya semua opsi terisi dan kunci jawaban (BS-5)")}`;
      return NextResponse.redirect(url, { status: 303 });
    }
    opsi = JSON.stringify(opsiRaw);
    kunciJawaban = String(kunciIdx);
    if (jenis === "PILIHAN_GANDA_MINUS") {
      const modeRaw = String(formData.get("penguranganMode") ?? "");
      const nilaiRaw = Number(formData.get("penguranganNilai") ?? NaN);
      if ((modeRaw !== "PERSEN" && modeRaw !== "POIN") || !Number.isFinite(nilaiRaw) || nilaiRaw <= 0 || (modeRaw === "PERSEN" && nilaiRaw > 100)) {
        url.search = `?error=${encodeURIComponent("Soal nilai minus wajib punya mode & besaran potongan valid (persen maks 100)")}`;
        return NextResponse.redirect(url, { status: 303 });
      }
      penguranganMode = modeRaw;
      penguranganNilai = nilaiRaw;
    }
  } else if (jenis === "PILIHAN_GANDA_KOMPLEKS") {
    const opsiRaw = formData.getAll("opsi") as string[];
    const kunciMulti = formData.getAll("kunciJawabanMulti") as string[];
    if (opsiRaw.length < 2 || opsiRaw.some((o) => o.trim() === "") || kunciMulti.length < 2) {
      url.search = `?error=${encodeURIComponent("PG Kompleks wajib punya semua opsi terisi & minimal 2 kunci jawaban dicentang")}`;
      return NextResponse.redirect(url, { status: 303 });
    }
    opsi = JSON.stringify(opsiRaw);
    kunciJawaban = JSON.stringify(kunciMulti.map(Number).sort((a, b) => a - b));
  } else if (jenis === "JAWABAN_SINGKAT") {
    kunciJawaban = String(formData.get("kunciSingkat") ?? "");
  }

  await prisma.soal.create({
    data: {
      sekolahId: null,
      mapelId: null,
      mapelNama,
      rekomendasiKelas: rekomendasiKelas || null,
      dibuatOlehId: session.userId,
      jenis: jenis as "PILIHAN_GANDA" | "PILIHAN_GANDA_KOMPLEKS" | "PILIHAN_GANDA_MINUS" | "JAWABAN_SINGKAT" | "ESAI",
      pertanyaan,
      opsi,
      kunciJawaban,
      tingkatKesulitan,
      poinDefault: Number.isFinite(poinDefault) ? poinDefault : 10,
      penguranganMode,
      penguranganNilai,
      durasiDetik,
    },
  });

  url.search = "?soal_dibuat=1";
  return NextResponse.redirect(url, { status: 303 });
}
