import { prisma } from "@/lib/prisma";
import type { PrioritasNotif } from "@/generated/prisma/client";
import { getRemindersGuru } from "@/lib/data";
import { formatRupiah } from "@/lib/utils";

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

// ================= SYNC STATE-BASED (dipanggil dari AppShell tiap render, bukan trigger 1 aksi) =================
//
// Padanan evaluator live client-side di prototipe (assets/notif.js) — di sana dihitung ulang tiap
// panel bell dibuka; di sini dihitung ulang tiap request halaman (AppShell) krn gak ada infra
// cron/background-job. Cukup murah krn query di-scope per akun (bukan global), bukan tabel penuh.

/** Hapus notif tipe tsb yang entitasKey-nya SUDAH GAK aktif lagi (auto-resolve) — dipanggil di
 * akhir tiap fungsi sync setelah upsert semua yang masih aktif. */
async function resolveStaleByTipe(penggunaId: string, tipe: string, entitasKeyAktif: Set<string>) {
  const existing = await prisma.notifikasi.findMany({ where: { penggunaId, tipe }, select: { id: true, entitasKey: true } });
  const staleIds = existing.filter((e) => !entitasKeyAktif.has(e.entitasKey)).map((e) => e.id);
  if (staleIds.length > 0) await prisma.notifikasi.deleteMany({ where: { id: { in: staleIds } } });
}

/** NTF-G-01 — kelas yang jadwalnya hari ini & absensinya belum diisi sama sekali. */
export async function syncNotifikasiAbsensiBelum(penggunaId: string) {
  const guruProfil = await prisma.guruProfil.findUnique({ where: { penggunaId } });
  if (!guruProfil) return;

  const now = new Date();
  const hariIni = now.getDay() === 0 ? 7 : now.getDay(); // 1=Senin..6=Sabtu (7=Minggu, gak akan pernah cocok — sekolah libur)
  const tanggalHariIni = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const entries = await prisma.jadwalEntry.findMany({
    where: { guruId: guruProfil.id, hari: hariIni },
    include: { kelas: true },
  });
  const kelasUnik = Array.from(new Map(entries.map((e) => [e.kelasId, e.kelas])).values());

  // Perf — sebelumnya 1 query `count()` TERPISAH per kelas di dalam loop (guru yg ngajar lintas
  // puluhan kelas = puluhan round-trip better-sqlite3 SINKRON tambahan di SETIAP render halaman,
  // krn fungsi ini dipanggil dari AppShell tiap request). Ketauan lewat load-test (dashboard guru
  // jadi >4 detik pas dites beban). Dibatch jadi 1 query select kelasId doang, dihitung di JS.
  const absensiHariIni = kelasUnik.length
    ? await prisma.absensi.findMany({
        where: { kelasId: { in: kelasUnik.map((k) => k.id) }, tanggal: tanggalHariIni },
        select: { kelasId: true },
      })
    : [];
  const kelasSudahDiisi = new Set(absensiHariIni.map((a) => a.kelasId));

  const aktif = new Set<string>();
  for (const kelas of kelasUnik) {
    const sudahDiisi = kelasSudahDiisi.has(kelas.id);
    if (!sudahDiisi) {
      aktif.add(kelas.id);
      await upsertNotifikasi({
        penggunaId,
        tipe: "absensi-belum",
        entitasKey: kelas.id,
        judul: `Absensi kelas ${kelas.nama} belum diisi hari ini`,
        href: `/guru/absensi?kelas=${kelas.id}`,
        prioritas: "TINGGI",
      });
    }
  }
  await resolveStaleByTipe(penggunaId, "absensi-belum", aktif);
}

/** NTF-G-02/G-05 (+ bonus "RPP belum lengkap", tambahan app sungguhan di luar daftar prototipe) —
 * reuse persis logic `getRemindersGuru` yang sudah dipakai widget "Perlu ditindaklanjuti" di
 * dashboard, supaya gak ada 2 sumber kebenaran beda utk hal yang sama (satu di widget, satu di
 * bell) — cuma disalin jadi baris Notifikasi permanen di sini. */
export async function syncNotifikasiReminderGuru(penggunaId: string) {
  const reminders = await getRemindersGuru(penggunaId);
  const aktifByTipe = new Map<string, Set<string>>();

  for (const r of reminders) {
    const pemisah = r.id.indexOf(":");
    const tipe = pemisah === -1 ? r.id : r.id.slice(0, pemisah);
    const entitasKey = pemisah === -1 ? r.id : r.id.slice(pemisah + 1);
    if (!aktifByTipe.has(tipe)) aktifByTipe.set(tipe, new Set());
    aktifByTipe.get(tipe)!.add(entitasKey);
    await upsertNotifikasi({
      penggunaId,
      tipe,
      entitasKey,
      judul: r.pesan,
      href: r.href,
      prioritas: "SEDANG",
    });
  }
  for (const tipe of ["tugas-belum-nilai", "esai-pending", "rpp-belum"]) {
    await resolveStaleByTipe(penggunaId, tipe, aktifByTipe.get(tipe) ?? new Set());
  }
}

/** NTF-M-01 — tugas jatuh tempo BESOK (H-1) yang belum dikumpulkan murid ybs. */
export async function syncNotifikasiTugasJatuhTempo(penggunaId: string) {
  const siswa = await prisma.siswa.findUnique({ where: { akunId: penggunaId } });
  if (!siswa) return;

  const besok = new Date();
  besok.setDate(besok.getDate() + 1);
  const besokMulai = new Date(Date.UTC(besok.getFullYear(), besok.getMonth(), besok.getDate()));
  const besokAkhir = new Date(besokMulai);
  besokAkhir.setUTCDate(besokAkhir.getUTCDate() + 1);

  const tugasList = await prisma.tugas.findMany({
    where: {
      kelasId: siswa.kelasId,
      tenggat: { gte: besokMulai, lt: besokAkhir },
      pengumpulan: { none: { siswaId: siswa.id } },
    },
  });

  const aktif = new Set(tugasList.map((t) => t.id));
  for (const t of tugasList) {
    await upsertNotifikasi({
      penggunaId,
      tipe: "tugas-jatuh-tempo",
      entitasKey: t.id,
      judul: `Tugas "${t.judul}" jatuh tempo besok`,
      href: `/murid/tugas/${t.id}`,
      prioritas: "TINGGI",
    });
  }
  await resolveStaleByTipe(penggunaId, "tugas-jatuh-tempo", aktif);
}

/** NTF-O-01 — tagihan SPP anak yang belum dibayar, per anak (satu baris per tagihan, bukan
 * agregat — beda dari sisi Bendahara yang scale-nya jauh lebih besar, lihat sync di bawah). */
export async function syncNotifikasiTagihanOrtu(penggunaId: string) {
  const waliList = await prisma.waliSiswa.findMany({ where: { penggunaId }, include: { siswa: true } });
  const aktif = new Set<string>();

  for (const w of waliList) {
    const tagihanBelumBayar = await prisma.tagihan.findMany({
      where: { siswaId: w.siswaId, status: "BELUM_BAYAR" },
      include: { tipe: true },
    });
    for (const t of tagihanBelumBayar) {
      aktif.add(t.id);
      await upsertNotifikasi({
        penggunaId,
        tipe: "tagihan-belum-bayar",
        entitasKey: t.id,
        judul: `Tagihan ${t.tipe.nama} ${w.siswa.nama} belum dibayar`,
        deskripsi: formatRupiah(t.nominal),
        href: `/ortu`,
        prioritas: "SEDANG",
      });
    }
  }
  await resolveStaleByTipe(penggunaId, "tagihan-belum-bayar", aktif);
}

/**
 * Gerbang "boleh lihat hasil" — SENGAJA disalin persis dari logic `murid/ujian/[id]/page.tsx`
 * (bukan cuma "sudah dinilai") — ujian mode JADWAL_MANUAL/SETELAH_JADWAL_BERAKHIR bisa "siap
 * dinilai" jauh sebelum waktunya boleh DILIHAT murid (guru sengaja gembok biar gak bocor ke kelas
 * lain yg belum ujian) — kalau notif ditulis pas nilai keluar tanpa cek gerbang ini, notifnya
 * jadi bocoran duluan sebelum halamannya sendiri ngizinin dibuka. Diekstrak jadi 1 fungsi dipakai
 * bareng murid & ortu, biar 2 gerbang itu gak bisa diam-diam kegeser beda seiring waktu.
 * `jamSelesai` per KELAS (bukan per ujian) — join lewat tabel UjianKelas, padanan cara
 * `getUjianUntukSiswa` di lib/data.ts meratakannya.
 */
function bolehLihatHasilUjian(
  ujian: {
    jenis: string;
    modeHasil: string;
    jadwalHasilManual: Date | null;
    soal: { soal: { jenis: string } }[];
    kelas: { kelasId: string; jamSelesai: Date | null }[];
  },
  pengerjaan: { koreksiDikonfirmasi: boolean },
  kelasId: string
) {
  const now = new Date();
  const ukKelasIni = ujian.kelas.find((k) => k.kelasId === kelasId);
  const adaEsai = ujian.soal.some((us) => us.soal.jenis === "ESAI");
  const nilaiSiapTampil = !adaEsai || pengerjaan.koreksiDikonfirmasi;
  const jadwalBerakhir = !ukKelasIni?.jamSelesai || now > new Date(ukKelasIni.jamSelesai);
  const modeHasilTerpenuhi =
    ujian.modeHasil === "OTOMATIS_SUBMIT"
      ? nilaiSiapTampil
      : ujian.modeHasil === "JADWAL_MANUAL"
        ? !!ujian.jadwalHasilManual && now >= new Date(ujian.jadwalHasilManual) && nilaiSiapTampil
        : jadwalBerakhir && nilaiSiapTampil; // SETELAH_JADWAL_BERAKHIR (default)
  return ujian.jenis === "LATIHAN" || modeHasilTerpenuhi;
}

/** NTF-M-06/M-07 — nilai ujian (termasuk esai yang sudah dikoreksi) sudah boleh dilihat murid.
 * State-based (bukan trigger 1 aksi) krn kelulusan gerbangnya bisa berubah semata krn WAKTU
 * BERJALAN (`now >= jadwalManual`), bukan cuma krn ada mutasi data. */
export async function syncNotifikasiHasilUjianMurid(penggunaId: string) {
  const siswa = await prisma.siswa.findUnique({ where: { akunId: penggunaId } });
  if (!siswa) return;

  const pengerjaanList = await prisma.ujianPengerjaan.findMany({
    where: { siswaId: siswa.id, status: { in: ["SELESAI", "AUTO_SUBMIT"] } },
    include: { ujian: { include: { soal: { include: { soal: true } }, kelas: true } } },
  });

  const aktif = new Set<string>();
  for (const p of pengerjaanList) {
    const { ujian } = p;
    if (bolehLihatHasilUjian(ujian, p, siswa.kelasId)) {
      aktif.add(p.ujianId);
      await upsertNotifikasi({
        penggunaId,
        tipe: "hasil-ujian-tersedia",
        entitasKey: p.ujianId,
        judul: `Nilai ujian "${ujian.judul}" sudah bisa dilihat`,
        deskripsi: p.nilaiTotal !== null ? `Nilai: ${p.nilaiTotal}` : undefined,
        href: `/murid/ujian/${p.ujianId}`,
        prioritas: "SEDANG",
      });
    }
  }
  await resolveStaleByTipe(penggunaId, "hasil-ujian-tersedia", aktif);
}

/** NTF-O-07 — mirror `syncNotifikasiHasilUjianMurid` di atas, tapi utk orang tua (semua anaknya).
 * Gerbang boleh-lihat SAMA PERSIS (kalau murid belum boleh lihat, ortu jangan lebih dulu tau). */
export async function syncNotifikasiHasilUjianOrtu(penggunaId: string) {
  const waliList = await prisma.waliSiswa.findMany({ where: { penggunaId }, include: { siswa: true } });
  const aktif = new Set<string>();

  for (const w of waliList) {
    const pengerjaanList = await prisma.ujianPengerjaan.findMany({
      where: { siswaId: w.siswaId, status: { in: ["SELESAI", "AUTO_SUBMIT"] } },
      include: { ujian: { include: { soal: { include: { soal: true } }, kelas: true } } },
    });
    for (const p of pengerjaanList) {
      const { ujian } = p;
      if (bolehLihatHasilUjian(ujian, p, w.siswa.kelasId)) {
        const key = `${w.siswaId}:${p.ujianId}`;
        aktif.add(key);
        await upsertNotifikasi({
          penggunaId,
          tipe: "anak-hasil-ujian-tersedia",
          entitasKey: key,
          judul: `Nilai ujian "${ujian.judul}" ${w.siswa.nama} sudah bisa dilihat`,
          deskripsi: p.nilaiTotal !== null ? `Nilai: ${p.nilaiTotal}` : undefined,
          href: `/ortu/ujian/${w.siswaId}/${p.ujianId}`,
          prioritas: "RENDAH",
        });
      }
    }
  }
  await resolveStaleByTipe(penggunaId, "anak-hasil-ujian-tersedia", aktif);
}

/** NTF-B-01/B-02 — agregat SATU baris (bukan per-tagihan, lihat catatan §1 notifikasi-selaras-ajar.md
 * soal skalanya jauh lebih besar drpd evaluator lain) utk Bendahara/Kepsek. */
export async function syncNotifikasiTagihanBendahara(penggunaId: string, sekolahId: string) {
  const jumlahBelumLunas = await prisma.tagihan.count({ where: { siswa: { sekolahId }, status: "BELUM_BAYAR" } });
  if (jumlahBelumLunas > 0) {
    await upsertNotifikasi({
      penggunaId,
      tipe: "tagihan-agregat",
      entitasKey: "agregat",
      judul: `${jumlahBelumLunas} tagihan SPP belum lunas`,
      href: `/keuangan`,
      prioritas: "SEDANG",
    });
  } else {
    await hapusNotifikasi(penggunaId, "tagihan-agregat", "agregat");
  }
}
