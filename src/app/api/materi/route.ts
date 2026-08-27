import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { simpanFileUpload, ambilFileValid, UploadValidationError } from "@/lib/upload";
import { cariAtauBuatBab } from "@/lib/data";

const MIME_VIDEO = ["video/mp4", "video/webm", "video/ogg"];
const MAKS_VIDEO = 100 * 1024 * 1024;
const MIME_SILABUS = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAKS_SILABUS = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId"));
  const mapelId = String(formData.get("mapelId"));
  const judul = String(formData.get("judul"));
  const tipe = String(formData.get("tipe"));
  const babId = String(formData.get("babId") ?? "");
  const babBaru = String(formData.get("babBaru") ?? "").trim();
  const sumberVideo = String(formData.get("sumberVideo") ?? "tautan");

  const url = req.nextUrl.clone();
  url.pathname = "/guru/materi";
  url.search = `?kelas=${kelasId}`;

  try {
    const file = ambilFileValid(formData, "file");
    let isi = String(formData.get("isi") ?? "").trim();
    if (tipe === "dokumen" && file) {
      isi = await simpanFileUpload(file, "materi");
    } else if (tipe === "video" && sumberVideo === "file" && file) {
      isi = await simpanFileUpload(file, "materi", { allowedMime: MIME_VIDEO, maxSizeBytes: MAKS_VIDEO });
    }
    if (!judul || !isi) {
      url.search = `?kelas=${kelasId}&error=${encodeURIComponent("Judul & isi/berkas materi wajib diisi")}`;
      return NextResponse.redirect(url, { status: 303 });
    }

    // 1.23 — Bab: nama baru diketik guru menang atas pilihan dropdown (find-or-create by mapel+nama).
    let resolvedBabId: string | null = babId || null;
    if (babBaru) {
      const bab = await cariAtauBuatBab(session.sekolahId, mapelId, babBaru);
      resolvedBabId = bab.id;
    }

    // 1.23 — silabus mapel: opsional, satu berkas per mapel (bukan per-materi), timpa kalau sudah ada.
    const silabusFile = ambilFileValid(formData, "silabusFile");
    if (silabusFile) {
      const silabusUrl = await simpanFileUpload(silabusFile, "silabus", { allowedMime: MIME_SILABUS, maxSizeBytes: MAKS_SILABUS });
      await prisma.mataPelajaran.update({ where: { id: mapelId }, data: { silabusUrl } });
    }

    await prisma.materiBelajar.create({
      data: { kelasId, mapelId, penggunaId: session.userId, judul, tipe, isi, babId: resolvedBabId },
    });

    return NextResponse.redirect(url, { status: 303 });
  } catch (err) {
    const pesan = err instanceof UploadValidationError ? err.message : "Gagal mengunggah berkas";
    url.search = `?kelas=${kelasId}&error=${encodeURIComponent(pesan)}`;
    return NextResponse.redirect(url, { status: 303 });
  }
}
