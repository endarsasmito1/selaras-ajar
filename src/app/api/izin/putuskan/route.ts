import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toDateOnlyUTC, formatTanggal } from "@/lib/utils";
import { upsertNotifikasi, hapusNotifikasi } from "@/lib/notifikasi";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const pengajuanId = String(formData.get("pengajuanId"));
  const keputusan = String(formData.get("keputusan")); // "DISETUJUI" | "DITOLAK"

  const pengajuan = await prisma.pengajuanIzin.update({
    where: { id: pengajuanId },
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
}
