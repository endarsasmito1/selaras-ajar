import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { tandaiPresensiGuruOtomatis } from "@/lib/data";
import { toDateOnlyUTC } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId"));
  const siswaIds = formData.getAll("siswaId") as string[];
  const tanggalStr = String(formData.get("tanggal") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = "/guru/absensi";

  // 1.23 — tanggal sekarang bisa dipilih (bukan selalu hari ini) — `max` di datepicker cuma
  // cegah di UI, validasi ulang di server supaya POST langsung ke API tak bisa isi absensi masa
  // depan. `toDateOnlyUTC` (bukan `new Date(x+"T00:00:00")`, diinterpretasi lokal & bisa geser
  // sehari di timezone non-UTC) supaya konsisten dgn cara tanggal absensi lain disimpan/dibaca.
  const todayStr = new Date().toISOString().slice(0, 10);
  const tanggalValid = /^\d{4}-\d{2}-\d{2}$/.test(tanggalStr) && tanggalStr <= todayStr;
  const tanggalFinalStr = tanggalValid ? tanggalStr : todayStr;
  const tanggal = toDateOnlyUTC(tanggalFinalStr);

  for (const siswaId of siswaIds) {
    const status = String(formData.get(`status_${siswaId}`) ?? "HADIR") as
      | "HADIR"
      | "SAKIT"
      | "IZIN"
      | "ALPA";
    const catatanRaw = String(formData.get(`catatan_${siswaId}`) ?? "").trim();
    const catatan = catatanRaw || null;

    await prisma.absensi.upsert({
      where: { siswaId_tanggal: { siswaId, tanggal } },
      update: { status, catatan },
      create: { siswaId, kelasId, tanggal, status, catatan },
    });
  }

  // AG-1: kehadiran mengajar guru (kalau ia wali kelas ini) tercatat otomatis dari aksi ini.
  // `tandaiPresensiGuruOtomatis` pakai getter LOCAL (getDay/getFullYear/dst) buat tentuin hari &
  // tanggalnya sendiri — sengaja dikasih Date lokal (bukan `tanggal` yg UTC-midnight di atas) biar
  // kontraknya sama persis kayak sebelum 1.23 (`hariIni` lokal), gak numpang norma UTC absensi.
  await tandaiPresensiGuruOtomatis(kelasId, new Date(tanggalFinalStr + "T00:00:00"), session.userId);

  url.search = `?kelas=${kelasId}&tab=isi&tanggal=${tanggalFinalStr}&absensi_disimpan=1`;
  return NextResponse.redirect(url, { status: 303 });
}
