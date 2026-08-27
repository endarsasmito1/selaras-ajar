import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBackupData } from "@/lib/data";

export async function GET() {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "BENDAHARA")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const data = await getBackupData(session.sekolahId);
  const json = JSON.stringify(data, null, 2);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=backup-selaras-ajar-${new Date().toISOString().slice(0, 10)}.json`,
    },
  });
}
