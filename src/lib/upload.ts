import { writeFile, mkdir } from "fs/promises";
import path from "path";

/** 1.23 — dilempar saat file gagal validasi MIME/ukuran, ditangkap call site jadi pesan error. */
export class UploadValidationError extends Error {}

export type UploadValidationOpts = { allowedMime?: string[]; maxSizeBytes?: number };

/**
 * Simpan file upload ke disk lokal (public/uploads/<subfolder>/), dikembalikan sebagai
 * URL publik siap dipakai (`/uploads/...`). Cukup untuk prototype single-server — produksi
 * nyata sebaiknya pakai object storage (S3-compatible) supaya file tak hilang saat redeploy.
 *
 * `opts` opsional (1.23) — sebelumnya SAMA SEKALI tak ada validasi MIME/ukuran di sini, tiap
 * call site jaga sendiri-sendiri (kalau jaga sama sekali). Dipakai wajib utk upload gambar/video
 * soal & materi (file besar/sembarang tipe bisa cepat penuhin storage lokal).
 */
export async function simpanFileUpload(file: File, subfolder: string, opts?: UploadValidationOpts): Promise<string> {
  if (opts?.allowedMime && !opts.allowedMime.includes(file.type)) {
    throw new UploadValidationError(`Format berkas tidak didukung (${file.type || "tidak diketahui"})`);
  }
  if (opts?.maxSizeBytes && file.size > opts.maxSizeBytes) {
    const maxMb = (opts.maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new UploadValidationError(`Ukuran berkas maksimal ${maxMb}MB`);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(dir, { recursive: true });
  const namaAman = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const namaFile = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${namaAman}`;
  await writeFile(path.join(dir, namaFile), bytes);
  return `/uploads/${subfolder}/${namaFile}`;
}

/** Ambil File dari FormData kalau ada isinya (skip kalau field kosong/tak dikirim). */
export function ambilFileValid(formData: FormData, field: string): File | null {
  const val = formData.get(field);
  if (val instanceof File && val.size > 0) return val;
  return null;
}
