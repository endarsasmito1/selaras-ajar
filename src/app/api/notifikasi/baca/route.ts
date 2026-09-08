import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tandaiNotifikasiDibaca } from "@/lib/notifikasi";

/** Dipanggil via fetch() dari NotifBell (bukan form full-postback) supaya klik "tandai dibaca"
 * di dalam dropdown tak menutup panel & tak lompat scroll — beda dari pola form POST+redirect
 * di AccountMenu krn dropdown ini dipakai lebih sering & harus terasa ringan. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

  await tandaiNotifikasiDibaca(id, session.userId);
  return NextResponse.json({ ok: true });
}
