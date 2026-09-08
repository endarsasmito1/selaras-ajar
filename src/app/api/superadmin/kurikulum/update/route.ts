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
  const jenjang = String(formData.get("jenjang") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = `/superadmin/kurikulum/${kurikulumId}`;

  if (!nama || !jenjang) {
    url.search = `?error=${encodeURIComponent("Nama & jenjang kurikulum wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const existing = await prisma.kurikulum.findUnique({ where: { id: kurikulumId } });
  if (!existing) {
    url.pathname = "/superadmin/kurikulum";
    url.search = `?error=${encodeURIComponent("Kurikulum tidak ditemukan")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await prisma.kurikulum.update({ where: { id: existing.id }, data: { nama, jenjang } });

  const toastUrl = new URLSearchParams({ toast: "Kurikulum berhasil diperbarui.", tone: "success" });
  url.search = `?${toastUrl.toString()}`;
  return NextResponse.redirect(url, { status: 303 });
}
