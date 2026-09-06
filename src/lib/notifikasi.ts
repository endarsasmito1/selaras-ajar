import { prisma } from "@/lib/prisma";
import type { PrioritasNotif } from "@/generated/prisma/client";

/**
 * Notifikasi bell topbar — porting server-side dari evaluator client-side prototipe
 * (`assets/notif.js`, lihat notifikasi-selaras-ajar.md) ke pola "domain event → tulis/hapus baris
 * langsung", bukan query live tiap render (lihat rencana-api-database-selaras-ajar.md §3).
 *
 * Dipanggil dari service/route yang menangani aksi terkait, DALAM transaksi yang sama dgn aksi
 * utamanya kalau memungkinkan (mis. `prisma.$transaction([...])`) — supaya notifikasi selalu
 * konsisten dgn state sebenarnya, tak pernah "nyangkut" gara-gara aksi utama gagal tapi
 * notifikasinya kepalang tertulis (atau sebaliknya).
 */

type BuatNotifikasiInput = {
  penggunaId: string;
  /** Kode kategori tetap, mis. "esai-pending" — sama kode dgn notifikasi-selaras-ajar.md. */
  tipe: string;
  /** Identitas instance sungguhan (id ujian/tugas/izin/dst) — lihat catatan skema di schema.prisma. */
  entitasKey: string;
  judul: string;
  deskripsi?: string;
  href?: string;
  prioritas?: PrioritasNotif;
};

/**
 * Buat notifikasi baru, ATAU perbarui judul/deskripsi/href/prioritas kalau kejadian yang sama
 * (penggunaId+tipe+entitasKey) sudah pernah tercatat — TANPA menyentuh `createdAt` (waktu pertama
 * terdeteksi tetap dipertahankan, padanan `sa-notif-log-<ROLE>` di prototipe) atau `dibacaPada`
 * (status baca yang sudah ada tetap dihormati, tak di-reset jadi belum-dibaca lagi cuma krn
 * angkanya berubah — beda dari skema lama `index+judul` yang rapuh thd perubahan teks).
 */
export async function upsertNotifikasi(input: BuatNotifikasiInput) {
  const { penggunaId, tipe, entitasKey, judul, deskripsi, href, prioritas } = input;
  return prisma.notifikasi.upsert({
    where: { penggunaId_tipe_entitasKey: { penggunaId, tipe, entitasKey } },
    create: { penggunaId, tipe, entitasKey, judul, deskripsi, href, prioritas: prioritas ?? "SEDANG" },
    update: { judul, deskripsi, href, ...(prioritas ? { prioritas } : {}) },
  });
}

/**
 * Hapus SATU notifikasi spesifik — dipakai saat kondisi state-based sudah resolve (mis. esai
 * sudah dinilai semua, guru gak lagi diabaikan sbg "esai-pending"). Padanan auto-resolve di
 * prototipe (item hilang sendiri dari evaluator begitu kondisinya gak lagi live).
 */
export async function hapusNotifikasi(penggunaId: string, tipe: string, entitasKey: string) {
  await prisma.notifikasi.deleteMany({ where: { penggunaId, tipe, entitasKey } });
}

/** Hapus SEMUA notifikasi bertipe tertentu milik satu pengguna (mis. semua "tugas-belum-dinilai"
 * dari satu tugas, tanpa peduli entitasKey persis apa) — dipakai kalau satu event menyelesaikan
 * banyak notifikasi state sekaligus. */
export async function hapusNotifikasiByTipe(penggunaId: string, tipe: string) {
  await prisma.notifikasi.deleteMany({ where: { penggunaId, tipe } });
}

/** Daftar lengkap notifikasi 1 pengguna, terbaru dulu — dipakai baik oleh bell panel (potong
 * beberapa teratas di layer UI) maupun halaman "Semua Notifikasi" (tampilkan semua + paginasi). */
export async function getNotifikasi(penggunaId: string) {
  return prisma.notifikasi.findMany({
    where: { penggunaId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNotifikasiUnreadCount(penggunaId: string) {
  return prisma.notifikasi.count({ where: { penggunaId, dibacaPada: null } });
}

/** Tandai satu notifikasi dibaca — `penggunaId` dicek sekalian di WHERE (bukan cuma `id`) supaya
 * satu pengguna tak bisa menandai-dibaca notifikasi milik pengguna lain lewat id yang ditebak. */
export async function tandaiNotifikasiDibaca(id: string, penggunaId: string) {
  await prisma.notifikasi.updateMany({
    where: { id, penggunaId, dibacaPada: null },
    data: { dibacaPada: new Date() },
  });
}

export async function tandaiSemuaNotifikasiDibaca(penggunaId: string) {
  await prisma.notifikasi.updateMany({
    where: { penggunaId, dibacaPada: null },
    data: { dibacaPada: new Date() },
  });
}
