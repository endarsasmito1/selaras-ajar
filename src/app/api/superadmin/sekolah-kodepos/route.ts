import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ambilKodePos } from "@/lib/schools-api";

/** 1.12 — dipanggil sekali saat superadmin memilih satu kandidat sekolah dari dropdown pencarian. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const kecamatanCode = req.nextUrl.searchParams.get("kecamatanCode")?.trim() ?? "";
  if (!kecamatanCode) return NextResponse.json({ kodePos: null });

  const kodePos = await ambilKodePos(kecamatanCode);
  return NextResponse.json({ kodePos });
}
