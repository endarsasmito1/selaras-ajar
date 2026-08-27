import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId"));
  const mapelId = String(formData.get("mapelId"));
  const sumberTipe = String(formData.get("sumberTipe")); // "tugas" | "ujian"
  const sumberId = String(formData.get("sumberId"));
  const siswaIds = formData.getAll("siswaId") as string[];

  const url = req.nextUrl.clone();
  url.pathname = "/guru/nilai";
  url.search = `?kelas=${kelasId}&mapel=${mapelId}`;

  if (sumberTipe !== "tugas" && sumberTipe !== "ujian") {
    url.search += "&error=" + encodeURIComponent("Pilih tugas atau ujian sumber penilaian dulu");
    return NextResponse.redirect(url, { status: 303 });
  }

  // 1.10, diminta eksplisit (G-2): "komponen" sekarang diambil dari Tugas/Ujian yang benar-benar
  // ada di kelas/mapel ini (bukan kategori bebas lagi), judul mengikuti judul tugas/ujian tsb.
  const judul =
    sumberTipe === "tugas"
      ? (await prisma.tugas.findUnique({ where: { id: sumberId } }))?.judul
      : (await prisma.ujian.findUnique({ where: { id: sumberId } }))?.judul;
  if (!judul) {
    url.search += "&error=" + encodeURIComponent("Sumber penilaian tidak ditemukan");
    return NextResponse.redirect(url, { status: 303 });
  }
  const komponen = sumberTipe === "tugas" ? "Tugas" : "Ujian";

  for (const siswaId of siswaIds) {
    const skorRaw = formData.get(`skor_${siswaId}`);
    if (!skorRaw || skorRaw === "") continue;
    const skor = Number(skorRaw);
    if (Number.isNaN(skor)) continue;

    // 1.8, diminta eksplisit (G-2): nilai yang sudah diinput harus tetap bisa diedit —
    // submit ulang kombinasi siswa+kelas+mapel+komponen+judul yang sama meng-update, bukan
    // menambah baris baru yang menduplikat riwayat.
    await prisma.nilai.upsert({
      where: { siswaId_kelasId_mapelId_komponen_judul: { siswaId, kelasId, mapelId, komponen, judul } },
      update: { skor },
      create: { siswaId, kelasId, mapelId, komponen, judul, skor },
    });

    // 1.10, diminta eksplisit — edit nilai di sini juga mengubah nilai tugas/ujian aslinya, TAPI
    // cuma kalau pengumpulan/pengerjaannya sudah ada (tak memalsukan submission yang tak pernah
    // terjadi). Kalau murid belum pernah kumpul/kerjakan, skor cuma tersimpan di Nilai saja.
    if (sumberTipe === "tugas") {
      await prisma.pengumpulanTugas.updateMany({ where: { tugasId: sumberId, siswaId }, data: { nilai: skor } });
    } else {
      await prisma.ujianPengerjaan.updateMany({ where: { ujianId: sumberId, siswaId }, data: { nilaiTotal: skor } });
    }
  }

  url.search += `&nilai_disimpan=${encodeURIComponent(judul)}`;
  return NextResponse.redirect(url, { status: 303 });
}
