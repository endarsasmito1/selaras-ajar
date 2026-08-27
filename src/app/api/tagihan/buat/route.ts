import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "BENDAHARA" && session.peran !== "KEPALA_SEKOLAH")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const tipeId = String(formData.get("tipeId") ?? "");
  const nominal = Number(formData.get("nominal") ?? 0);
  const jatuhTempoRaw = String(formData.get("jatuhTempo") ?? "");
  const periode = String(formData.get("periode") ?? "").trim();
  // 1.21 — target sekarang 4 mode (bukan cuma SEMUA/1 kelas): Semua/Jenjang/Kelas/Murid,
  // 3 mode terakhir bisa multiselect (array dari <select multiple>).
  const targetMode = String(formData.get("targetMode") ?? "SEMUA");
  const jenjangTargets = formData.getAll("jenjangTargets").map(String).filter(Boolean);
  const kelasTargets = formData.getAll("kelasTargets").map(String).filter(Boolean);
  const muridTargets = formData.getAll("muridTargets").map(String).filter(Boolean);

  const url = req.nextUrl.clone();
  url.pathname = "/keuangan/tipe-tagihan";

  const targetKosong =
    (targetMode === "JENJANG" && jenjangTargets.length === 0) ||
    (targetMode === "KELAS" && kelasTargets.length === 0) ||
    (targetMode === "MURID" && muridTargets.length === 0);

  if (!tipeId || !nominal || nominal <= 0 || !jatuhTempoRaw || !periode || targetKosong) {
    url.search = `?error=${encodeURIComponent("Semua field wajib diisi, nominal harus lebih dari 0, dan target wajib dipilih minimal satu")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const tipe = await prisma.tagihanTipe.findFirst({ where: { id: tipeId, sekolahId: session.sekolahId } });
  if (!tipe) {
    return NextResponse.json({ error: "Jenis tagihan tidak ditemukan" }, { status: 404 });
  }

  const siswaTarget = await prisma.siswa.findMany({
    where: {
      sekolahId: session.sekolahId,
      aktif: true,
      ...(targetMode === "JENJANG" ? { kelas: { tingkat: { in: jenjangTargets.map(Number) } } } : {}),
      ...(targetMode === "KELAS" ? { kelasId: { in: kelasTargets } } : {}),
      ...(targetMode === "MURID" ? { id: { in: muridTargets } } : {}),
    },
    select: { id: true, kelas: { select: { tahunAjaranId: true } } },
  });

  if (siswaTarget.length === 0) {
    url.search = `?error=${encodeURIComponent("Tidak ada siswa aktif pada target yang dipilih")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.tagihan.createMany({
    data: siswaTarget.map((s) => ({
      siswaId: s.id,
      tipeId,
      periode,
      nominal,
      jatuhTempo: new Date(jatuhTempoRaw),
      // 1.21 — dicatat otomatis dari kelas siswa saat ini, dipakai histori tahun ajaran (K-8).
      tahunAjaranId: s.kelas.tahunAjaranId,
    })),
  });

  url.search = `?tagihan_dibuat=${siswaTarget.length}`;
  return NextResponse.redirect(url, { status: 303 });
}
