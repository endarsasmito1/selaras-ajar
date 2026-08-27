import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { simpanFileUpload, UploadValidationError } from "@/lib/upload";

const MIME_GAMBAR = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MIME_VIDEO = ["video/mp4", "video/webm", "video/ogg"];
const MAKS_GAMBAR = 5 * 1024 * 1024;
const MAKS_VIDEO = 100 * 1024 * 1024;

/**
 * 1.23 — dipanggil client-side dari `onImageUploadBefore`/`onVideoUploadBefore` di `SoalEditor`
 * (bukan lewat mekanisme XHR bawaan SunEditor, supaya bentuk request/response kita kontrol
 * sendiri). Dipakai lintas guru & superadmin (keduanya bikin soal lewat editor yang sama).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["GURU", "KEPALA_SEKOLAH", "SUPERADMIN"].includes(session.peran)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const tipe = formData.get("tipe");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Berkas kosong" }, { status: 400 });
  }

  const isVideo = tipe === "video";
  try {
    const url = await simpanFileUpload(file, "soal", {
      allowedMime: isVideo ? MIME_VIDEO : MIME_GAMBAR,
      maxSizeBytes: isVideo ? MAKS_VIDEO : MAKS_GAMBAR,
    });
    return NextResponse.json({ url, name: file.name, size: file.size });
  } catch (err) {
    const pesan = err instanceof UploadValidationError ? err.message : "Gagal mengunggah berkas";
    return NextResponse.json({ error: pesan }, { status: 400 });
  }
}
