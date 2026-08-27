import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const nama = String(formData.get("nama") ?? "").trim();
  const jenjang = String(formData.get("jenjang") ?? "").trim();
  // 1.21 — mapel (array-style mapelNama[]/mapelKkm[], dipasangkan by index) opsional dibuat
  // sekaligus dgn kurikulumnya — baris yg namanya kosong dilewati.
  const mapelNamaList = formData.getAll("mapelNama").map(String);
  const mapelKkmList = formData.getAll("mapelKkm").map(String);
  const mapelRows = mapelNamaList
    .map((nm, i) => ({ nama: nm.trim(), kkm: Number(mapelKkmList[i] ?? 70) || 70 }))
    .filter((m) => m.nama.length > 0);

  const url = req.nextUrl.clone();
  url.pathname = "/superadmin/kurikulum";

  if (!nama || !jenjang) {
    url.search = `?error=${encodeURIComponent("Nama & jenjang kurikulum wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.kurikulum.create({
    data: {
      nama,
      jenjang,
      dibuatOlehId: session.userId,
      ...(mapelRows.length > 0 ? { mapel: { create: mapelRows } } : {}),
    },
  });

  url.search = `?kurikulum_dibuat=${encodeURIComponent(nama)}`;
  return NextResponse.redirect(url, { status: 303 });
}
