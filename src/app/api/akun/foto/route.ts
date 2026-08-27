import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const EKSTENSI_DIIZINKAN: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** §5.5 (1.8, diminta eksplisit) — foto profil di menu akun, bisa diubah dari galeri/berkas sendiri. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const url = req.nextUrl.clone();
  url.pathname = req.headers.get("referer") ? new URL(req.headers.get("referer")!).pathname : "/";
  url.search = "";

  const formData = await req.formData();
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) {
    url.search = `?error=${encodeURIComponent("Pilih berkas foto dulu")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const ext = EKSTENSI_DIIZINKAN[file.type];
  if (!ext) {
    url.search = `?error=${encodeURIComponent("Format berkas tidak didukung — pakai JPG/PNG/WEBP/GIF")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const namaFile = `${session.userId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, namaFile), buffer);

  await prisma.pengguna.update({
    where: { id: session.userId },
    data: { fotoUrl: `/uploads/avatars/${namaFile}` },
  });

  return NextResponse.redirect(url, { status: 303 });
}
