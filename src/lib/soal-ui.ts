/** Dipakai di kartu soal (superadmin bank soal terpusat) — tiap kategori badge dikasih warna
 * beda biar gampang dipindai sekilas: jenis (biru), kesulitan (hijau/kuning/merah sesuai level),
 * jenjang (emas/accent), poin (netral). */
export const JENIS_SOAL_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  PILIHAN_GANDA_KOMPLEKS: "PG Kompleks",
  PILIHAN_GANDA_MINUS: "PG Nilai Minus",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export const TINGKAT_KESULITAN_TONE: Record<string, "ok" | "warn" | "danger"> = {
  mudah: "ok",
  sedang: "warn",
  sulit: "danger",
};

export const JENJANG_PILL_CLASS = "bg-accent-tint text-accent-deep";
