import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kurikulumId = String(formData.get("kurikulumId") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";

  if (kurikulumId) {
    const kurikulum = await prisma.kurikulum.findUnique({ where: { id: kurikulumId } });
    if (!kurikulum) {
      url.search = `?error=${encodeURIComponent("Kurikulum tidak ditemukan")}`;
      return NextResponse.redirect(url, { status: 303 });
    }
  }

  await prisma.sekolah.update({
    where: { id: session.sekolahId },
    data: { kurikulumId: kurikulumId || null },
  });

  url.search = `?toast=${encodeURIComponent("Kurikulum sekolah diperbarui.")}&tone=success`;
  return NextResponse.redirect(url, { status: 303 });
}
