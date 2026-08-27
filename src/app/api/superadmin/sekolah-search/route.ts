import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cariSekolah } from "@/lib/schools-api";

/** 1.12 — proxy pencarian nama sekolah (api.co.id) dipanggil dari form tambah sekolah superadmin. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const halaman = Math.max(1, Number(req.nextUrl.searchParams.get("halaman")) || 1);
  if (q.length < 3) return NextResponse.json({ hasil: [], paging: { page: 1, totalPage: 0, totalItem: 0 } });

  try {
    const { hasil, paging } = await cariSekolah(q, halaman);
    return NextResponse.json({ hasil, paging });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mencari sekolah" }, { status: 502 });
  }
}
