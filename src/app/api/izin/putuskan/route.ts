import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toDateOnlyUTC, formatTanggal } from "@/lib/utils";
import { upsertNotifikasi, hapusNotifikasi } from "@/lib/notifikasi";
import { assertOwned, NotFoundError } from "@/lib/guard";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const pengajuanId = String(formData.get("pengajuanId"));
  const keputusan = String(formData.get("keputusan")); // "DISETUJUI" | "DITOLAK"

  try {
    // Dicek dulu sebelum update — sebelumnya langsung `.update()` tanpa cek, jadi 500 (unhandled
    // PrismaClientKnownRequestError P2025) kalau id gak ada/sudah dihapus, ATAU race condition
    // 2 guru/2 klik ganda mutusin pengajuan yang sama nyaris bersamaan (baris kedua nemu status
    // udah bukan MENUNGGU lagi begitu sampai sini, bukan lagi asumsi masih ada). `assertOwned`
    // (lib/guard.ts) — objek hasil validasi ini yang dipakai di `.update()` di bawah, bukan
    // `pengajuanId` mentah lagi, konsisten dgn pola yg wajib dipakai di semua rute serupa.
    const existing = await assertOwned(
      prisma.pengajuanIzin.findFirst({ where: { id: pengajuanId, status: "MENUNGGU" } }),
      "Pengajuan tidak ditemukan atau sudah diputuskan"
    );

    const pengajuan = await prisma.pengajuanIzin.update({
      where: { id: existing.id },
      data: { status: keputusan as "DISETUJUI" | "DITOLAK", disetujuiOlehId: session.userId },
      include: { siswa: { include: { kelas: true } } },
    });

    if (keputusan === "DISETUJUI") {
      const tanggal = toDateOnlyUTC(pengajuan.tanggal);
      await prisma.absensi.upsert({
        where: { siswaId_tanggal: { siswaId: pengajuan.siswaId, tanggal } },
        update: { status: pengajuan.jenis, catatan: pengajuan.keterangan },
        create: { siswaId: pengajuan.siswaId, kelasId: pengajuan.siswa.kelasId, tanggal, status: pengajuan.jenis, catatan: pengajuan.keterangan },
      });
    }

    // NTF-G-08 resolve — item "izin-baru" di sisi wali kelas sudah gak relevan lagi begitu
    // diputuskan (siapa pun guru yang memutuskan, bukan mesti wali kelas itu sendiri, mis. lewat
    // /guru/absensi inline — makanya cari penerima asli dari waliKelasId, bukan session.userId).
    if (pengajuan.siswa.kelas.waliKelasId) {
      await hapusNotifikasi(pengajuan.siswa.kelas.waliKelasId, "izin-baru", pengajuan.id);
    }
    // NTF-O-04/O-05 — beritahu orang tua yang mengajukan.
    await upsertNotifikasi({
      penggunaId: pengajuan.diajukanOlehId,
      tipe: keputusan === "DISETUJUI" ? "izin-disetujui" : "izin-ditolak",
      entitasKey: pengajuan.id,
      judul: keputusan === "DISETUJUI"
        ? `Izin ${pengajuan.siswa.nama} disetujui`
        : `Izin ${pengajuan.siswa.nama} ditolak`,
      deskripsi: formatTanggal(pengajuan.tanggal),
      href: "/ortu/izin",
      prioritas: keputusan === "DISETUJUI" ? "RENDAH" : "SEDANG",
    });

    // 1.23 — bisa dipanggil dari /guru/izin ATAU inline dari /guru/absensi (Isi Absensi), jadi balik
    // ke halaman asalnya (lewat referer) bukan hardcode /guru/izin, biar guru gak kepental halaman.
    const referer = req.headers.get("referer");
    const url = referer ? new URL(referer) : req.nextUrl.clone();
    if (!referer) url.pathname = "/guru/izin";
    return NextResponse.redirect(url, { status: 303 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
