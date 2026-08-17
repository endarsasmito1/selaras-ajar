import { prisma } from "@/lib/prisma";

export async function getTahunAjaranAktif(sekolahId: string) {
  return prisma.tahunAjaran.findFirst({ where: { sekolahId, aktif: true } });
}

// ---------- KEPALA SEKOLAH ----------

export async function getRingkasanSekolah(sekolahId: string) {
  const [totalSiswa, totalKelas, tahunAjaran] = await Promise.all([
    prisma.siswa.count({ where: { sekolahId, aktif: true } }),
    prisma.kelas.count({ where: { sekolahId } }),
    getTahunAjaranAktif(sekolahId),
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

  const tagihanBulanIni = await prisma.tagihan.findMany({
    where: { siswa: { sekolahId }, periode: "Agustus 2026" },
  });
  const terkumpul = tagihanBulanIni
    .filter((t) => t.status === "LUNAS" || t.status === "CICILAN")
    .reduce((sum, t) => sum + t.nominal, 0);
  const tunggakan = tagihanBulanIni.filter((t) => t.status === "BELUM_BAYAR");

  return {
    totalSiswa,
    totalKelas,
    tahunAjaran,
    persenHadir,
    terkumpul,
    tunggakanCount: tunggakan.length,
    tunggakanTotal: tunggakan.reduce((sum, t) => sum + t.nominal, 0),
  };
}

export async function getDaftarSiswa(sekolahId: string) {
  return prisma.siswa.findMany({
    where: { sekolahId },
    include: { kelas: true, wali: { include: { pengguna: true } } },
    orderBy: [{ kelas: { nama: "asc" } }, { nama: "asc" }],
  });
}

export async function getSemuaKelas(sekolahId: string) {
  const tahunAktif = await getTahunAjaranAktif(sekolahId);
  return prisma.kelas.findMany({
    where: { sekolahId, tahunAjaranId: tahunAktif?.id },
    orderBy: { nama: "asc" },
  });
}

export async function getDaftarGuru(sekolahId: string) {
  return prisma.pengguna.findMany({
    where: { sekolahId, peran: "GURU" },
    include: {
      guruProfil: {
        include: { penugasan: { include: { kelas: true, mapel: true } } },
      },
      waliKelasDi: true,
    },
    orderBy: { nama: "asc" },
  });
}

export async function getDaftarTahunAjaran(sekolahId: string) {
  return prisma.tahunAjaran.findMany({
    where: { sekolahId },
    include: { _count: { select: { kelas: true } } },
    orderBy: { mulai: "desc" },
  });
}

// ---------- BENDAHARA / KEUANGAN ----------

export async function getRingkasanKeuangan(sekolahId: string, periode: string) {
  const tagihan = await prisma.tagihan.findMany({
    where: { siswa: { sekolahId }, periode },
    include: { siswa: { include: { kelas: true } }, tipe: true },
    orderBy: [{ siswa: { kelas: { nama: "asc" } } }, { siswa: { nama: "asc" } }],
  });

  const terkumpul = tagihan
    .filter((t) => t.status !== "BELUM_BAYAR")
    .reduce((sum, t) => sum + t.nominal, 0);
  const target = tagihan.reduce((sum, t) => sum + t.nominal, 0);
  const belumBayar = tagihan.filter((t) => t.status === "BELUM_BAYAR");

  return { tagihan, terkumpul, target, belumBayarCount: belumBayar.length };
}

// ---------- GURU ----------

export async function getKelasDiampu(penggunaId: string) {
  const guru = await prisma.guruProfil.findUnique({
    where: { penggunaId },
    include: { penugasan: { include: { kelas: true, mapel: true } } },
  });
  return guru?.penugasan ?? [];
}

export async function getSiswaKelas(kelasId: string) {
  return prisma.siswa.findMany({ where: { kelasId, aktif: true }, orderBy: { nama: "asc" } });
}

export async function getAbsensiHariIni(kelasId: string) {
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  const besok = new Date(hariIni);
  besok.setDate(besok.getDate() + 1);
  const rows = await prisma.absensi.findMany({
    where: { kelasId, tanggal: { gte: hariIni, lt: besok } },
  });
  const map = new Map(rows.map((r) => [r.siswaId, r.status]));
  return map;
}

export async function getNilaiKelasMapel(kelasId: string, mapelId: string) {
  return prisma.nilai.findMany({
    where: { kelasId, mapelId },
    include: { siswa: true },
    orderBy: [{ siswa: { nama: "asc" } }, { createdAt: "desc" }],
  });
}

export async function getMateriKelas(kelasId: string) {
  return prisma.materiBelajar.findMany({
    where: { kelasId },
    include: { mapel: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTugasKelas(kelasId: string) {
  return prisma.tugas.findMany({
    where: { kelasId },
    include: { mapel: true, pengumpulan: true },
    orderBy: { tenggat: "desc" },
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

// ---------- UJIAN / CBT — BANK SOAL ----------

export async function getBankSoal(sekolahId: string, mapelId?: string) {
  return prisma.soal.findMany({
    where: { sekolahId, ...(mapelId ? { mapelId } : {}) },
    include: { mapel: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSoalById(soalId: string) {
  return prisma.soal.findUnique({ where: { id: soalId } });
}

// ---------- UJIAN / CBT — GURU ----------

export async function getUjianByGuru(guruPenggunaId: string) {
  return prisma.ujian.findMany({
    where: { dibuatOlehId: guruPenggunaId },
    include: {
      kelas: true,
      mapel: true,
      soal: true,
      pengerjaan: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUjianDetail(ujianId: string) {
  return prisma.ujian.findUnique({
    where: { id: ujianId },
    include: {
      kelas: true,
      mapel: true,
      soal: { include: { soal: true }, orderBy: { urutan: "asc" } },
      pengerjaan: {
        include: { siswa: true, jawaban: true },
        orderBy: { siswa: { nama: "asc" } },
      },
    },
  });
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
  const daftarUjian = await prisma.ujian.findMany({
    where: { kelasId, status: "PUBLISHED" },
    include: {
      mapel: true,
      soal: true,
      pengerjaan: { where: { siswaId } },
    },
    orderBy: { createdAt: "desc" },
  });
  return daftarUjian;
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

export async function getTugasDetail(tugasId: string) {
  const tugas = await prisma.tugas.findUnique({
    where: { id: tugasId },
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

export async function getPerformaSiswa(siswaId: string) {
  const siswa = await prisma.siswa.findUnique({ where: { id: siswaId }, include: { kelas: true } });
  if (!siswa) return null;

  const [nilai, absensi, tugas, ujianPengerjaan, gradeScale] = await Promise.all([
    prisma.nilai.findMany({ where: { siswaId }, include: { mapel: true }, orderBy: { createdAt: "asc" } }),
    prisma.absensi.findMany({ where: { siswaId } }),
    prisma.pengumpulanTugas.findMany({ where: { siswaId }, include: { tugas: { include: { mapel: true } } } }),
    prisma.ujianPengerjaan.findMany({ where: { siswaId }, include: { ujian: { include: { mapel: true } } } }),
    getGradeScale(siswa.sekolahId),
  ]);

  const mapelSet = new Map<string, { nama: string; skor: number[] }>();
  for (const n of nilai) {
    const cur = mapelSet.get(n.mapelId) ?? { nama: n.mapel.nama, skor: [] };
    cur.skor.push(n.skor);
    mapelSet.set(n.mapelId, cur);
  }
  const perMapel = Array.from(mapelSet.values()).map((m) => {
    const rata = m.skor.reduce((a, b) => a + b, 0) / m.skor.length;
    const paruhAwal = m.skor.slice(0, Math.ceil(m.skor.length / 2));
    const paruhAkhir = m.skor.slice(Math.ceil(m.skor.length / 2));
    const rataAwal = paruhAwal.reduce((a, b) => a + b, 0) / (paruhAwal.length || 1);
    const rataAkhir = paruhAkhir.length ? paruhAkhir.reduce((a, b) => a + b, 0) / paruhAkhir.length : rataAwal;
    const tren = rataAkhir - rataAwal;
    return { nama: m.nama, rata: Math.round(rata * 10) / 10, tren, riwayat: m.skor };
  });

  const rataKeseluruhan =
    nilai.length > 0 ? Math.round((nilai.reduce((a, b) => a + b.skor, 0) / nilai.length) * 10) / 10 : null;
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
    tugasSelesai: tugas.filter((t) => t.nilai !== null).length,
    tugasTotal: tugas.length,
    ujianSelesai: ujianPengerjaan.filter((u) => u.status === "SELESAI" || u.status === "AUTO_SUBMIT"),
  };
}

// ---------- TRANSPARANSI DANA ----------

export async function getDanaAlokasi(sekolahId: string) {
  const data = await prisma.danaAlokasi.findMany({ where: { sekolahId }, orderBy: { urutan: "asc" } });
  const total = data.reduce((s, d) => s + d.nominal, 0);
  return { data, total };
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

export async function getKinerjaGuru(guruPenggunaId: string) {
  const penugasan = await getKelasDiampu(guruPenggunaId);
  const kelasIds = Array.from(new Set(penugasan.map((p) => p.kelasId)));

  const [absensi, nilai, materi, tugas, ujian, catatan, siswaKelas] = await Promise.all([
    prisma.absensi.findMany({ where: { kelasId: { in: kelasIds } } }),
    prisma.nilai.count({ where: { kelasId: { in: kelasIds } } }),
    prisma.materiBelajar.count({ where: { penggunaId: guruPenggunaId } }),
    prisma.tugas.findMany({ where: { penggunaId: guruPenggunaId }, include: { pengumpulan: true } }),
    prisma.ujian.count({ where: { dibuatOlehId: guruPenggunaId } }),
    prisma.catatanSupervisi.findMany({ where: { guruId: guruPenggunaId }, include: { kepsek: true }, orderBy: { createdAt: "desc" } }),
    prisma.siswa.findMany({ where: { kelasId: { in: kelasIds }, aktif: true } }),
  ]);

  const hariAbsensiTerisi = new Set(absensi.map((a) => a.tanggal.toISOString().slice(0, 10))).size;
  const totalHadir = absensi.filter((a) => a.status === "HADIR").length;
  const persenKehadiranKelas = absensi.length > 0 ? Math.round((totalHadir / absensi.length) * 100) : null;

  const waktuKoreksi = tugas
    .flatMap((t) => t.pengumpulan.filter((p) => p.nilai !== null))
    .map((p) => (p.submitAt ? 1 : 0)); // simplifikasi: prototype tak simpan waktu koreksi presisi

  return {
    kelasDiampu: kelasIds.length,
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

// ---------- CONSENT PDP ----------

export async function getConsentPDP(penggunaId: string) {
  return prisma.consentPDP.findUnique({ where: { penggunaId } });
}

// ---------- MANAJEMEN PENGGUNA ----------

export async function getSemuaPengguna(sekolahId: string) {
  return prisma.pengguna.findMany({ where: { sekolahId }, orderBy: [{ peran: "asc" }, { nama: "asc" }] });
}

// ---------- PPDB ----------

export async function getPPDBList(sekolahId: string) {
  return prisma.pPDBPendaftar.findMany({ where: { sekolahId }, orderBy: { createdAt: "desc" } });
}

// ---------- AGENDA AKADEMIK ----------

export async function getAgendaAkademik(sekolahId: string) {
  return prisma.agendaAkademik.findMany({ where: { sekolahId }, orderBy: { tanggal: "asc" } });
}
