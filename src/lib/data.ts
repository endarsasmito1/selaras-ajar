import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { toDateOnlyUTC } from "@/lib/utils";

export async function getTahunAjaranAktif(sekolahId: string) {
  return prisma.tahunAjaran.findFirst({ where: { sekolahId, aktif: true } });
}

/** Lookup bobot komponen (Harian/Tugas/UTS/UAS) per mapel, key "{mapelId}::{komponen}" -> persentase. */
type BobotLookup = Map<string, number>;

/** 1.21 — bobot semua mapel di 1 sekolah dalam 1 query (dipakai fungsi ranking yang belum tentu
 * tahu mapelId spesifik di muka, beda dgn getPerformaSiswa yang sudah punya daftar nilai). */
async function ambilBobotSekolah(sekolahId: string): Promise<BobotLookup> {
  const rows = await prisma.bobotKomponen.findMany({ where: { mapel: { sekolahId } } });
  return new Map(rows.map((r) => [`${r.mapelId}::${r.komponen}`, r.persentase]));
}

async function ambilBobotMapel(mapelIds: string[]): Promise<BobotLookup> {
  const rows = await prisma.bobotKomponen.findMany({ where: { mapelId: { in: mapelIds } } });
  return new Map(rows.map((r) => [`${r.mapelId}::${r.komponen}`, r.persentase]));
}

/** 1.9/1.21, diminta eksplisit (G-2, lalu UAT round 2) — rata-rata BERBOBOT (Harian/Tugas/UTS/UAS,
 * dari BobotKomponen Master Data) per mapel, baru dirata-rata antar mapel — dipakai konsisten di
 * halaman Performa (D-2) MAUPUN ranking (D-4) supaya angka rata-rata satu murid sama di mana pun
 * ditampilkan. Kalau bobot suatu mapel belum diatur (BobotKomponen kosong utk mapel itu) ATAU ada
 * komponen yang belum punya nilai sama sekali (mis. UAS belum pernah diinput), bobot yang tersedia
 * DIRENORMALISASI ke 100% di antara komponen yang benar-benar ada datanya — bukan diam-diam
 * dianggap 0 (itu akan salah menjatuhkan rata-rata murid yang UAS-nya memang belum berlangsung).
 * Fallback ke rata-rata polos kalau mapel itu sama sekali belum punya BobotKomponen. */
function rataDariNilaiPerMapel(
  nilai: { mapelId: string; komponen: string; skor: number }[],
  bobot?: BobotLookup
): number | null {
  if (nilai.length === 0) return null;
  const perMapel = new Map<string, { komponen: string; skor: number }[]>();
  for (const n of nilai) perMapel.set(n.mapelId, [...(perMapel.get(n.mapelId) ?? []), { komponen: n.komponen, skor: n.skor }]);

  const rataPerMapel = Array.from(perMapel.entries()).map(([mapelId, rows]) => {
    const perKomponen = new Map<string, number[]>();
    for (const r of rows) perKomponen.set(r.komponen, [...(perKomponen.get(r.komponen) ?? []), r.skor]);
    const rataPerKomponen = Array.from(perKomponen.entries()).map(([komponen, skorList]) => ({
      komponen,
      rata: skorList.reduce((a, b) => a + b, 0) / skorList.length,
    }));

    const bobotTersedia = bobot ? rataPerKomponen.map((k) => bobot.get(`${mapelId}::${k.komponen}`) ?? 0) : [];
    const totalBobotTersedia = bobotTersedia.reduce((a, b) => a + b, 0);
    if (bobot && totalBobotTersedia > 0) {
      return rataPerKomponen.reduce((s, k, i) => s + k.rata * (bobotTersedia[i] / totalBobotTersedia), 0);
    }
    return rataPerKomponen.reduce((s, k) => s + k.rata, 0) / rataPerKomponen.length;
  });
  return Math.round((rataPerMapel.reduce((a, b) => a + b, 0) / rataPerMapel.length) * 10) / 10;
}

/** §5.5 (1.8, diminta eksplisit) — info kontekstual di menu akun: murid → kelas, guru → mapel/kelas diampu, + foto profil. */
export async function getAccountBadge(session: SessionPayload) {
  const pengguna = await prisma.pengguna.findUnique({ where: { id: session.userId }, select: { fotoUrl: true } });
  const fotoUrl = pengguna?.fotoUrl ?? null;

  if (session.peran === "MURID") {
    const siswa = await prisma.siswa.findUnique({ where: { akunId: session.userId }, include: { kelas: true } });
    return { detail: siswa ? `Kelas ${siswa.kelas.nama}` : null, fotoUrl };
  }

  if (session.peran === "GURU") {
    const tahunAktif = await getTahunAjaranAktif(session.sekolahId);
    const guruProfil = await prisma.guruProfil.findUnique({
      where: { penggunaId: session.userId },
      include: {
        penugasan: {
          where: tahunAktif ? { kelas: { tahunAjaranId: tahunAktif.id } } : undefined,
          include: { mapel: true, kelas: true },
        },
      },
    });
    if (!guruProfil || guruProfil.penugasan.length === 0) {
      return { detail: guruProfil?.mapelUtama ? `Guru ${guruProfil.mapelUtama}` : null, fotoUrl };
    }
    const mapelUnik = Array.from(new Set(guruProfil.penugasan.map((p) => p.mapel.nama)));
    const kelasUnik = Array.from(new Set(guruProfil.penugasan.map((p) => p.kelas.nama)));
    return { detail: `Guru ${mapelUnik.join(", ")} — Kelas ${kelasUnik.join(", ")}`, fotoUrl };
  }

  return { detail: null, fotoUrl };
}

// ---------- KEPALA SEKOLAH ----------

export async function getRingkasanSekolah(sekolahId: string) {
  const [totalSiswa, totalKelas, totalGuru, tahunAjaran, sekolah] = await Promise.all([
    prisma.siswa.count({ where: { sekolahId, aktif: true } }),
    prisma.kelas.count({ where: { sekolahId } }),
    prisma.pengguna.count({ where: { sekolahId, peran: "GURU", aktif: true } }),
    getTahunAjaranAktif(sekolahId),
    prisma.sekolah.findUnique({ where: { id: sekolahId } }),
  ]);

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  const besok = new Date(hariIni);
  besok.setDate(besok.getDate() + 1);

  const absensiHariIni = await prisma.absensi.findMany({
    where: { siswa: { sekolahId }, tanggal: { gte: hariIni, lt: besok } },
  });
  const hadir = absensiHariIni.filter((a) => a.status === "HADIR").length;
  const persenHadir =
    absensiHariIni.length > 0 ? Math.round((hadir / absensiHariIni.length) * 100) : null;

  const periodeIni = hariIni.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const tagihanBulanIni = await prisma.tagihan.findMany({
    where: { siswa: { sekolahId }, periode: periodeIni },
  });
  const terkumpul = tagihanBulanIni
    .filter((t) => t.status === "LUNAS" || t.status === "CICILAN")
    .reduce((sum, t) => sum + t.nominal, 0);
  const tunggakan = tagihanBulanIni.filter((t) => t.status === "BELUM_BAYAR");

  // K-1: breakdown per kelas (kehadiran hari ini + rata-rata nilai keseluruhan)
  // Perf — sebelumnya 3 query PER kelas di dalam Promise.all (N+1: sekolah dgn 24 kelas = 72 query
  // sekuensial). Dibatch: absensi hari ini dipakai ulang dari `absensiHariIni` (udah di-fetch
  // se-sekolah di atas, sudah termasuk kelasId per-baris), nilai & jumlah siswa dibatch jadi 1
  // query masing2 lalu dikelompokkan per kelasId di JS.
  const kelasList = await getSemuaKelas(sekolahId);
  const kelasIds = kelasList.map((k) => k.id);
  const absensiPerKelas = new Map<string, { status: string }[]>();
  for (const a of absensiHariIni) absensiPerKelas.set(a.kelasId, [...(absensiPerKelas.get(a.kelasId) ?? []), a]);
  const [semuaNilai, semuaSiswaAktif] = await Promise.all([
    prisma.nilai.findMany({ where: { kelasId: { in: kelasIds } }, select: { kelasId: true, skor: true } }),
    prisma.siswa.findMany({ where: { kelasId: { in: kelasIds }, aktif: true }, select: { kelasId: true } }),
  ]);
  const nilaiPerKelas = new Map<string, number[]>();
  for (const n of semuaNilai) nilaiPerKelas.set(n.kelasId, [...(nilaiPerKelas.get(n.kelasId) ?? []), n.skor]);
  const jumlahSiswaPerKelas = new Map<string, number>();
  for (const s of semuaSiswaAktif) jumlahSiswaPerKelas.set(s.kelasId, (jumlahSiswaPerKelas.get(s.kelasId) ?? 0) + 1);

  const breakdownKelas = kelasList.map((k) => {
    const absensiKelas = absensiPerKelas.get(k.id) ?? [];
    const nilaiKelas = nilaiPerKelas.get(k.id) ?? [];
    const hadirKelas = absensiKelas.filter((a) => a.status === "HADIR").length;
    const persenHadirKelas =
      absensiKelas.length > 0 ? Math.round((hadirKelas / absensiKelas.length) * 100) : null;
    const rataNilai =
      nilaiKelas.length > 0
        ? Math.round((nilaiKelas.reduce((s, skor) => s + skor, 0) / nilaiKelas.length) * 10) / 10
        : null;
    return { kelas: k, jumlahSiswa: jumlahSiswaPerKelas.get(k.id) ?? 0, persenHadirKelas, rataNilai };
  });

  return {
    totalSiswa,
    totalKelas,
    totalGuru,
    sekolah,
    tahunAjaran,
    persenHadir,
    terkumpul,
    tunggakanCount: tunggakan.length,
    tunggakanTotal: tunggakan.reduce((sum, t) => sum + t.nominal, 0),
    breakdownKelas,
  };
}

export async function getDaftarSiswa(sekolahId: string) {
  return prisma.siswa.findMany({
    where: { sekolahId, aktif: true },
    include: { kelas: true, wali: { include: { pengguna: true } } },
    orderBy: [{ kelas: { nama: "asc" } }, { nama: "asc" }],
  });
}

/** F-2/F-3 (1.7) — siswa lulus/pindah sekolah/mutasi keluar, disimpan permanen sebagai histori. */
export async function getRiwayatSiswa(sekolahId: string) {
  return prisma.siswa.findMany({
    // 1.9 — bukan sekadar aktif:false: siswa tahun ajaran historis (dummy scaffolding, bukan
    // alumni sungguhan) juga aktif:false tapi tak punya statusKeluar. Riwayat Siswa cuma utk
    // yang benar-benar lulus/pindah/mutasi keluar lewat alur F-2/F-3.
    where: { sekolahId, aktif: false, statusKeluar: { not: null } },
    include: { kelas: true },
    orderBy: [{ tanggalKeluar: "desc" }, { nama: "asc" }],
  });
}

export async function getSemuaKelas(sekolahId: string) {
  const tahunAktif = await getTahunAjaranAktif(sekolahId);
  return prisma.kelas.findMany({
    where: { sekolahId, tahunAjaranId: tahunAktif?.id },
    orderBy: { nama: "asc" },
  });
}

export async function getDaftarGuru(sekolahId: string, q?: string) {
  const tahunAktif = await getTahunAjaranAktif(sekolahId);
  const guru = await prisma.pengguna.findMany({
    where: { sekolahId, peran: "GURU" },
    include: {
      guruProfil: {
        include: {
          penugasan: {
            where: tahunAktif ? { kelas: { tahunAjaranId: tahunAktif.id } } : undefined,
            include: { kelas: true, mapel: true },
          },
        },
      },
      waliKelasDi: tahunAktif ? { where: { tahunAjaranId: tahunAktif.id } } : true,
    },
    orderBy: { nama: "asc" },
  });
  if (!q) return guru;
  const qLower = q.toLowerCase();
  return guru.filter((g) => g.nama.toLowerCase().includes(qLower));
}

export async function getDaftarTahunAjaran(sekolahId: string) {
  return prisma.tahunAjaran.findMany({
    where: { sekolahId },
    include: { _count: { select: { kelas: true } } },
    orderBy: { mulai: "desc" },
  });
}

/** 1.21 — halaman detail 1 tahun ajaran (K-8): kelas+wali, guru pengampu, rekap absensi.
 * Murid & nilai per mapel sengaja TIDAK diduplikasi di sini — sudah ada drill-down per kelas
 * lewat link ke /kepsek/siswa/kelas/[kelasId] (halaman itu murni kelasId-scoped, otomatis jalan
 * utk kelas tahun ajaran manapun, termasuk yg sudah lewat, tanpa perlu perubahan). */
export async function getDetailTahunAjaran(tahunAjaranId: string, sekolahId: string) {
  const tahunAjaran = await prisma.tahunAjaran.findFirst({ where: { id: tahunAjaranId, sekolahId } });
  if (!tahunAjaran) return null;

  const kelasList = await prisma.kelas.findMany({
    where: { tahunAjaranId },
    include: { waliKelas: true, _count: { select: { siswa: true } } },
    orderBy: { nama: "asc" },
  });
  const kelasIds = kelasList.map((k) => k.id);

  const penugasan = await prisma.penugasanGuru.findMany({
    where: { kelasId: { in: kelasIds } },
    include: { guru: { include: { pengguna: true } }, mapel: true, kelas: true },
  });
  const guruMap = new Map<string, { nama: string; mapelKelas: string[] }>();
  for (const p of penugasan) {
    const cur = guruMap.get(p.guruId) ?? { nama: p.guru.pengguna.nama, mapelKelas: [] };
    cur.mapelKelas.push(`${p.mapel.nama} — ${p.kelas.nama}`);
    guruMap.set(p.guruId, cur);
  }
  const guruList = Array.from(guruMap.values()).sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  const absensiAgg = await prisma.absensi.groupBy({
    by: ["status"],
    where: { kelasId: { in: kelasIds } },
    _count: { _all: true },
  });
  const totalAbsensi = absensiAgg.reduce((s, a) => s + a._count._all, 0);
  const hadirCount = absensiAgg.find((a) => a.status === "HADIR")?._count._all ?? 0;
  const persenHadir = totalAbsensi > 0 ? Math.round((hadirCount / totalAbsensi) * 100) : null;

  return { tahunAjaran, kelasList, guruList, persenHadir, totalAbsensi };
}

/** K-4: daftar siswa disusun hierarkis di bawah kelas (bukan tabel flat). */
export async function getDaftarSiswaHierarkis(sekolahId: string) {
  const kelasList = await getSemuaKelas(sekolahId);
  return Promise.all(
    kelasList.map(async (k) => {
      const [siswa, waliKelas] = await Promise.all([
        prisma.siswa.findMany({ where: { kelasId: k.id, aktif: true }, orderBy: { nama: "asc" } }),
        k.waliKelasId ? prisma.pengguna.findUnique({ where: { id: k.waliKelasId } }) : null,
      ]);
      return { kelas: k, waliKelas, siswa };
    })
  );
}

/** D-4: dashboard performa kelas — halaman antara sebelum drill-down ke performa per siswa. */
export async function getPerformaKelas(kelasId: string, sekolahId: string) {
  const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId } });
  if (!kelas) return null;

  const siswaList = await prisma.siswa.findMany({ where: { kelasId, aktif: true }, orderBy: { nama: "asc" } });
  const gradeScale = await getGradeScale(kelas.sekolahId);

  const [nilaiSemua, absensiSemua] = await Promise.all([
    prisma.nilai.findMany({ where: { kelasId }, include: { mapel: true } }),
    prisma.absensi.findMany({ where: { kelasId } }),
  ]);

  const mapelMap = new Map<string, { nama: string; skor: number[] }>();
  for (const n of nilaiSemua) {
    const cur = mapelMap.get(n.mapelId) ?? { nama: n.mapel.nama, skor: [] };
    cur.skor.push(n.skor);
    mapelMap.set(n.mapelId, cur);
  }
  const rataPerMapel = Array.from(mapelMap.values()).map((m) => ({
    nama: m.nama,
    rata: Math.round((m.skor.reduce((a, b) => a + b, 0) / m.skor.length) * 10) / 10,
  }));

  const totalHadir = absensiSemua.filter((a) => a.status === "HADIR").length;
  const persenHadirKelas = absensiSemua.length > 0 ? Math.round((totalHadir / absensiSemua.length) * 100) : null;

  const siswaIndikator = await Promise.all(
    siswaList.map(async (s) => {
      const nilaiSiswa = nilaiSemua.filter((n) => n.siswaId === s.id);
      const absensiSiswa = absensiSemua.filter((a) => a.siswaId === s.id);
      const rata = nilaiSiswa.length > 0 ? nilaiSiswa.reduce((a, b) => a + b.skor, 0) / nilaiSiswa.length : null;
      const hadirSiswa = absensiSiswa.filter((a) => a.status === "HADIR").length;
      const persenHadirSiswa = absensiSiswa.length > 0 ? Math.round((hadirSiswa / absensiSiswa.length) * 100) : null;
      const predikat = rata !== null ? hitungPredikat(rata, gradeScale) : "-";
      const butuhPerhatian = (rata !== null && rata < 70) || (persenHadirSiswa !== null && persenHadirSiswa < 80);
      return { siswa: s, rata, persenHadirSiswa, predikat, butuhPerhatian };
    })
  );

  return { kelas, jumlahSiswa: siswaList.length, rataPerMapel, persenHadirKelas, siswaIndikator };
}

// ---------- BENDAHARA / KEUANGAN ----------

export async function getRingkasanKeuangan(sekolahId: string, periode: string) {
  const [tagihan, sekolah] = await Promise.all([
    prisma.tagihan.findMany({
      where: { siswa: { sekolahId }, periode },
      include: { siswa: { include: { kelas: true } }, tipe: true },
      orderBy: [{ siswa: { kelas: { nama: "asc" } } }, { siswa: { nama: "asc" } }],
    }),
    prisma.sekolah.findUnique({ where: { id: sekolahId } }),
  ]);

  const terkumpul = tagihan
    .filter((t) => t.status !== "BELUM_BAYAR")
    .reduce((sum, t) => sum + t.nominal, 0);
  const target = tagihan.reduce((sum, t) => sum + t.nominal, 0);
  const belumBayar = tagihan.filter((t) => t.status === "BELUM_BAYAR");
  const persentase = target > 0 ? Math.round((terkumpul / target) * 100) : 0;

  return {
    tagihan,
    terkumpul,
    target,
    persentase,
    belumBayarCount: belumBayar.length,
    satuanPeriode: sekolah?.satuanPeriode ?? "BULANAN",
  };
}

export async function getSemuaTagihanTipe(sekolahId: string) {
  return prisma.tagihanTipe.findMany({ where: { sekolahId }, orderBy: { nama: "asc" } });
}

/** Riwayat lengkap tagihan 1 siswa lintas periode & tipe — dipakai halaman drill-down bendahara/kepsek. */
export async function getRiwayatTagihanSiswa(siswaId: string, sekolahId: string) {
  const siswa = await prisma.siswa.findFirst({ where: { id: siswaId, sekolahId }, include: { kelas: true } });
  if (!siswa) return null;
  const tagihan = await prisma.tagihan.findMany({
    where: { siswaId },
    include: { tipe: true },
    orderBy: { jatuhTempo: "desc" },
  });
  return { siswa, tagihan };
}

/** 1.21 — riwayat pembayaran lintas periode & tipe utk 1 sekolah, dipakai halaman /keuangan/riwayat
 * (dulu digabung jadi 1 tabel flat di dashboard /keuangan, sekarang dipisah + filter/search sendiri). */
export async function getRiwayatTagihanSekolah(sekolahId: string, opts: { cari?: string; status?: string; tahunAjaranId?: string } = {}) {
  return prisma.tagihan.findMany({
    where: {
      siswa: { sekolahId, ...(opts.cari ? { nama: { contains: opts.cari } } : {}) },
      ...(opts.status && opts.status !== "SEMUA" ? { status: opts.status as "LUNAS" | "CICILAN" | "BELUM_BAYAR" } : {}),
      ...(opts.tahunAjaranId ? { tahunAjaranId: opts.tahunAjaranId } : {}),
    },
    include: { siswa: { include: { kelas: true } }, tipe: true },
    orderBy: { jatuhTempo: "desc" },
  });
}

/**
 * Proyeksi keuangan sederhana (heuristik, bukan akuntansi presisi): rata-rata rasio
 * terkumpul/target dari beberapa periode terakhir, diproyeksikan ke target periode mendatang.
 * Target proyeksi periode depan = rata-rata `target` (nominal ditagihkan) periode-periode lalu,
 * dikali rasio rata-rata realisasi — jadi angka "perkiraan terkumpul" bukan "terkumpul pasti".
 */
/**
 * Versi ringan `getRingkasanKeuangan` — hanya total nominal per status (lewat `groupBy`), tanpa
 * join ke siswa/kelas/tipe dan tanpa sort lintas relasi. Dipakai proyeksi (perlu terkumpul/target
 * saja, bukan daftar tagihan baris-per-baris) supaya tak menaikkan beban query 3x lipat percuma.
 */
async function getAgregatTagihan(sekolahId: string, periode: string) {
  const rows = await prisma.tagihan.groupBy({
    by: ["status"],
    where: { siswa: { sekolahId }, periode },
    _sum: { nominal: true },
  });
  let terkumpul = 0;
  let target = 0;
  for (const r of rows) {
    const nominal = r._sum.nominal ?? 0;
    target += nominal;
    if (r.status !== "BELUM_BAYAR") terkumpul += nominal;
  }
  return { terkumpul, target };
}

export async function getProyeksiKeuangan(sekolahId: string, jumlahPeriodeUntukRataRata = 3) {
  const periodeList = await getDaftarPeriodeTagihan(sekolahId);
  const periodeDipakai = periodeList.slice(0, jumlahPeriodeUntukRataRata);
  if (periodeDipakai.length === 0) {
    return { rasioRataRata: 0, rataRataTarget: 0, proyeksiBulanDepan: 0, proyeksiTahunDepan: 0, riwayat: [] as { periode: string; terkumpul: number; target: number }[] };
  }
  const ringkasanPerPeriode = await Promise.all(periodeDipakai.map((p) => getAgregatTagihan(sekolahId, p)));
  const rasioRataRata =
    ringkasanPerPeriode.reduce((sum, r) => sum + (r.target > 0 ? r.terkumpul / r.target : 0), 0) / ringkasanPerPeriode.length;
  const rataRataTarget = ringkasanPerPeriode.reduce((sum, r) => sum + r.target, 0) / ringkasanPerPeriode.length;
  const proyeksiBulanDepan = Math.round(rataRataTarget * rasioRataRata);
  const proyeksiTahunDepan = Math.round(rataRataTarget * rasioRataRata * 12);
  const riwayat = periodeDipakai
    .map((p, i) => ({ periode: p, terkumpul: ringkasanPerPeriode[i].terkumpul, target: ringkasanPerPeriode[i].target }))
    .reverse();
  return { rasioRataRata, rataRataTarget, proyeksiBulanDepan, proyeksiTahunDepan, riwayat };
}

/** Daftar periode tagihan yang pernah dibuat (utk selector K-3), terbaru dulu. */
export async function getDaftarPeriodeTagihan(sekolahId: string) {
  const rows = await prisma.tagihan.findMany({
    where: { siswa: { sekolahId } },
    select: { periode: true, jatuhTempo: true },
    distinct: ["periode"],
    orderBy: { jatuhTempo: "desc" },
  });
  return rows.map((r) => r.periode);
}

// ---------- GURU ----------

/** 1.8 — dibatasi ke tahun ajaran AKTIF; sebelum ada tahun ajaran historis di seed, semua penugasan
 * kebetulan cuma ada di 1 tahun sehingga query tanpa filter ini "kebetulan benar" — begitu ada
 * riwayat tahun ajaran lain (MG-5, F-2), guru bisa saja masih tercatat mengajar kelas tahun lalu
 * kalau tak difilter, jadi ini bukan sekadar penyempurnaan kosmetik. */
export async function getKelasDiampu(penggunaId: string) {
  const guru = await prisma.guruProfil.findUnique({
    where: { penggunaId },
    include: { penugasan: { where: { kelas: { tahunAjaran: { aktif: true } } }, include: { kelas: true, mapel: true } } },
  });
  return guru?.penugasan ?? [];
}

/** 1.23 — daftar mapel yang benar-benar diajarkan di satu kelas (via PenugasanGuru), dipakai
 * murid/tanya-jawab buat pilihan mapel (guru sisi punya getKelasDiampu, murid gak punya itu). */
export async function getMapelUntukKelas(kelasId: string) {
  const penugasan = await prisma.penugasanGuru.findMany({
    where: { kelasId, kelas: { tahunAjaran: { aktif: true } } },
    include: { mapel: true },
  });
  return Array.from(new Map(penugasan.map((p) => [p.mapel.id, p.mapel])).values()).sort((a, b) =>
    a.nama.localeCompare(b.nama)
  );
}

export async function getSiswaKelas(kelasId: string) {
  return prisma.siswa.findMany({ where: { kelasId, aktif: true }, orderBy: { nama: "asc" } });
}

/** Menu "Murid" guru — semua siswa lintas kelas yang diampu, dikelompokkan per kelas. */
export async function getMuridDiampuGuru(penggunaId: string) {
  const penugasan = await getKelasDiampu(penggunaId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());
  return Promise.all(
    kelasUnik.map(async (kelas) => ({ kelas, siswa: await getSiswaKelas(kelas.id) }))
  );
}

/** 1.23 — sebelumnya `getAbsensiHariIni`, cuma bisa hari ini (hardcode). Sekarang terima
 * `tanggal` ("YYYY-MM-DD") opsional supaya guru bisa isi absensi tanggal lampau via datepicker. */
export async function getAbsensiUntukTanggal(kelasId: string, tanggal?: string) {
  // 1.23 — `toDateOnlyUTC` (bukan `new Date(x+"T00:00:00")`, yg diinterpretasi lokal & bisa geser
  // sehari di timezone non-UTC) supaya konsisten dgn cara `Absensi.tanggal` disimpan (UTC midnight).
  const awal = toDateOnlyUTC(tanggal ?? new Date());
  const akhir = new Date(awal);
  akhir.setUTCDate(akhir.getUTCDate() + 1);
  const rows = await prisma.absensi.findMany({
    where: { kelasId, tanggal: { gte: awal, lt: akhir } },
  });
  const map = new Map(rows.map((r) => [r.siswaId, r.status]));
  return map;
}

export async function getCatatanAbsensiUntukTanggal(kelasId: string, tanggal?: string) {
  const awal = toDateOnlyUTC(tanggal ?? new Date());
  const akhir = new Date(awal);
  akhir.setUTCDate(akhir.getUTCDate() + 1);
  const rows = await prisma.absensi.findMany({
    where: { kelasId, tanggal: { gte: awal, lt: akhir } },
  });
  return new Map(rows.map((r) => [r.siswaId, r.catatan ?? ""]));
}

/** 1.23 — pengajuan izin MENUNGGU (belum diputuskan guru) di kelas & tanggal tertentu, dipakai
 * halaman Isi Absensi supaya guru langsung lihat & bisa putuskan tanpa pindah ke /guru/izin. */
export async function getPengajuanIzinPendingUntukTanggal(kelasId: string, tanggal?: string) {
  const awal = toDateOnlyUTC(tanggal ?? new Date());
  const akhir = new Date(awal);
  akhir.setUTCDate(akhir.getUTCDate() + 1);
  const rows = await prisma.pengajuanIzin.findMany({
    where: { siswa: { kelasId }, tanggal: { gte: awal, lt: akhir }, status: "MENUNGGU" },
    include: { siswa: true, diajukanOleh: true },
  });
  return new Map(rows.map((r) => [r.siswaId, r]));
}

/** G-1: riwayat absensi kelas, bisa difilter per tanggal (rentang) atau per murid. */
export async function getRiwayatAbsensi(
  kelasId: string,
  filter: { tanggalMulai?: string; tanggalSelesai?: string; siswaId?: string } = {}
) {
  const where: {
    kelasId: string;
    siswaId?: string;
    tanggal?: { gte?: Date; lte?: Date };
  } = { kelasId };
  if (filter.siswaId) where.siswaId = filter.siswaId;
  if (filter.tanggalMulai || filter.tanggalSelesai) {
    where.tanggal = {};
    if (filter.tanggalMulai) where.tanggal.gte = new Date(filter.tanggalMulai);
    if (filter.tanggalSelesai) where.tanggal.lte = new Date(filter.tanggalSelesai + "T23:59:59");
  }
  return prisma.absensi.findMany({
    where,
    include: { siswa: true },
    orderBy: [{ tanggal: "desc" }, { siswa: { nama: "asc" } }],
    take: 300,
  });
}

export async function getNilaiKelasMapel(kelasId: string, mapelId: string) {
  return prisma.nilai.findMany({
    where: { kelasId, mapelId },
    include: { siswa: true },
    orderBy: [{ siswa: { nama: "asc" } }, { createdAt: "desc" }],
  });
}

/**
 * 1.10, diminta eksplisit (G-2) — "komponen" penilaian di halaman Input Nilai diambil dari Tugas &
 * Ujian kelas/mapel ini yang sungguh ada (bukan kategori generik lepas seperti dulu), supaya nilai
 * yang diinput/diedit di sini konsisten dengan hasil tugas/ujian yang sesungguhnya.
 */
export async function getSumberPenilaianKelas(kelasId: string, mapelId: string) {
  const [tugas, ujian] = await Promise.all([
    prisma.tugas.findMany({ where: { kelasId, mapelId }, orderBy: { createdAt: "desc" } }),
    prisma.ujian.findMany({ where: { mapelId, kelas: { some: { kelasId } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return { tugas, ujian };
}

/** Skor asli tersimpan di Tugas/Ujian (PengumpulanTugas/UjianPengerjaan) untuk satu sumber tertentu — dipakai sbg fallback prefill pertama kali sebelum ada baris Nilai. */
export async function getSkorAsliSumberPenilaian(sumberTipe: "tugas" | "ujian", sumberId: string) {
  if (sumberTipe === "tugas") {
    const rows = await prisma.pengumpulanTugas.findMany({ where: { tugasId: sumberId }, select: { siswaId: true, nilai: true } });
    return new Map(rows.map((r) => [r.siswaId, r.nilai]));
  }
  const rows = await prisma.ujianPengerjaan.findMany({ where: { ujianId: sumberId }, select: { siswaId: true, nilaiTotal: true } });
  return new Map(rows.map((r) => [r.siswaId, r.nilaiTotal]));
}

export async function getMateriKelas(kelasId: string) {
  return prisma.materiBelajar.findMany({
    where: { kelasId },
    include: { mapel: true, bab: true },
    orderBy: { createdAt: "desc" },
  });
}

/** 1.23 — daftar Bab existing utk satu mapel (dropdown pilih-atau-tambah-baru saat upload materi/bikin ujian). */
export async function getBabMapel(sekolahId: string, mapelId: string) {
  return prisma.bab.findMany({ where: { sekolahId, mapelId }, orderBy: { nama: "asc" } });
}

/** 1.23 — find-or-create Bab by nama+mapel (dedupe via @@unique([mapelId, nama])), dipakai saat
 * guru upload materi / bikin ujian mengetik nama bab baru yang belum ada. */
export async function cariAtauBuatBab(sekolahId: string, mapelId: string, nama: string) {
  const namaTrim = nama.trim();
  const existing = await prisma.bab.findUnique({ where: { mapelId_nama: { mapelId, nama: namaTrim } } });
  if (existing) return existing;
  return prisma.bab.create({ data: { sekolahId, mapelId, nama: namaTrim } });
}

export async function getTugasKelas(kelasId: string) {
  return prisma.tugas.findMany({
    where: { kelasId },
    include: { mapel: true, pengumpulan: true },
    orderBy: { tenggat: "desc" },
  });
}

// ---------- PENGUMUMAN SEKOLAH (1.20) ----------

export async function getPengumumanTerbaru(sekolahId: string, limit = 3) {
  return prisma.pengumumanSekolah.findMany({
    where: { sekolahId },
    include: { dibuatOleh: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getSemuaPengumuman(sekolahId: string) {
  return prisma.pengumumanSekolah.findMany({
    where: { sekolahId },
    include: { dibuatOleh: true },
    orderBy: { createdAt: "desc" },
  });
}

// ---------- ORANG TUA ----------

export async function getAnakDariOrtu(penggunaId: string) {
  const wali = await prisma.waliSiswa.findMany({
    where: { penggunaId },
    include: {
      siswa: {
        include: {
          kelas: true,
          absensi: { orderBy: { tanggal: "desc" }, take: 5 },
          nilai: { orderBy: { createdAt: "desc" }, take: 5, include: { mapel: true } },
          tagihan: { orderBy: { createdAt: "desc" }, take: 3, include: { tipe: true } },
        },
      },
    },
  });
  return wali.map((w) => ({ ...w.siswa, hubungan: w.hubungan }));
}

// ---------- MURID ----------

export async function getSiswaByAkun(akunId: string) {
  return prisma.siswa.findUnique({
    where: { akunId },
    include: { kelas: true },
  });
}

/** 1.21 — profil ringkas murid+ortu+sekolah utk kartu info diri di dashboard murid. Query
 * terpisah (bukan perluas include getSiswaByAkun) supaya halaman murid lain (tugas/jadwal/dst)
 * yang cuma butuh kelasId tak ikut kena join wali+sekolah yang tak dipakainya. */
export async function getProfilMurid(siswaId: string) {
  return prisma.siswa.findUnique({
    where: { id: siswaId },
    include: {
      kelas: true,
      sekolah: true,
      wali: { include: { pengguna: true } },
    },
  });
}

// ---------- UJIAN / CBT — BANK SOAL ----------

/**
 * Bank soal sekolah + soal global buatan superadmin (1.20). Soal global (sekolahId null) tak
 * terhubung ke MataPelajaran sekolah manapun (mapelId null) — dicocokkan lewat `mapelNama` (nama
 * teks bebas) terhadap nama mapel yang diminta, bukan lewat mapelId, karena MataPelajaran itu
 * sendiri selalu sekolah-spesifik.
 */
export async function getBankSoal(sekolahId: string, mapelId?: string) {
  let mapelNama: string | null = null;
  if (mapelId) {
    const mapel = await prisma.mataPelajaran.findUnique({ where: { id: mapelId }, select: { nama: true } });
    mapelNama = mapel?.nama ?? null;
  }
  return prisma.soal.findMany({
    where: {
      OR: [
        { sekolahId, ...(mapelId ? { mapelId } : {}) },
        { sekolahId: null, ...(mapelNama ? { mapelNama } : mapelId ? { id: "__no_match__" } : {}) },
      ],
    },
    include: { mapel: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Bank soal global (superadmin) — daftar nama mapel unik lintas semua sekolah, dipakai dropdown
 * "Mapel" saat superadmin bikin soal global supaya konsisten dgn nama mapel yang dipakai sekolah. */
export async function getSemuaNamaMapelUnik() {
  const rows = await prisma.mataPelajaran.findMany({ select: { nama: true }, distinct: ["nama"], orderBy: { nama: "asc" } });
  return rows.map((r) => r.nama);
}

export async function getBankSoalGlobal() {
  return prisma.soal.findMany({
    where: { sekolahId: null },
    include: { dibuatOleh: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSoalById(soalId: string, sekolahId?: string) {
  return prisma.soal.findFirst({ where: { id: soalId, ...(sekolahId ? { sekolahId } : {}) } });
}

// ---------- UJIAN / CBT — GURU ----------

/** U-1 (1.6): kelas card untuk halaman utama Ujian guru — jumlah ujian per kelas, list muncul saat kartu diklik. */
/** U-21 (1.8, diminta eksplisit): tiap card kelas juga menampilkan ringkasan draft/berlangsung/selesai. */
export async function getUjianKelasCards(guruPenggunaId: string) {
  const penugasan = await getKelasDiampu(guruPenggunaId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());
  const now = new Date();
  return Promise.all(
    kelasUnik.map(async (kelas) => {
      const list = await prisma.ujianKelas.findMany({
        where: { kelasId: kelas.id, ujian: { dibuatOlehId: guruPenggunaId } },
        include: { ujian: true },
      });
      const draft = list.filter((uk) => uk.ujian.status === "DRAFT").length;
      const selesai = list.filter((uk) => uk.ujian.status === "PUBLISHED" && uk.jamSelesai !== null && uk.jamSelesai <= now).length;
      const berlangsung = list.length - draft - selesai;
      return { kelas, count: list.length, draft, berlangsung, selesai };
    })
  );
}

/** Daftar ujian guru untuk satu kelas — dipakai di halaman drill-down card kelas (1.6). */
export async function getUjianByGuruDanKelas(guruPenggunaId: string, kelasId: string) {
  const list = await prisma.ujianKelas.findMany({
    where: { kelasId, ujian: { dibuatOlehId: guruPenggunaId } },
    include: {
      ujian: {
        include: { mapel: true, soal: true, pengerjaan: { where: { siswa: { kelasId } } } },
      },
    },
    orderBy: { ujian: { createdAt: "desc" } },
  });
  return list.map((uk) => ({ ...uk.ujian, jamMulai: uk.jamMulai, jamSelesai: uk.jamSelesai }));
}

export async function getUjianByGuru(guruPenggunaId: string) {
  return prisma.ujian.findMany({
    where: { dibuatOlehId: guruPenggunaId },
    include: {
      // 1.21 — _count siswa aktif per kelas & siswa per pengerjaan, dipakai breakdown per-kelas
      // di baris expand "Semua Ujian" (guru tak perlu lagi klik masuk tiap kelas satu-satu).
      kelas: { include: { kelas: { include: { _count: { select: { siswa: { where: { aktif: true } } } } } } } },
      mapel: true,
      soal: true,
      pengerjaan: { include: { siswa: { select: { id: true, nama: true, kelasId: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Detail ujian lintas-kelas (guru) — dipakai halaman hasil/analisis, edit, konfirmasi, nilai-esai, lihat soal. */
export async function getUjianDetail(ujianId: string, sekolahId?: string) {
  return prisma.ujian.findFirst({
    where: { id: ujianId, ...(sekolahId ? { kelas: { some: { kelas: { sekolahId } } } } : {}) },
    include: {
      kelas: { include: { kelas: true }, orderBy: { kelas: { nama: "asc" } } },
      mapel: true,
      bab: true,
      soal: { include: { soal: true }, orderBy: { urutan: "asc" } },
      pengerjaan: {
        include: { siswa: true, jawaban: true },
        orderBy: { siswa: { nama: "asc" } },
      },
    },
  });
}

/**
 * Detail ujian untuk SATU murid di SATU kelas — dipakai murid/ortu (1.6). Mengembalikan bentuk
 * yang di-flatten (jamMulai/jamSelesai/kelas dari UjianKelas kelas itu) supaya halaman
 * murid/ortu (gating U-25/U-26) tak perlu tahu soal multi-kelas sama sekali.
 */
export async function getUjianUntukSiswa(ujianId: string, kelasId: string, siswaId: string) {
  const uk = await prisma.ujianKelas.findUnique({
    where: { ujianId_kelasId: { ujianId, kelasId } },
    include: {
      kelas: true,
      ujian: {
        include: {
          mapel: true,
          soal: { include: { soal: true }, orderBy: { urutan: "asc" } },
          pengerjaan: { where: { siswaId }, include: { siswa: true, jawaban: true } },
        },
      },
    },
  });
  if (!uk) return null;
  return { ...uk.ujian, jamMulai: uk.jamMulai, jamSelesai: uk.jamSelesai, kelasId: uk.kelasId, kelas: uk.kelas };
}

export async function getEsaiPerluDinilai(guruPenggunaId: string) {
  const ujianGuru = await prisma.ujian.findMany({
    where: { dibuatOlehId: guruPenggunaId },
    select: { id: true, judul: true },
  });
  const ujianIds = ujianGuru.map((u) => u.id);

  return prisma.ujianJawaban.findMany({
    where: {
      skor: null,
      jawabanTeks: { not: null },
      soal: { jenis: "ESAI" },
      pengerjaan: { ujianId: { in: ujianIds }, status: { in: ["SELESAI", "AUTO_SUBMIT"] } },
    },
    include: {
      soal: true,
      pengerjaan: { include: { siswa: true, ujian: true } },
    },
  });
}

// ---------- UJIAN / CBT — MURID ----------

export async function getUjianAktifUntukMurid(kelasId: string, siswaId: string) {
  const daftar = await prisma.ujianKelas.findMany({
    where: { kelasId, ujian: { status: "PUBLISHED" } },
    include: {
      ujian: { include: { mapel: true, soal: true, pengerjaan: { where: { siswaId } } } },
    },
    orderBy: { ujian: { createdAt: "desc" } },
  });
  return daftar.map((uk) => ({ ...uk.ujian, jamMulai: uk.jamMulai, jamSelesai: uk.jamSelesai }));
}

export async function getPengerjaan(pengerjaanId: string) {
  return prisma.ujianPengerjaan.findUnique({
    where: { id: pengerjaanId },
    include: {
      ujian: { include: { soal: { include: { soal: true } } } },
      jawaban: true,
      siswa: true,
    },
  });
}

export async function getDashboardMurid(siswaId: string, kelasId: string) {
  const [nilai, tugas, materi, absensi] = await Promise.all([
    prisma.nilai.findMany({
      where: { siswaId },
      include: { mapel: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.tugas.findMany({
      where: { kelasId },
      include: { mapel: true, pengumpulan: { where: { siswaId } } },
      orderBy: { tenggat: "asc" },
    }),
    prisma.materiBelajar.findMany({
      where: { kelasId },
      include: { mapel: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.absensi.findMany({
      where: { siswaId },
      orderBy: { tanggal: "desc" },
      take: 10,
    }),
  ]);
  return { nilai, tugas, materi, absensi };
}

// ---------- TUGAS / PR ----------

export async function getTugasByGuru(guruPenggunaId: string) {
  return prisma.tugas.findMany({
    where: { penggunaId: guruPenggunaId },
    include: { kelas: true, mapel: true, pengumpulan: true },
    orderBy: { tenggat: "desc" },
  });
}

export async function getTugasDetail(tugasId: string, sekolahId?: string) {
  const tugas = await prisma.tugas.findFirst({
    where: { id: tugasId, ...(sekolahId ? { kelas: { sekolahId } } : {}) },
    include: { kelas: true, mapel: true, pengumpulan: { include: { siswa: true } } },
  });
  if (!tugas) return null;
  const semuaSiswa = await prisma.siswa.findMany({ where: { kelasId: tugas.kelasId, aktif: true }, orderBy: { nama: "asc" } });
  const sudahKumpulIds = new Set(tugas.pengumpulan.map((p) => p.siswaId));
  const belumKumpul = semuaSiswa.filter((s) => !sudahKumpulIds.has(s.id));
  return { ...tugas, belumKumpul };
}

export async function getTugasSiswa(kelasId: string, siswaId: string) {
  return prisma.tugas.findMany({
    where: { kelasId },
    include: { mapel: true, pengumpulan: { where: { siswaId } }, dibuatOleh: true },
    orderBy: { tenggat: "asc" },
  });
}

export async function getTugasSiswaDetail(tugasId: string, siswaId: string) {
  const tugas = await prisma.tugas.findUnique({
    where: { id: tugasId },
    include: { kelas: true, mapel: true },
  });
  if (!tugas) return null;
  const pengumpulan = await prisma.pengumpulanTugas.findUnique({
    where: { tugasId_siswaId: { tugasId, siswaId } },
  });
  return { tugas, pengumpulan };
}

// ---------- NILAI: BOBOT & PREDIKAT ----------

export async function getGradeScale(sekolahId: string) {
  return prisma.gradeScale.findMany({ where: { sekolahId }, orderBy: { urutan: "asc" } });
}

// ---------- KURIKULUM (dikelola superadmin, 1.20) ----------

export async function getSemuaKurikulum() {
  return prisma.kurikulum.findMany({
    include: { mapel: true, sekolahMemakai: { select: { id: true } } },
    orderBy: [{ jenjang: "asc" }, { nama: "asc" }],
  });
}

export async function getKurikulumDetail(id: string) {
  return prisma.kurikulum.findUnique({
    where: { id },
    include: { mapel: { orderBy: { nama: "asc" } }, dibuatOleh: true },
  });
}

export async function getKurikulumUntukJenjang(jenjang: string) {
  return prisma.kurikulum.findMany({ where: { jenjang }, orderBy: { nama: "asc" } });
}

/** KKM efektif (1.20) — pakai kkmUTS/kkmUAS kalau nilai itu berasal dari ujian ber-jenisPenilaian
 * UTS/UAS dan overridenya diisi (tak null); selain itu (mis. dari Tugas, atau ujian HARIAN) selalu
 * pakai `kkm` dasar mapel. */
export function resolveKkm(mapel: { kkm: number; kkmUTS: number | null; kkmUAS: number | null }, jenisPenilaian?: "HARIAN" | "UTS" | "UAS" | null) {
  if (jenisPenilaian === "UTS" && mapel.kkmUTS !== null) return mapel.kkmUTS;
  if (jenisPenilaian === "UAS" && mapel.kkmUAS !== null) return mapel.kkmUAS;
  return mapel.kkm;
}

export async function getSemuaMapel(sekolahId: string) {
  return prisma.mataPelajaran.findMany({
    where: { sekolahId },
    include: { bobot: true },
    orderBy: { nama: "asc" },
  });
}

export function hitungPredikat(skor: number, scale: { minSkor: number; maxSkor: number; label: string }[]) {
  const cocok = scale.find((s) => skor >= s.minSkor && skor <= s.maxSkor);
  return cocok?.label ?? "-";
}

// ---------- PERFORMA MURID (D-2) ----------

export async function getPerformaSiswa(siswaId: string, sekolahId?: string) {
  const siswa = await prisma.siswa.findFirst({ where: { id: siswaId, ...(sekolahId ? { sekolahId } : {}) }, include: { kelas: true } });
  if (!siswa) return null;

  const [nilai, absensi, pengumpulanTugas, tugasTotalKelas, ujianTotalKelas, ujianPengerjaan, gradeScale] = await Promise.all([
    prisma.nilai.findMany({ where: { siswaId }, include: { mapel: true }, orderBy: { createdAt: "asc" } }),
    prisma.absensi.findMany({ where: { siswaId } }),
    // "Tugas selesai" = sudah DIKUMPULKAN, bukan sudah DINILAI — jangan pakai `nilai !== null` di sini.
    prisma.pengumpulanTugas.findMany({ where: { siswaId } }),
    // Total tugas yang benar adalah semua tugas yang ditugaskan ke kelas ini (lintas mapel), bukan
    // cuma yang sudah ada baris pengumpulannya (itu justru sudah = pengumpulanTugas.length).
    prisma.tugas.count({ where: { kelasId: siswa.kelasId } }),
    // 1.21 — pola sama tugasTotalKelas, tapi hanya ujian PUBLISHED (draft belum "ditugaskan" sungguhan).
    prisma.ujianKelas.count({ where: { kelasId: siswa.kelasId, ujian: { status: "PUBLISHED" } } }),
    prisma.ujianPengerjaan.findMany({ where: { siswaId }, include: { ujian: { include: { mapel: true } } } }),
    getGradeScale(siswa.sekolahId),
  ]);

  const bobot = await ambilBobotMapel(Array.from(new Set(nilai.map((n) => n.mapelId))));

  const mapelSet = new Map<string, { nama: string; skor: number[]; nilaiBaris: { komponen: string; skor: number }[] }>();
  for (const n of nilai) {
    const cur = mapelSet.get(n.mapelId) ?? { nama: n.mapel.nama, skor: [], nilaiBaris: [] };
    cur.skor.push(n.skor);
    cur.nilaiBaris.push({ komponen: n.komponen, skor: n.skor });
    mapelSet.set(n.mapelId, cur);
  }
  const perMapel = Array.from(mapelSet.entries()).map(([mapelId, m]) => {
    // 1.21 — rata per mapel sekarang berbobot (bukan flat), pakai fungsi yang sama dgn rataKeseluruhan
    // biar konsisten; riwayat/tren tetap dari skor mentah kronologis (bukan yang perlu dibobot).
    const rata = rataDariNilaiPerMapel(m.nilaiBaris.map((r) => ({ mapelId, ...r })), bobot) ?? 0;
    const paruhAwal = m.skor.slice(0, Math.ceil(m.skor.length / 2));
    const paruhAkhir = m.skor.slice(Math.ceil(m.skor.length / 2));
    const rataAwal = paruhAwal.reduce((a, b) => a + b, 0) / (paruhAwal.length || 1);
    const rataAkhir = paruhAkhir.length ? paruhAkhir.reduce((a, b) => a + b, 0) / paruhAkhir.length : rataAwal;
    const tren = rataAkhir - rataAwal;
    return { nama: m.nama, rata: Math.round(rata * 10) / 10, tren, riwayat: m.skor };
  });

  const rataKeseluruhan = rataDariNilaiPerMapel(nilai, bobot);
  const predikat = rataKeseluruhan !== null ? hitungPredikat(rataKeseluruhan, gradeScale) : "-";

  const hadir = absensi.filter((a) => a.status === "HADIR").length;
  const persenHadir = absensi.length > 0 ? Math.round((hadir / absensi.length) * 100) : null;

  return {
    siswa,
    perMapel,
    rataKeseluruhan,
    predikat,
    persenHadir,
    totalAbsensi: absensi.length,
    tugasSelesai: pengumpulanTugas.length,
    tugasTotal: tugasTotalKelas,
    ujianSelesai: ujianPengerjaan.filter((u) => u.status === "SELESAI" || u.status === "AUTO_SUBMIT"),
    ujianTotal: ujianTotalKelas,
  };
}

// ---------- PENGAJUAN IZIN ----------

export async function getPengajuanIzinKelas(kelasId: string) {
  return prisma.pengajuanIzin.findMany({
    where: { siswa: { kelasId } },
    include: { siswa: true, diajukanOleh: true, disetujuiOleh: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPengajuanIzinOrtu(penggunaId: string) {
  return prisma.pengajuanIzin.findMany({
    where: { diajukanOlehId: penggunaId },
    include: { siswa: true, disetujuiOleh: true },
    orderBy: { createdAt: "desc" },
  });
}

// ---------- PESAN ----------

export async function getInboxPengguna(penggunaId: string) {
  return prisma.pesan.findMany({
    where: { OR: [{ pengirimId: penggunaId }, { penerimaId: penggunaId }], parentId: null },
    include: {
      pengirim: true,
      penerima: true,
      balasan: { include: { pengirim: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getKontakUntukPesan(session: { peran: string; userId: string; sekolahId: string }) {
  if (session.peran === "GURU") {
    const penugasan = await getKelasDiampu(session.userId);
    const kelasIds = Array.from(new Set(penugasan.map((p) => p.kelasId)));
    const wali = await prisma.waliSiswa.findMany({
      where: { siswa: { kelasId: { in: kelasIds } } },
      include: { pengguna: true, siswa: true },
    });
    const unik = new Map(wali.map((w) => [w.penggunaId, { id: w.penggunaId, nama: `${w.pengguna.nama} (wali ${w.siswa.nama})` }]));
    return Array.from(unik.values());
  }
  if (session.peran === "ORANG_TUA") {
    const anak = await getAnakDariOrtu(session.userId);
    const kelasIds = Array.from(new Set(anak.map((a) => a.kelasId)));
    const penugasan = await prisma.penugasanGuru.findMany({
      where: { kelasId: { in: kelasIds } },
      include: { guru: { include: { pengguna: true } }, kelas: true },
    });
    const unik = new Map(
      penugasan.map((p) => [p.guru.penggunaId, { id: p.guru.penggunaId, nama: `${p.guru.pengguna.nama} (${p.kelas.nama})` }])
    );
    return Array.from(unik.values());
  }
  return [];
}

// ---------- KINERJA GURU ----------

/** MG-5 (1.7) — `tahunAjaranId` opsional: default tahun ajaran aktif sekolah guru itu. */
export async function getKinerjaGuru(guruPenggunaId: string, tahunAjaranId?: string) {
  const guruProfil = await prisma.guruProfil.findUnique({ where: { penggunaId: guruPenggunaId } });
  const penugasan = guruProfil
    ? await prisma.penugasanGuru.findMany({
        where: {
          guruId: guruProfil.id,
          ...(tahunAjaranId ? { kelas: { tahunAjaranId } } : {}),
        },
        include: { kelas: true, mapel: true },
      })
    : [];
  const kelasIds = Array.from(new Set(penugasan.map((p) => p.kelasId)));
  // 1.9 — siswa dummy tahun historis sengaja aktif:false (lihat seed.ts); syarat aktif:true cuma
  // relevan kalau kita memang sedang lihat tahun ajaran yang AKTIF sekarang, bukan riwayat lampau.
  const tahunDilihatAktif = tahunAjaranId ? (await prisma.tahunAjaran.findUnique({ where: { id: tahunAjaranId } }))?.aktif ?? true : true;

  const [absensi, nilai, materi, tugas, ujian, catatan, siswaKelas] = await Promise.all([
    prisma.absensi.findMany({ where: { kelasId: { in: kelasIds } } }),
    prisma.nilai.count({ where: { kelasId: { in: kelasIds } } }),
    prisma.materiBelajar.count({ where: { penggunaId: guruPenggunaId, kelasId: { in: kelasIds } } }),
    prisma.tugas.findMany({ where: { penggunaId: guruPenggunaId, kelasId: { in: kelasIds } }, include: { pengumpulan: true } }),
    prisma.ujian.count({ where: { dibuatOlehId: guruPenggunaId, kelas: { some: { kelasId: { in: kelasIds } } } } }),
    prisma.catatanSupervisi.findMany({ where: { guruId: guruPenggunaId }, include: { kepsek: true }, orderBy: { createdAt: "desc" } }),
    prisma.siswa.findMany({ where: { kelasId: { in: kelasIds }, ...(tahunDilihatAktif ? { aktif: true } : {}) } }),
  ]);

  const hariAbsensiTerisi = new Set(absensi.map((a) => a.tanggal.toISOString().slice(0, 10))).size;
  const totalHadir = absensi.filter((a) => a.status === "HADIR").length;
  const persenKehadiranKelas = absensi.length > 0 ? Math.round((totalHadir / absensi.length) * 100) : null;

  const waktuKoreksi = tugas
    .flatMap((t) => t.pengumpulan.filter((p) => p.nilai !== null))
    .map((p) => (p.submitAt ? 1 : 0)); // simplifikasi: prototype tak simpan waktu koreksi presisi

  const kelasDiampuList = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());

  return {
    kelasDiampu: kelasIds.length,
    kelasDiampuList,
    jumlahSiswa: siswaKelas.length,
    hariAbsensiTerisi,
    persenKehadiranKelas,
    jumlahNilaiDiinput: nilai,
    jumlahMateriDiunggah: materi,
    jumlahTugasDibuat: tugas.length,
    jumlahUjianDibuat: ujian,
    tugasDinilai: waktuKoreksi.length,
    catatanSupervisi: catatan,
  };
}

/** 1.21 — catatan supervisi kepsek utk guru itu SENDIRI (dulu cuma kepsek yang bisa lihat lewat
 * getKinerjaGuru, guru tak pernah lihat catatan ttg dirinya sama sekali). */
export async function getCatatanSupervisiUntukGuru(guruPenggunaId: string) {
  return prisma.catatanSupervisi.findMany({
    where: { guruId: guruPenggunaId },
    include: { kepsek: true },
    orderBy: { createdAt: "desc" },
  });
}

/** MG-5 (1.6) — ringkasan & detail semua murid yang diajar satu guru, lintas kelas/mapel. */
export async function getMuridDiajarGuru(
  guruPenggunaId: string,
  penugasanPrefetched?: Awaited<ReturnType<typeof getKelasDiampu>>
) {
  // Perf — `getKelasDiampu` sendiri ~60ms (guru yg ngajar lintas banyak kelas); getDashboardGuru
  // sudah panggil itu duluan buat kebutuhan lain, jadi terima hasilnya lewat parameter opsional
  // di sini drpd query ulang persis sama 2x dalam satu render (dulu double-cost, gak ke-parallel-in
  // beneran krn better-sqlite3 blocking sync per panggilan meski dibungkus Promise.all).
  const penugasan = penugasanPrefetched ?? (await getKelasDiampu(guruPenggunaId));
  const kelasIds = Array.from(new Set(penugasan.map((p) => p.kelasId)));
  const mapelIds = Array.from(new Set(penugasan.map((p) => p.mapelId)));

  const siswaList = await prisma.siswa.findMany({
    where: { kelasId: { in: kelasIds }, aktif: true },
    include: { kelas: true },
    orderBy: [{ kelas: { nama: "asc" } }, { nama: "asc" }],
  });
  const siswaIds = siswaList.map((s) => s.id);

  // Perf — sebelumnya 2 query (nilai+absensi) PER murid di dalam Promise.all (N+1 nyata: guru yang
  // ngajar lintas 24 kelas/358 murid bisa jadi ~700 query sekuensial, dominasi waktu load dashboard
  // guru). Dibatch jadi 2 query total lalu dikelompokkan per siswaId di JS.
  const [bobot, semuaNilai, semuaAbsensi] = await Promise.all([
    ambilBobotMapel(mapelIds),
    prisma.nilai.findMany({ where: { siswaId: { in: siswaIds }, mapelId: { in: mapelIds } }, select: { siswaId: true, mapelId: true, komponen: true, skor: true } }),
    // `kelasId` diikutkan di select supaya bisa disaring per siswa ke kelasId TERKINI-nya sendiri
    // di bawah (siswa yang pernah pindah kelas bisa punya baris Absensi lama dgn kelasId beda —
    // filter per-siswa aslinya `kelasId: s.kelasId` justru buat exclude riwayat kelas lama itu).
    prisma.absensi.findMany({ where: { siswaId: { in: siswaIds }, kelasId: { in: kelasIds } }, select: { siswaId: true, kelasId: true, status: true } }),
  ]);
  const nilaiPerSiswa = new Map<string, { mapelId: string; komponen: string; skor: number }[]>();
  for (const n of semuaNilai) nilaiPerSiswa.set(n.siswaId, [...(nilaiPerSiswa.get(n.siswaId) ?? []), n]);
  const absensiPerSiswa = new Map<string, { kelasId: string; status: string }[]>();
  for (const a of semuaAbsensi) absensiPerSiswa.set(a.siswaId, [...(absensiPerSiswa.get(a.siswaId) ?? []), a]);

  const detail = siswaList.map((s) => {
    const nilai = nilaiPerSiswa.get(s.id) ?? [];
    const absensi = (absensiPerSiswa.get(s.id) ?? []).filter((a) => a.kelasId === s.kelasId);
    const rataNilai = rataDariNilaiPerMapel(nilai, bobot);
    const hadir = absensi.filter((a) => a.status === "HADIR").length;
    const persenHadir = absensi.length > 0 ? Math.round((hadir / absensi.length) * 100) : null;
    const perluPerhatian = (rataNilai !== null && rataNilai < 70) || (persenHadir !== null && persenHadir < 80);
    return { siswa: s, rataNilai, persenHadir, perluPerhatian };
  });

  const denganNilai = detail.filter((d) => d.rataNilai !== null);
  const rataRataKeseluruhan =
    denganNilai.length > 0 ? Math.round((denganNilai.reduce((s, d) => s + (d.rataNilai ?? 0), 0) / denganNilai.length) * 10) / 10 : null;

  return {
    totalMurid: detail.length,
    rataRataKeseluruhan,
    perluPerhatianCount: detail.filter((d) => d.perluPerhatian).length,
    detail,
  };
}

/** Menu Murid guru (1.6) — daftar tingkat kelas yang ada di sekolah, untuk selector ranking paralel. */
export async function getTingkatTersedia(sekolahId: string) {
  const rows = await prisma.kelas.findMany({
    where: { sekolahId },
    select: { tingkat: true },
    distinct: ["tingkat"],
    orderBy: { tingkat: "asc" },
  });
  return rows.map((r) => r.tingkat);
}

/** Ranking paralel satu tingkat kelas (mis. "Kelas 4 saja") lintas semua rombel di sekolah, dipaginasi 10 (1.6). */
export async function getRankingParalel(sekolahId: string, tingkat: number, halaman: number) {
  const [siswaList, bobot] = await Promise.all([
    prisma.siswa.findMany({
      where: { sekolahId, aktif: true, kelas: { tingkat } },
      include: { kelas: true, nilai: { select: { mapelId: true, komponen: true, skor: true } } },
    }),
    ambilBobotSekolah(sekolahId),
  ]);
  const withRata = siswaList
    .map((s) => ({ siswa: s, rata: rataDariNilaiPerMapel(s.nilai, bobot) }))
    .sort((a, b) => (b.rata ?? -1) - (a.rata ?? -1));

  const perHalaman = 10;
  const totalHalaman = Math.max(1, Math.ceil(withRata.length / perHalaman));
  const halamanAman = Math.min(totalHalaman, Math.max(1, halaman));
  const data = withRata.slice((halamanAman - 1) * perHalaman, halamanAman * perHalaman);
  return { data, total: withRata.length, totalHalaman, halaman: halamanAman };
}

/** Ranking siswa dalam SATU kelas berdasar rata-rata nilai — dipakai saat card kelas diklik (1.6). */
export async function getSiswaKelasDenganRanking(kelasId: string) {
  const siswaList = await prisma.siswa.findMany({
    where: { kelasId, aktif: true },
    include: { nilai: { select: { mapelId: true, komponen: true, skor: true } } },
    orderBy: { nama: "asc" },
  });
  const bobot = await ambilBobotMapel(Array.from(new Set(siswaList.flatMap((s) => s.nilai.map((n) => n.mapelId)))));
  return siswaList
    .map((s) => ({ siswa: s, rata: rataDariNilaiPerMapel(s.nilai, bobot) }))
    .sort((a, b) => (b.rata ?? -1) - (a.rata ?? -1));
}

/** Search bar nama murid di menu Murid guru (1.6) — dibatasi ke murid yang diajar guru itu. */
export async function cariMuridDiampuGuru(guruPenggunaId: string, q: string) {
  const perKelas = await getMuridDiampuGuru(guruPenggunaId);
  const ql = q.toLowerCase();
  return perKelas
    .flatMap(({ kelas, siswa }) => siswa.map((s) => ({ ...s, kelasNama: kelas.nama })))
    .filter((s) => s.nama.toLowerCase().includes(ql));
}

/** D-1 (1.6) — dashboard guru sebagai kumpulan data informatif dari seluruh data milik guru itu. */
export async function getDashboardGuru(penggunaId: string, sekolahId: string) {
  // Perf — `penugasan` diambil duluan (bukan lewat Promise.all bareng muridDiajar) supaya bisa
  // dioper ke getMuridDiajarGuru sbg prefetch, drpd dia query getKelasDiampu lagi dari nol — dulu
  // dipanggil 2x per render dashboard ini (sekali di sini, sekali lagi di dalam
  // getMuridDiajarGuru); Promise.all gak nolong hilangin double-cost itu krn better-sqlite3
  // sinkron/blocking per panggilan, "paralel" di level Promise gak berarti paralel beneran di DB.
  const [penugasan, guruProfil] = await Promise.all([
    getKelasDiampu(penggunaId),
    prisma.guruProfil.findUnique({ where: { penggunaId } }),
  ]);
  const [tahunAktif, tugasList, esaiPerlu, muridDiajar] = await Promise.all([
    getTahunAjaranAktif(sekolahId),
    getTugasByGuru(penggunaId),
    getEsaiPerluDinilai(penggunaId),
    getMuridDiajarGuru(penggunaId, penugasan),
  ]);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());

  const today = new Date();
  const hariIni = today.getDay() === 0 ? 7 : today.getDay();
  const jadwalHariIni =
    guruProfil && tahunAktif
      ? (await getJadwalGuru(guruProfil.id, tahunAktif.id)).filter((e) => e.hari === hariIni).sort((a, b) => a.jamMulai.localeCompare(b.jamMulai))
      : [];

  const tugasBelumDinilai = tugasList.reduce((sum, t) => sum + t.pengumpulan.filter((p) => p.nilai === null).length, 0);

  const tanggalOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const besok = new Date(tanggalOnly);
  besok.setUTCDate(besok.getUTCDate() + 1);
  const kelasIds = kelasUnik.map((k) => k.id);
  const absensiHariIni = kelasIds.length
    ? await prisma.absensi.findMany({ where: { kelasId: { in: kelasIds }, tanggal: { gte: tanggalOnly, lt: besok } } })
    : [];
  const hadir = absensiHariIni.filter((a) => a.status === "HADIR").length;
  const persenHadirHariIni = absensiHariIni.length > 0 ? Math.round((hadir / absensiHariIni.length) * 100) : null;

  return {
    jumlahKelas: kelasUnik.length,
    jumlahMurid: muridDiajar.totalMurid,
    jadwalHariIni,
    tugasBelumDinilai,
    esaiPerluDinilai: esaiPerlu.length,
    persenHadirHariIni,
    penugasan,
  };
}

// ---------- CONSENT PDP ----------

export async function getConsentPDP(penggunaId: string) {
  return prisma.consentPDP.findUnique({ where: { penggunaId } });
}

// ---------- PPDB ----------

export async function getPPDBList(sekolahId: string) {
  return prisma.pPDBPendaftar.findMany({ where: { sekolahId }, orderBy: { createdAt: "desc" } });
}

// ---------- SUPERADMIN (platform, lintas sekolah) ----------

export async function getSuperadminOverview() {
  const [totalSekolah, sekolahAktif, totalPengguna, totalSiswa] = await Promise.all([
    prisma.sekolah.count(),
    prisma.sekolah.count({ where: { aktif: true } }),
    prisma.pengguna.count({ where: { peran: { not: "SUPERADMIN" } } }),
    prisma.siswa.count({ where: { aktif: true } }),
  ]);
  return { totalSekolah, sekolahAktif, totalPengguna, totalSiswa };
}

export async function getSemuaSekolahDenganStats() {
  const semuaSekolah = await prisma.sekolah.findMany({ orderBy: { createdAt: "desc" } });
  return Promise.all(
    semuaSekolah.map(async (s) => {
      const [siswa, guru, kelas, tahunAktif] = await Promise.all([
        prisma.siswa.count({ where: { sekolahId: s.id, aktif: true } }),
        prisma.pengguna.count({ where: { sekolahId: s.id, peran: "GURU" } }),
        prisma.kelas.count({ where: { sekolahId: s.id } }),
        getTahunAjaranAktif(s.id),
      ]);
      return { sekolah: s, siswa, guru, kelas, tahunAktif };
    })
  );
}

const NAMA_BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** 1.21 — revenue platform (SaaS): pendapatan Selaras Ajar SENDIRI dari biaya langganan tiap
 * sekolah tenant — beda dari getRingkasanKeuangan (itu SPP/tagihan sekolah ke SISWA-nya). */
export async function getRevenuePlatform() {
  const [langgananList, pembayaranList] = await Promise.all([
    prisma.langganan.findMany({ include: { sekolah: true } }),
    prisma.pembayaranLangganan.findMany({ include: { langganan: { include: { sekolah: true } } } }),
  ]);

  const aktifList = langgananList.filter((l) => l.status === "AKTIF");
  const mrrTotal = aktifList.reduce((s, l) => s + l.hargaPerBulan, 0);

  const perPaket = (["BASIC", "PRO", "ENTERPRISE"] as const).map((paket) => {
    const list = aktifList.filter((l) => l.paket === paket);
    return { paket, jumlahSekolah: list.length, mrr: list.reduce((s, l) => s + l.hargaPerBulan, 0) };
  });

  // Tren 6 bulan terakhir — label periode dibangun dari tanggal (bukan parse string bebas),
  // supaya urutannya pasti kronologis apa pun urutan baris PembayaranLangganan di DB.
  const now = new Date();
  const tren = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = `${NAMA_BULAN_INDO[d.getMonth()]} ${d.getFullYear()}`;
    const total = pembayaranList
      .filter((p) => p.periode === label && p.status === "LUNAS")
      .reduce((s, p) => s + p.nominal, 0);
    return { periode: label, total };
  });

  const labelBulanIni = `${NAMA_BULAN_INDO[now.getMonth()]} ${now.getFullYear()}`;
  const sekolahNunggak = aktifList
    .map((l) => {
      const bayarBulanIni = pembayaranList.find((p) => p.langgananId === l.id && p.periode === labelBulanIni);
      return { langganan: l, statusBulanIni: bayarBulanIni?.status ?? "BELUM_BAYAR" };
    })
    .filter((x) => x.statusBulanIni !== "LUNAS");

  return { mrrTotal, perPaket, tren, sekolahNunggak, totalLangganan: langgananList.length, totalAktif: aktifList.length };
}

export async function getSekolahDetail(sekolahId: string) {
  const sekolah = await prisma.sekolah.findUnique({ where: { id: sekolahId } });
  if (!sekolah) return null;
  const [pengguna, siswa, kelas, tahunAjaran] = await Promise.all([
    prisma.pengguna.findMany({ where: { sekolahId }, orderBy: [{ peran: "asc" }, { nama: "asc" }] }),
    prisma.siswa.count({ where: { sekolahId, aktif: true } }),
    prisma.kelas.count({ where: { sekolahId } }),
    prisma.tahunAjaran.findMany({ where: { sekolahId }, orderBy: { mulai: "desc" } }),
  ]);
  return { sekolah, pengguna, siswa, kelas, tahunAjaran };
}

// ---------- AGENDA AKADEMIK ----------

export async function getAgendaAkademik(sekolahId: string) {
  return prisma.agendaAkademik.findMany({ where: { sekolahId }, orderBy: { tanggal: "asc" } });
}

// ---------- SISWA 360°: CATATAN GURU (§4.18) & PRESTASI (F-16) ----------

/**
 * CG-2: visibilitas catatan guru — penulis sendiri, wali kelas siswa itu, kepala sekolah,
 * dan orang tua (agregat lintas guru, dipanggil terpisah lewat getCatatanSiswaUntukOrtu).
 * Murid TIDAK PERNAH melihat ini, guru lain (bukan penulis/bukan wali kelas) juga tidak.
 */
export async function getCatatanSiswaVisibleTo(
  siswaId: string,
  viewer: { penggunaId: string; peran: string; isWaliKelasSiswa: boolean }
) {
  if (viewer.peran === "MURID") return [];
  const semua = await prisma.catatanSiswa.findMany({
    where: { siswaId },
    include: { penulis: true },
    orderBy: { createdAt: "desc" },
  });
  if (viewer.peran === "KEPALA_SEKOLAH" || viewer.peran === "ORANG_TUA" || viewer.isWaliKelasSiswa) {
    return semua;
  }
  // guru mapel biasa: hanya catatan yang ia tulis sendiri
  return semua.filter((c) => c.penggunaId === viewer.penggunaId);
}

export async function getPrestasiSiswa(siswaId: string) {
  return prisma.prestasiSiswa.findMany({
    where: { siswaId },
    include: { dicatatOleh: true },
    orderBy: { tanggal: "desc" },
  });
}

/** F-15: guru boleh lihat kontak ortu murid yang diajarnya. */
export async function getKontakOrtuSiswa(siswaId: string) {
  return prisma.waliSiswa.findMany({ where: { siswaId }, include: { pengguna: true } });
}

/** F-15/F-17: profil siswa 360° — data dasar + kontak ortu + performa + tagihan + prestasi. */
export async function getProfilSiswa360(siswaId: string, sekolahId: string) {
  const siswa = await prisma.siswa.findFirst({ where: { id: siswaId, sekolahId }, include: { kelas: true } });
  if (!siswa) return null;
  const [wali, performa, tagihan, prestasi] = await Promise.all([
    getKontakOrtuSiswa(siswaId),
    getPerformaSiswa(siswaId),
    prisma.tagihan.findMany({ where: { siswaId }, include: { tipe: true }, orderBy: { jatuhTempo: "desc" } }),
    getPrestasiSiswa(siswaId),
  ]);
  return { siswa, wali, performa, tagihan, prestasi };
}

// ---------- JADWAL PELAJARAN (§4.14) — direvisi 1.6: jam bebas per guru, tanpa slot baku ----------

export async function getJadwalKelas(kelasId: string, tahunAjaranId: string) {
  return prisma.jadwalEntry.findMany({
    where: { kelasId, tahunAjaranId },
    include: { mapel: true, guru: { include: { pengguna: true } } },
    orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
  });
}

export async function getJadwalGuru(guruId: string, tahunAjaranId: string) {
  return prisma.jadwalEntry.findMany({
    where: { guruId, tahunAjaranId },
    include: { mapel: true, kelas: true },
    orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
  });
}

/**
 * JP-3 (direvisi 1.6): deteksi bentrok berbasis overlap rentang waktu — tak ada lagi unique
 * constraint slot-index di DB, jadi dicek di aplikasi sebelum insert. Dua entri bentrok kalau
 * hari sama, (guru sama ATAU kelas sama), dan rentang [jamMulai, jamSelesai) beririsan.
 * Mengembalikan entri yang bentrok (untuk pesan error), atau null kalau aman.
 */
export async function cekBentrokJadwal(params: {
  kelasId: string;
  guruId: string;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  tahunAjaranId: string;
  kecualiEntryId?: string;
}) {
  const kandidat = await prisma.jadwalEntry.findMany({
    where: {
      tahunAjaranId: params.tahunAjaranId,
      hari: params.hari,
      OR: [{ kelasId: params.kelasId }, { guruId: params.guruId }],
      ...(params.kecualiEntryId ? { id: { not: params.kecualiEntryId } } : {}),
    },
    include: { mapel: true, kelas: true, guru: { include: { pengguna: true } } },
  });
  const overlap = kandidat.find((e) => e.jamMulai < params.jamSelesai && params.jamMulai < e.jamSelesai);
  return overlap ?? null;
}

// ---------- PRESENSI GURU MENGAJAR (§4.15) ----------

/** AG-1: dipanggil dari api/absensi setelah wali kelas submit absensi harian kelasnya. */
export async function tandaiPresensiGuruOtomatis(kelasId: string, tanggal: Date, penggunaId: string) {
  const guruProfil = await prisma.guruProfil.findUnique({ where: { penggunaId } });
  if (!guruProfil) return;
  const hari = tanggal.getDay() === 0 ? 7 : tanggal.getDay(); // 1=Senin..7=Minggu, kita pakai 1-6
  if (hari > 6) return;
  const entries = await prisma.jadwalEntry.findMany({ where: { kelasId, guruId: guruProfil.id, hari } });
  const tanggalOnly = new Date(Date.UTC(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate()));
  for (const entry of entries) {
    await prisma.presensiGuru.upsert({
      where: { jadwalEntryId_tanggal: { jadwalEntryId: entry.id, tanggal: tanggalOnly } },
      update: {},
      create: { jadwalEntryId: entry.id, tanggal: tanggalOnly, hadir: true, sumber: "OTOMATIS_ABSENSI" },
    });
  }
}

export async function getRekapPresensiGuru(guruId: string, tahunAjaranId: string) {
  const entries = await prisma.jadwalEntry.findMany({
    where: { guruId, tahunAjaranId },
    include: { presensi: true, mapel: true, kelas: true },
  });
  const totalSesiTerjadwal = entries.length;
  const totalHadir = entries.reduce((sum, e) => sum + e.presensi.filter((p) => p.hadir).length, 0);
  return { entries, totalSesiTerjadwal, totalHadir };
}

/** AG-4: sesi hari ini yang jamnya sudah lewat tapi belum tercatat hadir/berhalangan. */
export async function getSesiBelumTerisiHariIni(sekolahId: string) {
  const now = new Date();
  const hari = now.getDay() === 0 ? 7 : now.getDay();
  if (hari > 6) return [];
  const tahunAktif = await getTahunAjaranAktif(sekolahId);
  if (!tahunAktif) return [];
  const jamSekarang = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const tanggalOnly = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const entries = await prisma.jadwalEntry.findMany({
    where: { hari, tahunAjaranId: tahunAktif.id, kelas: { sekolahId }, jamSelesai: { lt: jamSekarang } },
    include: { mapel: true, kelas: true, guru: { include: { pengguna: true } }, presensi: { where: { tanggal: tanggalOnly } } },
  });
  return entries.filter((e) => e.presensi.length === 0);
}

// ---------- RPP & CAPAIAN PEMBELAJARAN (§4.16) ----------

export async function getCapaianBank(sekolahId: string, mapelId?: string) {
  return prisma.capaianPembelajaran.findMany({
    where: { sekolahId, ...(mapelId ? { mapelId } : {}) },
    include: { mapel: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRPPByGuru(penggunaId: string) {
  return prisma.rPP.findMany({
    where: { penggunaId },
    include: { kelas: true, mapel: true, capaianTerkait: { include: { capaian: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRPPDetail(id: string, sekolahId?: string) {
  return prisma.rPP.findFirst({
    where: { id, ...(sekolahId ? { kelas: { sekolahId } } : {}) },
    include: {
      kelas: true,
      mapel: true,
      capaianTerkait: { include: { capaian: true } },
      materiTerkait: true,
      tugasTerkait: true,
      ujianTerkait: true,
    },
  });
}

/** RPP-5: matrix guru × mapel/kelas yang diampu × status ada-RPP-periode-ini. */
export async function getKelengkapanRPP(sekolahId: string, hanyaGuruId?: string) {
  const tahunAktif = await getTahunAjaranAktif(sekolahId);
  if (!tahunAktif) return [];
  const penugasan = await prisma.penugasanGuru.findMany({
    where: { kelas: { sekolahId, tahunAjaranId: tahunAktif.id }, ...(hanyaGuruId ? { guruId: hanyaGuruId } : {}) },
    include: { guru: { include: { pengguna: true } }, kelas: true, mapel: true },
  });
  const rppList = await prisma.rPP.findMany({ where: { tahunAjaranId: tahunAktif.id } });
  const rppSet = new Set(rppList.map((r) => `${r.penggunaId}:${r.kelasId}:${r.mapelId}`));

  return penugasan.map((p) => ({
    guru: p.guru.pengguna,
    kelas: p.kelas,
    mapel: p.mapel,
    adaRPP: rppSet.has(`${p.guru.penggunaId}:${p.kelasId}:${p.mapelId}`),
  }));
}

// ---------- DISKUSI & TANYA JAWAB (§4.17) ----------

export async function getKomentar(target: { materiId?: string; tugasId?: string }) {
  const komentarTeratas = await prisma.komentarKonten.findMany({
    where: { ...target, parentId: null },
    include: {
      penulis: true,
      balasan: { include: { penulis: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return komentarTeratas;
}

/** 1.23 — Tanya Jawab Kelas: thread per kelas+mapel, terpisah dari getKomentar/Diskusi di atas. */
export async function getTanyaJawabKelas(kelasId: string, mapelId: string) {
  return prisma.tanyaJawabKelas.findMany({
    where: { kelasId, mapelId, parentId: null },
    include: {
      pengguna: true,
      balasan: { include: { pengguna: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------- ASESMEN LANJUTAN (§4.9 N-5, N-6) ----------

export async function getCatatanAsesmen(siswaId: string) {
  return prisma.catatanAsesmen.findMany({
    where: { siswaId },
    include: { mapel: true, guru: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjekList(sekolahId: string) {
  return prisma.projek.findMany({ where: { sekolahId }, include: { dibuatOleh: true }, orderBy: { createdAt: "desc" } });
}

export async function getProjekDetail(id: string, sekolahId?: string) {
  const projek = await prisma.projek.findFirst({ where: { id, ...(sekolahId ? { sekolahId } : {}) }, include: { penilaian: { include: { siswa: true } } } });
  return projek;
}

export async function getProjekSiswa(siswaId: string) {
  return prisma.projekPenilaian.findMany({ where: { siswaId }, include: { projek: true } });
}

// ---------- REMINDER PROAKTIF GURU (X-7, versi in-app tanpa cron) ----------

export async function getRemindersGuru(guruPenggunaId: string) {
  const reminders: { pesan: string; href: string }[] = [];

  const tugasBelumDinilai = await prisma.tugas.findMany({
    where: { penggunaId: guruPenggunaId, pengumpulan: { some: { nilai: null } } },
    include: { pengumpulan: { where: { nilai: null }, select: { submitAt: true } } },
  });
  for (const t of tugasBelumDinilai) {
    const belumDinilai = t.pengumpulan;
    const lamaHari = Math.floor((Date.now() - Math.min(...belumDinilai.map((p) => p.submitAt.getTime()))) / 86400000);
    if (lamaHari > 5) {
      reminders.push({
        pesan: `Tugas "${t.judul}": ${belumDinilai.length} pengumpulan sudah >${lamaHari} hari belum dinilai.`,
        href: `/guru/tugas/${t.id}`,
      });
    }
  }

  // Perf — sebelumnya `include: pengerjaan.jawaban.soal` nested-deep di SEMUA ujian PUBLISHED guru
  // ini, buat cuma nyari "ada gak jawaban non-PG yg skor-nya masih null" (existence check). Utk
  // guru yang produktif bikin ujian (mis. ngajar lintas 24 kelas), itu bisa narik puluhan ribu baris
  // UjianJawaban+Soal ke memori sia-sia. Diganti query langsung ke UjianJawaban dgn WHERE yg identik
  // filternya, DB yang nyaring — hasilnya cuma baris yang beneran belum dinilai.
  const jawabanPerluDinilai = await prisma.ujianJawaban.findMany({
    where: {
      skor: null,
      soal: { jenis: { not: "PILIHAN_GANDA" } },
      pengerjaan: {
        status: { not: "BELUM_MULAI" },
        ujian: { dibuatOlehId: guruPenggunaId, status: "PUBLISHED" },
      },
    },
    select: { pengerjaan: { select: { ujianId: true, ujian: { select: { judul: true } } } } },
  });
  const ujianPerluDinilai = new Map<string, string>();
  for (const j of jawabanPerluDinilai) ujianPerluDinilai.set(j.pengerjaan.ujianId, j.pengerjaan.ujian.judul);
  for (const [ujianId, judul] of ujianPerluDinilai) {
    reminders.push({ pesan: `Ujian "${judul}" punya jawaban esai/singkat yang belum dinilai.`, href: `/guru/ujian/${ujianId}/nilai-esai` });
  }

  const kelengkapanRPP = await prisma.pengguna.findUnique({ where: { id: guruPenggunaId } });
  if (kelengkapanRPP?.sekolahId) {
    const matrix = await getKelengkapanRPP(kelengkapanRPP.sekolahId, undefined);
    const belumRPP = matrix.filter((m) => m.guru.id === guruPenggunaId && !m.adaRPP);
    if (belumRPP.length > 0) {
      reminders.push({
        pesan: `RPP belum dibuat untuk ${belumRPP.length} kelas/mapel yang diampu.`,
        href: `/guru/rpp`,
      });
    }
  }

  return reminders;
}

// ---------- BACKUP DATA MANDIRI (K-9) ----------

export async function getBackupData(sekolahId: string) {
  const [siswa, guru, kelas, mapel, absensi, nilai, tagihan, ujian, tugas] = await Promise.all([
    prisma.siswa.findMany({ where: { sekolahId } }),
    prisma.pengguna.findMany({ where: { sekolahId, peran: "GURU" } }),
    prisma.kelas.findMany({ where: { sekolahId } }),
    prisma.mataPelajaran.findMany({ where: { sekolahId } }),
    prisma.absensi.findMany({ where: { siswa: { sekolahId } } }),
    prisma.nilai.findMany({ where: { siswa: { sekolahId } } }),
    prisma.tagihan.findMany({ where: { siswa: { sekolahId } } }),
    prisma.ujian.findMany({ where: { kelas: { some: { kelas: { sekolahId } } } } }),
    prisma.tugas.findMany({ where: { kelas: { sekolahId } } }),
  ]);
  return { diekspor: new Date().toISOString(), siswa, guru, kelas, mapel, absensi, nilai, tagihan, ujian, tugas };
}

// ---------- API KEY (1.12) ----------

export async function getApiKeysSekolah(sekolahId: string) {
  return prisma.apiKey.findMany({
    where: { sekolahId },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
  });
}
