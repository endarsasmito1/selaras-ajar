import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kurikulumId = String(formData.get("kurikulumId") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const kkm = Number(formData.get("kkm") ?? 70);

  const url = req.nextUrl.clone();
  url.pathname = `/superadmin/kurikulum/${kurikulumId}`;

  if (!nama) {
    url.search = `?error=${encodeURIComponent("Nama mapel wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const kurikulum = await prisma.kurikulum.findUnique({ where: { id: kurikulumId } });
  if (!kurikulum) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.kurikulumMapel.create({ data: { kurikulumId, nama, kkm: Number.isFinite(kkm) ? kkm : 70 } });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
