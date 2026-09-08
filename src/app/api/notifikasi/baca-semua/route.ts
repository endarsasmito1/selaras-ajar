import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tandaiSemuaNotifikasiDibaca } from "@/lib/notifikasi";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });

  await tandaiSemuaNotifikasiDibaca(session.userId);
  return NextResponse.json({ ok: true });
}
