/**
 * Feedback teknis (Sep 2026) — audit keamanan sepanjang sesi ini nemu 11 rute API dengan pola
 * bug yang PERSIS SAMA: `.update()`/`.create()` dipanggil pakai id mentah dari request TANPA
 * validasi existence+tenant/ownership dulu, atau (kasus lebih serius) validasi ADA tapi
 * hasilnya cuma dipakai buat pesan error — bukan buat gate mutasi aslinya (`guru/wali-kelas`).
 * Bug yang sama keulang 11x walau ketauan & diperbaiki di instance pertama nunjukkin gak ada
 * guardrail STRUKTURAL — cuma ngandelin programmer inget nulis pola ini manual tiap kali.
 *
 * `assertOwned()` bikin pola yang benar jadi SATU baris wajib dipanggil, dan — krn TypeScript
 * menyempitkan tipe return-nya jadi non-null — kode setelahnya lebih natural pakai OBJEK hasil
 * validasi (bukan balik ke variabel id mentah), persis kesalahan yang bikin bug `guru/wali-kelas`
 * dulu kejadian. Ini gak bisa 100% MEMAKSA pemanggil pakai objeknya (JS/TS gak punya cara linter
 * bawaan buat itu tanpa custom ESLint rule terpisah) — tapi bikin jalan yang benar jadi jalan
 * yang paling gampang ditulis, drpd nulis ulang `if (!x) return ...` tiap file.
 *
 * Pola pakai:
 *   const kelas = await assertOwned(
 *     prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } }),
 *     "Kelas tidak ditemukan",
 *   );
 *   // kelas dijamin non-null di sini — pakai `kelas.id`, BUKAN `kelasId` mentah, utk mutasi.
 *   await prisma.kelas.update({ where: { id: kelas.id }, data: { ... } });
 *
 * Lempar `NotFoundError` kalau record-nya null — route handler yang manggil WAJIB nangkep ini
 * (try/catch) dan translasikan ke response yang sesuai (404 JSON, atau redirect+`?error=`),
 * karena bentuk response tiap rute beda (JSON vs redirect) jadi gak bisa digeneralisasi di sini.
 */
export class NotFoundError extends Error {}

export async function assertOwned<T>(query: Promise<T | null>, message = "Data tidak ditemukan"): Promise<T> {
  const record = await query;
  if (!record) throw new NotFoundError(message);
  return record;
}
