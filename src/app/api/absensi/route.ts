import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { tandaiPresensiGuruOtomatis } from "@/lib/data";
import { toDateOnlyUTC, formatTanggal } from "@/lib/utils";
import { upsertNotifikasi, hapusNotifikasi } from "@/lib/notifikasi";
import { logger, errorContext } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId"));
  const siswaIds = formData.getAll("siswaId") as string[];
  const tanggalStr = String(formData.get("tanggal") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = "/guru/absensi";

  // 1.23 — tanggal sekarang bisa dipilih (bukan selalu hari ini) — `max` di datepicker cuma
  // cegah di UI, validasi ulang di server supaya POST langsung ke API tak bisa isi absensi masa
  // depan. `toDateOnlyUTC` (bukan `new Date(x+"T00:00:00")`, diinterpretasi lokal & bisa geser
  // sehari di timezone non-UTC) supaya konsisten dgn cara tanggal absensi lain disimpan/dibaca.
  const todayStr = new Date().toISOString().slice(0, 10);
  const tanggalValid = /^\d{4}-\d{2}-\d{2}$/.test(tanggalStr) && tanggalStr <= todayStr;
  const tanggalFinalStr = tanggalValid ? tanggalStr : todayStr;
  const tanggal = toDateOnlyUTC(tanggalFinalStr);

  try {
    for (const siswaId of siswaIds) {
      const status = String(formData.get(`status_${siswaId}`) ?? "HADIR") as
        | "HADIR"
        | "SAKIT"
        | "IZIN"
        | "ALPA";
      const catatanRaw = String(formData.get(`catatan_${siswaId}`) ?? "").trim();
      const catatan = catatanRaw || null;

      await prisma.absensi.upsert({
        where: { siswaId_tanggal: { siswaId, tanggal } },
        update: { status, catatan },
        create: { siswaId, kelasId, tanggal, status, catatan },
      });

      // NTF-M-10/O-06 — kehadiran bukan Hadir, beritahu murid ybs & orang tuanya. entitasKey dipatok
      // ke siswa+tanggal (bukan id baris Absensi) supaya idempotent thd guru edit ulang tanggal yg
      // sama berkali-kali (upsert nulis ulang, bukan numpuk baris baru per edit).
      const entitasKey = `${siswaId}:${tanggalFinalStr}`;
      if (status !== "HADIR") {
        const siswa = await prisma.siswa.findUnique({
          where: { id: siswaId },
          include: { akun: true, kelas: true, wali: { include: { pengguna: true } } },
        });
        if (siswa) {
          const label = status === "SAKIT" ? "Sakit" : status === "IZIN" ? "Izin" : "Alpa";
          if (siswa.akunId) {
            await upsertNotifikasi({
              penggunaId: siswa.akunId,
              tipe: "absensi-tidak-hadir",
              entitasKey,
              judul: `Kamu tercatat ${label} pada ${formatTanggal(tanggal)}`,
              href: `/murid/kehadiran`,
              prioritas: status === "ALPA" ? "TINGGI" : "SEDANG",
            });
          }
          await Promise.all(
            siswa.wali.map((w) =>
              upsertNotifikasi({
                penggunaId: w.penggunaId,
                tipe: "anak-tidak-hadir",
                entitasKey,
                judul: `${siswa.nama} tercatat ${label} pada ${formatTanggal(tanggal)}`,
                href: `/ortu/performa/${siswaId}/kehadiran`,
                prioritas: status === "ALPA" ? "TINGGI" : "SEDANG",
              })
            )
          );
        }
      } else {
        // Guru koreksi balik jadi Hadir — resolve notif yg mungkin sempat tertulis sebelumnya.
        const siswaAkun = await prisma.siswa.findUnique({ where: { id: siswaId }, select: { akunId: true, wali: { select: { penggunaId: true } } } });
        if (siswaAkun?.akunId) await hapusNotifikasi(siswaAkun.akunId, "absensi-tidak-hadir", entitasKey);
        if (siswaAkun) await Promise.all(siswaAkun.wali.map((w) => hapusNotifikasi(w.penggunaId, "anak-tidak-hadir", entitasKey)));
      }
    }

    // AG-1: kehadiran mengajar guru (kalau ia wali kelas ini) tercatat otomatis dari aksi ini.
    // `tandaiPresensiGuruOtomatis` pakai getter LOCAL (getDay/getFullYear/dst) buat tentuin hari &
    // tanggalnya sendiri — sengaja dikasih Date lokal (bukan `tanggal` yg UTC-midnight di atas) biar
    // kontraknya sama persis kayak sebelum 1.23 (`hariIni` lokal), gak numpang norma UTC absensi.
    await tandaiPresensiGuruOtomatis(kelasId, new Date(tanggalFinalStr + "T00:00:00"), session.userId);

    url.search = `?kelas=${kelasId}&tab=isi&tanggal=${tanggalFinalStr}&toast=${encodeURIComponent("Absensi tersimpan.")}&tone=success`;
    return NextResponse.redirect(url, { status: 303 });
  } catch (err) {
    // Feedback teknis (Sep 2026) — absensi harian, wajib ada jejak kalau gagal diam-diam
    // (sebelumnya nol logging di seluruh API, termasuk di jalur ini).
    logger.error("Gagal menyimpan absensi", { route: "absensi", kelasId, tanggal: tanggalFinalStr, guruId: session.userId, ...errorContext(err) });
    url.search = `?kelas=${kelasId}&tab=isi&tanggal=${tanggalFinalStr}&toast=${encodeURIComponent("Gagal menyimpan absensi, coba lagi")}&tone=warn`;
    return NextResponse.redirect(url, { status: 303 });
  }
}
