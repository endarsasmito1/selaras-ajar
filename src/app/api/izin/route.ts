import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { simpanFileUpload, ambilFileValid } from "@/lib/upload";
import { upsertNotifikasi } from "@/lib/notifikasi";
import { formatTanggal } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "ORANG_TUA") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const siswaId = String(formData.get("siswaId"));
  const tanggal = String(formData.get("tanggal"));
  const jenis = String(formData.get("jenis"));
  const keterangan = String(formData.get("keterangan"));

  // Pastikan siswa ini memang anak dari orang tua yang login
  const berhak = await prisma.waliSiswa.findFirst({ where: { siswaId, penggunaId: session.userId } });
  if (!berhak) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  // 1.21 — lampiran opsional (mis. foto surat dokter), disimpan lewat helper upload bersama.
  const lampiran = ambilFileValid(formData, "lampiran");
  const lampiranUrl = lampiran ? await simpanFileUpload(lampiran, "izin") : null;

  const izin = await prisma.pengajuanIzin.create({
    data: {
      siswaId,
      diajukanOlehId: session.userId,
      tanggal: new Date(tanggal),
      jenis: jenis as "SAKIT" | "IZIN",
      keterangan,
      lampiranUrl,
    },
    include: { siswa: { include: { kelas: true } } },
  });

  // NTF-G-08 (notifikasi-selaras-ajar.md) — beritahu wali kelas siswa ini, kalau kelasnya
  // sudah punya wali kelas ditunjuk (bisa null di data yang belum lengkap).
  if (izin.siswa.kelas.waliKelasId) {
    await upsertNotifikasi({
      penggunaId: izin.siswa.kelas.waliKelasId,
      tipe: "izin-baru",
      entitasKey: izin.id,
      judul: `Pengajuan izin baru dari ${izin.siswa.nama}`,
      deskripsi: `${jenis === "SAKIT" ? "Sakit" : "Izin"} · ${formatTanggal(izin.tanggal)}`,
      href: "/guru/izin",
      prioritas: "SEDANG",
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/ortu/izin";
  url.search = `?toast=${encodeURIComponent("Pengajuan izin terkirim.")}&tone=success`;
  return NextResponse.redirect(url, { status: 303 });
}
