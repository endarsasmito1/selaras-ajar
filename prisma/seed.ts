import { PrismaClient, StatusAbsensi, StatusTagihan } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "selaras123";

function acak<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const KOMPONEN_DARI_JENIS_PENILAIAN: Record<string, string> = {
  HARIAN: "Ulangan Harian",
  UTS: "UTS",
  UAS: "UAS",
};

/**
 * 1.21, diperbaiki (ditemukan saat testing) — sebelumnya Nilai rapor cuma 1 baris sintetis acak
 * per siswa per mapel ("UH 1 - X"/"Tugas 1 - X"), sama sekali tak mencerminkan UjianPengerjaan
 * sungguhan yang sudah dibuat (rata-rata yang tampil ke murid/ortu/guru pada dasarnya angka
 * acak, bukan derivasi hasil ujian nyata). Sekarang Nilai DIDERIVASI dari data asli: tiap
 * UjianPengerjaan selesai jadi 1 baris (komponen dari Ujian.jenisPenilaian), tiap PengumpulanTugas
 * yang sudah dinilai jadi 1 baris (komponen "Tugas") — dipanggil SETELAH ujian & tugas sekolah
 * itu selesai dibuat, supaya semua sumbernya sudah ada.
 */
async function generateNilaiDariHasilAsli(sekolahId: string) {
  const pengerjaanSelesai = await prisma.ujianPengerjaan.findMany({
    where: { status: { in: ["SELESAI", "AUTO_SUBMIT"] }, nilaiTotal: { not: null }, siswa: { sekolahId } },
    include: { ujian: true, siswa: true },
  });
  for (const p of pengerjaanSelesai) {
    const komponen = KOMPONEN_DARI_JENIS_PENILAIAN[p.ujian.jenisPenilaian] ?? "Ulangan Harian";
    await prisma.nilai.upsert({
      where: {
        siswaId_kelasId_mapelId_komponen_judul: {
          siswaId: p.siswaId, kelasId: p.siswa.kelasId, mapelId: p.ujian.mapelId, komponen, judul: p.ujian.judul,
        },
      },
      update: { skor: p.nilaiTotal! },
      create: { siswaId: p.siswaId, kelasId: p.siswa.kelasId, mapelId: p.ujian.mapelId, komponen, judul: p.ujian.judul, skor: p.nilaiTotal! },
    });
  }

  const tugasDinilai = await prisma.pengumpulanTugas.findMany({
    where: { nilai: { not: null }, siswa: { sekolahId } },
    include: { tugas: true, siswa: true },
  });
  for (const t of tugasDinilai) {
    await prisma.nilai.upsert({
      where: {
        siswaId_kelasId_mapelId_komponen_judul: {
          siswaId: t.siswaId, kelasId: t.siswa.kelasId, mapelId: t.tugas.mapelId, komponen: "Tugas", judul: t.tugas.judul,
        },
      },
      update: { skor: t.nilai! },
      create: { siswaId: t.siswaId, kelasId: t.siswa.kelasId, mapelId: t.tugas.mapelId, komponen: "Tugas", judul: t.tugas.judul, skor: t.nilai! },
    });
  }
}

// 1.20, diminta eksplisit — 30 sekolah SUNGGUHAN (npsn/alamat/kecamatan/kabupaten/provinsi/lat/long)
// diambil dari API "Data Sekolah Indonesia" (api.co.id, endpoint /regional/indonesia/schools),
// dihardcode di sini (bukan live call saat seed) supaya seed tetap cepat & tak bergantung jaringan/
// kuota API tiap kali dijalankan. Tersebar di 30 provinsi berbeda seluruh Indonesia, 4 jenjang.
const DATA_SEKOLAH_NYATA: {
  nama: string; jenjang: string; npsn: string; alamat: string; kecamatan: string; kabupatenKota: string; provinsi: string;
  latitude: number; longitude: number;
}[] = [
  { nama: "SD Negeri 1 Pagar Air", jenjang: "SD", npsn: "10100295", alamat: "Jln Banda Aceh Medan Km 6", kecamatan: "Kec. Ingin Jaya", kabupatenKota: "Kab. Aceh Besar", provinsi: "Prov. Aceh", latitude: 5.5291, longitude: 95.3593 },
  { nama: "SD Negeri 12 Hariarapintu", jenjang: "SD", npsn: "10108930", alamat: "Desa Hariarapintu, Kecamatan Harian, Kab. Samosir", kecamatan: "Kec. Harian", kabupatenKota: "Kab. Samosir", provinsi: "Prov. Sumatera Utara", latitude: 2.5597, longitude: 98.5937 },
  { nama: "SD Negeri 15 Koto Tangah", jenjang: "SD", npsn: "10300103", alamat: "Pasa Dama", kecamatan: "Kec. Tilatang Kamang", kabupatenKota: "Kab. Agam", provinsi: "Prov. Sumatera Barat", latitude: -0.213, longitude: 100.4329 },
  { nama: "SD Negeri 18 Kuala Merbau", jenjang: "SD", npsn: "10400639", alamat: "Jl. Pelabuhan", kecamatan: "Kec. Pulau Merbau", kabupatenKota: "Kab. Kepulauan Meranti", provinsi: "Prov. Riau", latitude: 1.1045, longitude: 102.488 },
  { nama: "SD Negeri 112/I Perumnas", jenjang: "SD", npsn: "10500101", alamat: "Jl. Sumatera", kecamatan: "Kec. Muara Bulian", kabupatenKota: "Kab. Batanghari", provinsi: "Prov. Jambi", latitude: -1.7203, longitude: 103.2614 },
  { nama: "SMP Negeri 1 Babat Toman", jenjang: "SMP", npsn: "10600212", alamat: "Babat Toman", kecamatan: "Kec. Babat Toman", kabupatenKota: "Kab. Musi Banyuasin", provinsi: "Prov. Sumatera Selatan", latitude: -2.7993, longitude: 103.504 },
  { nama: "SMP Negeri 10 Bengkulu Tengah", jenjang: "SMP", npsn: "10700236", alamat: "Jln Sidodadi", kecamatan: "Kec. Pondok Kelapa", kabupatenKota: "Kab. Bengkulu Tengah", provinsi: "Prov. Bengkulu", latitude: -3.684, longitude: 102.2791 },
  { nama: "UPTD SMP Negeri 1 Tanjung Bintang", jenjang: "SMP", npsn: "10800511", alamat: "Jl. Cendana No. 10", kecamatan: "Kec. Tanjung Bintang", kabupatenKota: "Kab. Lampung Selatan", provinsi: "Prov. Lampung", latitude: -5.4227, longitude: 105.4226 },
  { nama: "UPTD SMP Negeri 1 Mendo Barat", jenjang: "SMP", npsn: "10900176", alamat: "Jl. Pahlawan Xii", kecamatan: "Kec. Mendo Barat", kabupatenKota: "Kab. Bangka", provinsi: "Prov. Kepulauan Bangka Belitung", latitude: -2.1147383, longitude: 106.0059567 },
  { nama: "SMP Negeri 1 Karimun", jenjang: "SMP", npsn: "11000206", alamat: "Jl. Pendidikan No. 100", kecamatan: "Kec. Karimun", kabupatenKota: "Kab. Karimun", provinsi: "Prov. Kepulauan Riau", latitude: 0.99304, longitude: 103.433158 },
  { nama: "SMP Negeri 1 Maluku Tengah", jenjang: "SMP", npsn: "16200000", alamat: "Jln. Poros Utama Waimusi Samal - J", kecamatan: "Kec. Seram Utara Timur Kobi", kabupatenKota: "Kab. Maluku Tengah", provinsi: "Prov. Maluku", latitude: -2.9939, longitude: 129.836 },
  { nama: "SMP Negeri 137 Jakarta", jenjang: "SMP", npsn: "20100228", alamat: "Jl. Cempaka Putih Barat 15/26", kecamatan: "Kec. Cempaka Putih", kabupatenKota: "Kota Adm. Jakarta Pusat", provinsi: "Prov. D.K.I. Jakarta", latitude: -6.1805, longitude: 106.8669 },
  { nama: "SMP Negeri 1 Nanggung", jenjang: "SMP", npsn: "20200582", alamat: "Jalan Pasirsari Rt 03 Rw 02", kecamatan: "Kec. Nanggung", kabupatenKota: "Kab. Bogor", provinsi: "Prov. Jawa Barat", latitude: -6.6081, longitude: 106.5363 },
  { nama: "SMA Negeri 1 Cipari", jenjang: "SMA", npsn: "20300596", alamat: "Jl. Mt. Haryono No. 4", kecamatan: "Kec. Cipari", kabupatenKota: "Kab. Cilacap", provinsi: "Prov. Jawa Tengah", latitude: -7.428, longitude: 108.7439 },
  { nama: "SMA Negeri 1 Sewon", jenjang: "SMA", npsn: "20400371", alamat: "Jl. Parangtritis Km.5 Yogyakarta", kecamatan: "Kec. Sewon", kabupatenKota: "Kab. Bantul", provinsi: "Prov. D.I. Yogyakarta", latitude: -7.842984, longitude: 110.362816 },
  { nama: "SMA Negeri 1 Jombang", jenjang: "SMA", npsn: "20503415", alamat: "Jl. Bupati Raa. Soeroadiningrat No. 8 Jombang", kecamatan: "Kec. Jombang", kabupatenKota: "Kab. Jombang", provinsi: "Prov. Jawa Timur", latitude: -7.556, longitude: 112.2339 },
  { nama: "SMA Negeri 1 Teluk Batang", jenjang: "SMA", npsn: "30103474", alamat: "Jl. Raya Teluk Batang", kecamatan: "Kec. Teluk Batang", kabupatenKota: "Kab. Kayong Utara", provinsi: "Prov. Kalimantan Barat", latitude: -0.9972, longitude: 109.7921 },
  { nama: "SMA Negeri 1 Tamban Catur", jenjang: "SMA", npsn: "30200289", alamat: "Tamban Baru Km 20", kecamatan: "Kec. Tamban Catur", kabupatenKota: "Kab. Kapuas", provinsi: "Prov. Kalimantan Tengah", latitude: -3.299126, longitude: 114.3239 },
  { nama: "SMA Negeri 1 Muara Jawa", jenjang: "SMA", npsn: "30400215", alamat: "Jl. M. Hatta", kecamatan: "Kec. Muara Jawa", kabupatenKota: "Kab. Kutai Kartanegara", provinsi: "Prov. Kalimantan Timur", latitude: -0.8623, longitude: 117.2094 },
  { nama: "SMA Negeri 1 Malinau", jenjang: "SMA", npsn: "30400462", alamat: "Tanjung Belimbing", kecamatan: "Kec. Malinau Kota", kabupatenKota: "Kab. Malinau", provinsi: "Prov. Kalimantan Utara", latitude: 3.5694, longitude: 116.6074 },
  { nama: "SMK Negeri 1 Anyer", jenjang: "SMK", npsn: "20623155", alamat: "Jl. Raya Anyar Mancak Km.02 Rt.03/01", kecamatan: "Kec. Anyar", kabupatenKota: "Kab. Serang", provinsi: "Prov. Banten", latitude: -6.0617, longitude: 105.9345 },
  { nama: "SMK Negeri 1 Pulau Laut Barat", jenjang: "SMK", npsn: "30311511", alamat: "Jl. Abdullah", kecamatan: "Kec. Pulau Laut Tanjung Selayar", kabupatenKota: "Kab. Kotabaru", provinsi: "Prov. Kalimantan Selatan", latitude: -4.0321, longitude: 116.0979 },
  { nama: "SMK Negeri 1 Kotamobagu", jenjang: "SMK", npsn: "40100347", alamat: "Jl. H. Zakaria Imban", kecamatan: "Kec. Kotamobagu Barat", kabupatenKota: "Kota Kotamobagu", provinsi: "Prov. Sulawesi Utara", latitude: 0.7265, longitude: 124.2929 },
  { nama: "SMK Negeri 1 Banggai", jenjang: "SMK", npsn: "40200245", alamat: "Jl. Bubung Batu No. 1", kecamatan: "Kec. Banggai", kabupatenKota: "Kab. Banggai Laut", provinsi: "Prov. Sulawesi Tengah", latitude: -1.6122, longitude: 123.4967 },
  { nama: "SMK Negeri 1 Bonegunu", jenjang: "SMK", npsn: "40405208", alamat: "Jl. Poros Ronta - Maligano", kecamatan: "Kec. Bonegunu", kabupatenKota: "Kab. Buton Utara", provinsi: "Prov. Sulawesi Tenggara", latitude: -4.7602, longitude: 123.0039 },
  { nama: "SMK Negeri 1 Paguyaman Pantai", jenjang: "SMK", npsn: "40500148", alamat: "Jln Kebun Sari", kecamatan: "Kec. Paguyaman Pantai", kabupatenKota: "Kab. Boalemo", provinsi: "Prov. Gorontalo", latitude: 0.5222, longitude: 122.5568 },
  { nama: "UPTD SMK Negeri 1 Tutar", jenjang: "SMK", npsn: "40604724", alamat: "Poros Tubbi Taramanu", kecamatan: "Kec. Tubbitaramanu", kabupatenKota: "Kab. Polewali Mandar", provinsi: "Prov. Sulawesi Barat", latitude: -3.2941, longitude: 119.0618 },
  { nama: "SMA Negeri 1 Sukasada", jenjang: "SMA", npsn: "50100262", alamat: "Jl. Jelantik Gingsir No. 81 B", kecamatan: "Kec. Sukasada", kabupatenKota: "Kab. Buleleng", provinsi: "Prov. Bali", latitude: -8.1402683, longitude: 115.1051724 },
  { nama: "SMA Negeri 1 Lenek", jenjang: "SMA", npsn: "50202500", alamat: "Jl. Dane Rahil Lenek Daya", kecamatan: "Kec. Aikmel", kabupatenKota: "Kab. Lombok Timur", provinsi: "Prov. Nusa Tenggara Barat", latitude: -8.5761, longitude: 116.5051 },
  { nama: "SMA Negeri 1 Amarasi Timur", jenjang: "SMA", npsn: "50300244", alamat: "Jln. Jurusan Pakubaun", kecamatan: "Kec. Amarasi Timur", kabupatenKota: "Kab. Kupang", provinsi: "Prov. Nusa Tenggara Timur", latitude: -10.2141, longitude: 123.9606 },
];

const NAMA_KELAS_PER_JENJANG: Record<string, string[]> = {
  SD: ["4A", "5A"],
  SMP: ["7A", "8A", "9A"],
  SMA: ["X", "XI", "XII"],
  SMK: ["X TKJ", "XI TKJ"],
};
const NAMA_KEPSEK_LAIN = [
  "Bu Ratna Dewi", "Pak Yusuf Hidayat", "Bu Indah Permatasari", "Pak Bambang Sutrisno", "Bu Wulandari",
  "Pak Agus Salim", "Bu Siti Aminah", "Pak Hendra Gunawan", "Bu Dewi Lestari", "Pak Rahmat Hidayat",
];

async function main() {
  console.log("🌱 Membersihkan data lama...");
  await prisma.apiKey.deleteMany();
  await prisma.komentarKonten.deleteMany();
  await prisma.tanyaJawabKelas.deleteMany();
  await prisma.projekPenilaian.deleteMany();
  await prisma.projek.deleteMany();
  await prisma.catatanAsesmen.deleteMany();
  await prisma.rPPCapaian.deleteMany();
  await prisma.rPP.deleteMany();
  await prisma.capaianPembelajaran.deleteMany();
  await prisma.presensiGuru.deleteMany();
  await prisma.jadwalEntry.deleteMany();
  await prisma.prestasiSiswa.deleteMany();
  await prisma.catatanSiswa.deleteMany();
  await prisma.pesan.deleteMany();
  await prisma.catatanSupervisi.deleteMany();
  await prisma.consentPDP.deleteMany();
  await prisma.pengajuanIzin.deleteMany();
  await prisma.ujianJawaban.deleteMany();
  await prisma.ujianPengerjaan.deleteMany();
  await prisma.ujianSoal.deleteMany();
  await prisma.ujianKelas.deleteMany();
  await prisma.ujian.deleteMany();
  await prisma.soal.deleteMany();
  await prisma.gradeScale.deleteMany();
  await prisma.pPDBPendaftar.deleteMany();
  await prisma.agendaAkademik.deleteMany();
  await prisma.pengumpulanTugas.deleteMany();
  await prisma.tugas.deleteMany();
  await prisma.materiBelajar.deleteMany();
  await prisma.bab.deleteMany();
  await prisma.tagihan.deleteMany();
  await prisma.tagihanTipe.deleteMany();
  await prisma.nilai.deleteMany();
  await prisma.absensi.deleteMany();
  await prisma.bobotKomponen.deleteMany();
  await prisma.waliSiswa.deleteMany();
  await prisma.penugasanGuru.deleteMany();
  await prisma.siswa.deleteMany();
  await prisma.guruProfil.deleteMany();
  // 1.20 — model baru yg referensi Pengguna/Sekolah, harus dibersihkan sebelum pengguna/sekolah
  // dihapus supaya tak kena foreign key constraint. Sekolah.kurikulumId di-NULL-kan dulu (bukan
  // urutan ulang penghapusan sekolah) supaya Kurikulum bisa dihapus sebelum Pengguna tanpa
  // mengubah urutan penghapusan Sekolah yg sudah mapan (paling akhir).
  await prisma.penggunaPeran.deleteMany();
  await prisma.pengumumanSekolah.deleteMany();
  await prisma.pembayaranLangganan.deleteMany();
  await prisma.langganan.deleteMany();
  await prisma.sekolah.updateMany({ data: { kurikulumId: null } });
  await prisma.kurikulumMapel.deleteMany();
  await prisma.kurikulum.deleteMany();
  await prisma.pengguna.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.kelas.deleteMany();
  await prisma.tahunAjaran.deleteMany();
  await prisma.sekolah.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);

  console.log("🏫 Membuat sekolah & tahun ajaran...");
  const sekolah = await prisma.sekolah.create({
    data: { nama: "SD Harapan Bangsa", alamat: "Jl. Merdeka No. 45, Kota Harapan, Jawa Barat", jenjang: "SD", satuanPeriode: "BULANAN" },
  });

  const tahunAjaran = await prisma.tahunAjaran.create({
    data: {
      sekolahId: sekolah.id,
      label: "2026/2027",
      semester: "Ganjil",
      aktif: true,
      mulai: new Date("2026-07-14"),
      selesai: new Date("2026-12-19"),
    },
  });

  console.log("📚 Membuat kelas (tingkat 1-6, tiap tingkat 4 rombel A-D = 24 kelas) & mata pelajaran...");
  const ROMBEL = ["A", "B", "C", "D"];
  const kelasDef: { nama: string; tingkat: number }[] = [];
  for (let tingkat = 1; tingkat <= 6; tingkat++) {
    for (const r of ROMBEL) kelasDef.push({ nama: `${tingkat}${r}`, tingkat });
  }
  const kelasByName = new Map<string, Awaited<ReturnType<typeof prisma.kelas.create>>>();
  const kelasList: Awaited<ReturnType<typeof prisma.kelas.create>>[] = [];
  for (const k of kelasDef) {
    const created = await prisma.kelas.create({
      data: { sekolahId: sekolah.id, tahunAjaranId: tahunAjaran.id, nama: k.nama, tingkat: k.tingkat },
    });
    kelasByName.set(k.nama, created);
    kelasList.push(created);
  }

  // 1.8, diminta eksplisit: dummy mapel pakai 8 mapel inti Kurikulum Merdeka (gantikan 5 mapel generik).
  const mapelData = [
    { nama: "Pendidikan Agama", kkm: 75 },
    { nama: "PPKn", kkm: 70 },
    { nama: "Bahasa Indonesia", kkm: 72 },
    { nama: "Matematika", kkm: 70 },
    { nama: "IPAS", kkm: 70 },
    { nama: "PJOK", kkm: 75 },
    { nama: "Seni Budaya", kkm: 75 },
    { nama: "Bahasa Inggris", kkm: 70 },
  ];
  const mapelMap: Record<string, string> = {};
  for (const m of mapelData) {
    const created = await prisma.mataPelajaran.create({
      data: { sekolahId: sekolah.id, nama: m.nama, kkm: m.kkm },
    });
    mapelMap[m.nama] = created.id;
  }
  const MAPEL_NAMA = mapelData.map((m) => m.nama);

  // 1.20, diminta eksplisit — contoh KKM UTS/UAS beda dari KKM harian (Matematika: 70 harian, 75 UTS, 80 UAS).
  await prisma.mataPelajaran.update({ where: { id: mapelMap["Matematika"] }, data: { kkmUTS: 75, kkmUAS: 80 } });

  // Pembobotan 100% untuk SEMUA mapel (bukan cuma Matematika) — supaya Master Data & validasi bobot=100% (F-18) langsung terisi rapi.
  await prisma.bobotKomponen.createMany({
    data: mapelData.flatMap((m) => [
      { mapelId: mapelMap[m.nama], komponen: "Ulangan Harian", persentase: 30 },
      { mapelId: mapelMap[m.nama], komponen: "Tugas", persentase: 20 },
      { mapelId: mapelMap[m.nama], komponen: "UTS", persentase: 20 },
      { mapelId: mapelMap[m.nama], komponen: "UAS", persentase: 30 },
    ]),
  });

  console.log("👤 Membuat akun pengguna inti...");
  // 1.22 — nama-nama akun demo di seed ini SUDAH pakai honorifik bawaan ("Pak Hendra", "Bu Tuti",
  // dst) sbg konvensi tampilan lama; jenisKelamin sengaja TIDAK diisi di sini krn getSalam()
  // menambahkan honorifik-nya SENDIRI dari jenisKelamin ("Selamat pagi, Pak" + " Pak Hendra" akan
  // dobel jadi "Pak Pak Hendra"). jenisKelamin dipakai utk akun BARU yg dibuat lewat form (nama
  // input user biasanya tanpa Pak/Bu) — ditambahkan di form create/edit guru/kepsek/wali (Fase 1).
  const hendra = await prisma.pengguna.create({
    data: { sekolahId: sekolah.id, nama: "Pak Hendra", email: "hendra@selarasajar.demo", passwordHash: hash, peran: "KEPALA_SEKOLAH", telepon: "081234500001" },
  });
  const tuti = await prisma.pengguna.create({
    data: { sekolahId: sekolah.id, nama: "Bu Tuti", email: "tuti@selarasajar.demo", passwordHash: hash, peran: "BENDAHARA", telepon: "081234500002" },
  });
  // 1.6 — peran TU (Tata Usaha) dipecah dari "Bendahara/TU": administrasi data saja, tanpa akses keuangan.
  const tono = await prisma.pengguna.create({
    data: { sekolahId: sekolah.id, nama: "Pak Tono", email: "tono@selarasajar.demo", passwordHash: hash, peran: "TU", telepon: "081234500010" },
  });
  // 1.20, diminta eksplisit — contoh akun multi-role: Tono (TU) merangkap Guru, bisa switch peran
  // lewat tombol di menu akun. GuruProfil minimal dibuat supaya halaman /guru tak error saat dipakai.
  await prisma.guruProfil.create({ data: { penggunaId: tono.id, mapelUtama: "Umum" } });
  await prisma.penggunaPeran.create({ data: { penggunaId: tono.id, sekolahId: sekolah.id, peran: "GURU" } });

  const guruProfilKeAkun = new Map<string, string>(); // GuruProfil.id -> Pengguna.id, dipakai lintas seksi (tugas/ujian/jadwal)
  async function buatGuru(nama: string, email: string, nip: string, mapelUtama: string, telepon?: string) {
    const akun = await prisma.pengguna.create({
      data: { sekolahId: sekolah.id, nama, email, passwordHash: hash, peran: "GURU", telepon: telepon ?? `0813${nip.slice(-8)}` },
    });
    const profil = await prisma.guruProfil.create({ data: { penggunaId: akun.id, nip, mapelUtama } });
    guruProfilKeAkun.set(profil.id, akun.id);
    return { akun, profil };
  }

  // 4 spesialis mapel — mengajar lintas SEMUA 12 kelas tinggi (tingkat 4-6), pola umum sekolah nyata.
  const rina = await buatGuru("Bu Rina Wulandari", "rina@selarasajar.demo", "198705152010012001", "Matematika", "081234500003");
  const solihin = await buatGuru("Ahmad Solihin", "solihin@selarasajar.demo", "199003102015011002", "Bahasa Indonesia", "081234500004");
  const yuni = await buatGuru("Bu Yuni Astuti", "yuni@selarasajar.demo", "198811202012012003", "IPAS", "081234500005");
  const wulan = await buatGuru("Bu Wulan Sari", "wulan@selarasajar.demo", "199105182016012004", "PPKn", "081234500006");
  // Wali kelas rendah pertama (tetap, dipertahankan utk kontinuitas dokumen/demo)
  const made = await buatGuru("Pak Made Sudira", "made@selarasajar.demo", "198609122011011005", "Guru Kelas 1A", "081234500007");
  const citra = await buatGuru("Bu Citra Ayu", "citra@selarasajar.demo", "199002142014012006", "Guru Kelas 2A", "081234500008");
  const dedi = await buatGuru("Pak Dedi Kurniawan", "dedi@selarasajar.demo", "198712302013011007", "Guru Kelas 3A", "081234500009");
  // 1.8 — 3 guru spesialis lintas SEMUA 24 kelas (rendah & tinggi), pola umum sekolah nyata utk
  // mapel yang lazim diajar guru khusus, bukan wali kelas: Agama, PJOK, Bahasa Inggris.
  const agama = await buatGuru("Pak Ustadz Zainal Arifin", "zainal@selarasajar.demo", "198403112009011010", "Pendidikan Agama", "081234500011");
  const pjok = await buatGuru("Pak Fikri Ramadhan", "fikri@selarasajar.demo", "198910052014011011", "PJOK", "081234500012");
  const inggris = await buatGuru("Bu Melissa Tanoto", "melissa@selarasajar.demo", "199104222016012012", "Bahasa Inggris", "081234500013");

  console.log("👤 Membuat guru tambahan (wali kelas rendah B-D & wali kelas tinggi)...");
  const GURU_DEPAN_L = ["Bambang", "Slamet", "Hendra", "Agus", "Rudi", "Doni", "Bayu", "Arief", "Yanto", "Wawan", "Anto", "Herman", "Joko", "Eko", "Fajar"];
  const GURU_DEPAN_P = ["Ratna", "Sinta", "Lina", "Retno", "Yanti", "Dian", "Fitriani", "Endang", "Herlina", "Sulastri", "Marlina", "Nurul", "Wahyuni", "Puspita", "Anggraeni"];
  const GURU_BELAKANG = ["Santoso", "Wijaya", "Kusuma", "Pratama", "Ramadhan", "Saputra", "Handayani", "Lestari", "Permata", "Nurhaliza", "Maulana", "Firmansyah", "Setiawan", "Hidayat", "Utami", "Wibowo", "Anggraini", "Rahayu", "Gunawan", "Halim"];
  let guruCounter = 10;
  function guruBerikutnya(): { nama: string; email: string; nip: string; jk: "L" | "P" } {
    guruCounter++;
    const jk: "L" | "P" = guruCounter % 2 === 0 ? "L" : "P";
    const depan = jk === "L" ? GURU_DEPAN_L[guruCounter % GURU_DEPAN_L.length] : GURU_DEPAN_P[guruCounter % GURU_DEPAN_P.length];
    const belakang = GURU_BELAKANG[guruCounter % GURU_BELAKANG.length];
    const gelar = jk === "L" ? "Pak" : "Bu";
    return {
      nama: `${gelar} ${depan} ${belakang}`,
      email: `guru${guruCounter}@selarasajar.demo`,
      nip: `19${String(80 + (guruCounter % 15)).padStart(2, "0")}0${(guruCounter % 9) + 1}1${String(2010 + (guruCounter % 12)).slice(-2)}011${String(guruCounter).padStart(3, "0")}`,
      jk,
    };
  }

  console.log("🏷 Menetapkan wali kelas & penugasan mengajar (24 kelas)...");
  const penugasanRows: { guruId: string; kelasId: string; mapelId: string }[] = [];

  for (const k of kelasList) {
    if (k.tingkat <= 3) {
      // Kelas rendah (tingkat 1-3): wali mengajar mapel intinya sendiri ke kelasnya sendiri;
      // Agama/PJOK/Bahasa Inggris tetap diajar guru spesialis (pola umum sekolah nyata).
      let guru: { akun: { id: string }; profil: { id: string } };
      if (k.nama === "1A") guru = made;
      else if (k.nama === "2A") guru = citra;
      else if (k.nama === "3A") guru = dedi;
      else {
        const g = guruBerikutnya();
        guru = await buatGuru(g.nama, g.email, g.nip, `Guru Kelas ${k.nama}`);
      }
      await prisma.kelas.update({ where: { id: k.id }, data: { waliKelasId: guru.akun.id } });
      for (const mapelNama of ["PPKn", "Bahasa Indonesia", "Matematika", "IPAS", "Seni Budaya"]) {
        penugasanRows.push({ guruId: guru.profil.id, kelasId: k.id, mapelId: mapelMap[mapelNama] });
      }
    } else {
      // Kelas tinggi (tingkat 4-6): wali homeroom (kecuali 5B = Bu Rina, yang sudah mengajar
      // Matematika di kelasnya sendiri). 1.11, diperbaiki (ditemukan saat testing) — wali homeroom
      // sebelumnya tak punya penugasan mengajar SAMA SEKALI ("Belum ditugaskan" di Data Guru,
      // ganjil buat wali kelas beneran) — sekarang wali homeroom mengajar PPKn di kelasnya sendiri
      // (pola umum: wali kelas SD tetap pegang minimal satu mapel ke kelasnya), gantikan slot PPKn
      // yang generiknya dipegang Bu Wulan.
      let waliAkunId: string;
      let waliProfilId: string | null = null;
      if (k.nama === "5B") {
        waliAkunId = rina.akun.id;
      } else {
        const g = guruBerikutnya();
        const homeroom = await buatGuru(g.nama, g.email, g.nip, `Wali Kelas ${k.nama}`);
        waliAkunId = homeroom.akun.id;
        waliProfilId = homeroom.profil.id;
      }
      await prisma.kelas.update({ where: { id: k.id }, data: { waliKelasId: waliAkunId } });
      penugasanRows.push({ guruId: rina.profil.id, kelasId: k.id, mapelId: mapelMap["Matematika"] });
      penugasanRows.push({ guruId: solihin.profil.id, kelasId: k.id, mapelId: mapelMap["Bahasa Indonesia"] });
      penugasanRows.push({ guruId: yuni.profil.id, kelasId: k.id, mapelId: mapelMap["IPAS"] });
      penugasanRows.push({ guruId: waliProfilId ?? wulan.profil.id, kelasId: k.id, mapelId: mapelMap["PPKn"] });
      penugasanRows.push({ guruId: wulan.profil.id, kelasId: k.id, mapelId: mapelMap["Seni Budaya"] });
    }
    // Spesialis lintas SEMUA 24 kelas (rendah & tinggi).
    penugasanRows.push({ guruId: agama.profil.id, kelasId: k.id, mapelId: mapelMap["Pendidikan Agama"] });
    penugasanRows.push({ guruId: pjok.profil.id, kelasId: k.id, mapelId: mapelMap["PJOK"] });
    penugasanRows.push({ guruId: inggris.profil.id, kelasId: k.id, mapelId: mapelMap["Bahasa Inggris"] });
  }
  await prisma.penugasanGuru.createMany({ data: penugasanRows });

  // Dipakai lintas seksi (tugas/ujian/jadwal) — daftar {mapel, guru} yang mengajar tiap kelas.
  const penugasanByKelas = new Map<string, { mapelId: string; guruId: string; guruAkunId: string }[]>();
  for (const row of penugasanRows) {
    const cur = penugasanByKelas.get(row.kelasId) ?? [];
    cur.push({ mapelId: row.mapelId, guruId: row.guruId, guruAkunId: guruProfilKeAkun.get(row.guruId)! });
    penugasanByKelas.set(row.kelasId, cur);
  }

  console.log("🎒 Membuat data siswa (24 kelas, ±13-16/kelas — data dummy banyak)...");
  const NAMA_DEPAN_L = ["Ahmad", "Budi", "Eko", "Fajar", "Galih", "Hafiz", "Irfan", "Joko", "Lukman", "Nanda", "Oki", "Rendi", "Satria", "Taufik", "Wahyu", "Yoga", "Zaki", "Bagus", "Dimas", "Rizky"];
  const NAMA_DEPAN_P = ["Siti", "Dewi", "Fitri", "Hana", "Kartika", "Melati", "Putri", "Ratna", "Sari", "Tania", "Wulan", "Yuni", "Ayu", "Bella", "Citra", "Dinda", "Intan", "Nabila", "Salsabila", "Zahra"];
  const NAMA_BELAKANG = ["Santoso", "Wijaya", "Kusuma", "Pratama", "Ramadhan", "Saputra", "Handayani", "Lestari", "Permata", "Nurhaliza", "Maulana", "Firmansyah", "Setiawan", "Hidayat", "Utami", "Wibowo", "Anggraini", "Rahayu", "Gunawan", "Halim"];

  let nisnCounter = 98234500;
  function buatDataSiswa(jumlah: number) {
    const list: { nisn: string; nama: string; jk: "L" | "P" }[] = [];
    for (let i = 0; i < jumlah; i++) {
      const jk: "L" | "P" = i % 2 === 0 ? "L" : "P";
      const depan = jk === "L" ? NAMA_DEPAN_L[Math.floor(Math.random() * NAMA_DEPAN_L.length)] : NAMA_DEPAN_P[Math.floor(Math.random() * NAMA_DEPAN_P.length)];
      const belakang = NAMA_BELAKANG[Math.floor(Math.random() * NAMA_BELAKANG.length)];
      nisnCounter++;
      list.push({ nisn: String(nisnCounter), nama: `${depan} ${belakang}`, jk });
    }
    return list;
  }

  async function buatSiswa(list: { nisn: string; nama: string; jk: "L" | "P" }[], kelasId: string, tingkat: number) {
    const hasil = [];
    for (const s of list) {
      const usia = tingkat + 5; // perkiraan usia siswa SD
      const tanggalLahir = new Date(2026 - usia, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27));
      const siswa = await prisma.siswa.create({
        data: {
          sekolahId: sekolah.id,
          kelasId,
          nisn: s.nisn,
          nama: s.nama,
          jenisKelamin: s.jk,
          tanggalLahir,
          alamat: `Jl. Mawar No. ${1 + Math.floor(Math.random() * 90)}, Kota Harapan`,
        },
      });
      hasil.push(siswa);
    }
    return hasil;
  }

  type SiswaRow = Awaited<ReturnType<typeof buatSiswa>>[number];
  const semuaSiswa: SiswaRow[] = [];
  const semuaKelasInfo: { kelas: Awaited<ReturnType<typeof prisma.kelas.create>>; siswa: SiswaRow[] }[] = [];
  let siswa5B: SiswaRow[] = [];

  for (const k of kelasList) {
    const jumlah = 30; // 1.20, diminta eksplisit — 30 murid/kelas biar mendekati kondisi nyata
    let dataSiswa: { nisn: string; nama: string; jk: "L" | "P" }[];
    if (k.nama === "5B") {
      // Kelas 5B dibuat dengan 2 siswa nama tetap (dipakai akun demo ahmad@/fauzan@) — sisanya digenerate.
      dataSiswa = [
        { nisn: "0098234571", nama: "Ahmad Fauzi", jk: "L" },
        { nisn: "0098234572", nama: "Siti Nurhaliza", jk: "P" },
        ...buatDataSiswa(jumlah - 2),
      ];
    } else {
      dataSiswa = buatDataSiswa(jumlah);
    }
    const siswaKelas = await buatSiswa(dataSiswa, k.id, k.tingkat);
    semuaSiswa.push(...siswaKelas);
    semuaKelasInfo.push({ kelas: k, siswa: siswaKelas });
    if (k.nama === "5B") siswa5B = siswaKelas;
  }

  const kelas4A = kelasByName.get("4A")!;
  const kelas5A = kelasByName.get("5A")!;
  const kelas5B = kelasByName.get("5B")!;
  const ahmadFauzi = siswa5B[0];

  console.log(`   Total siswa dibuat: ${semuaSiswa.length}`);

  console.log("👨‍👩‍👧 Membuat akun orang tua & murid demo...");
  const fauzanAkun = await prisma.pengguna.create({
    data: { sekolahId: sekolah.id, nama: "Bpk. Fauzan", email: "fauzan@selarasajar.demo", passwordHash: hash, peran: "ORANG_TUA", telepon: "081234567890" },
  });
  await prisma.waliSiswa.create({ data: { siswaId: ahmadFauzi.id, penggunaId: fauzanAkun.id, hubungan: "Ayah" } });

  const ahmadAkun = await prisma.pengguna.create({
    data: { sekolahId: sekolah.id, nama: "Ahmad Fauzi", email: "ahmad@selarasajar.demo", passwordHash: hash, peran: "MURID" },
  });
  await prisma.siswa.update({ where: { id: ahmadFauzi.id }, data: { akunId: ahmadAkun.id } });

  const sriAkun = await prisma.pengguna.create({
    data: { sekolahId: sekolah.id, nama: "Ibu Sri", email: "sri@selarasajar.demo", passwordHash: hash, peran: "ORANG_TUA", telepon: "081234500099" },
  });
  await prisma.waliSiswa.create({ data: { siswaId: siswa5B[1].id, penggunaId: sriAkun.id, hubungan: "Ibu" } });

  // Wali untuk beberapa siswa lain (realisme data tunggakan & multi-anak)
  const kelas1A = kelasByName.get("1A")!;
  const kelas6A = kelasByName.get("6A")!;
  const siswaKelas1A = semuaKelasInfo.find((i) => i.kelas.id === kelas1A.id)!.siswa;
  const siswaKelas4A = semuaKelasInfo.find((i) => i.kelas.id === kelas4A.id)!.siswa;
  const siswaKelas6A = semuaKelasInfo.find((i) => i.kelas.id === kelas6A.id)!.siswa;
  for (const s of [siswaKelas4A[0], siswaKelas6A[0], siswaKelas1A[0]]) {
    const waliAkun = await prisma.pengguna.create({
      data: {
        sekolahId: sekolah.id,
        nama: `Wali ${s.nama.split(" ")[0]}`,
        email: `wali.${s.nisn}@selarasajar.demo`,
        passwordHash: hash,
        peran: "ORANG_TUA",
        jenisKelamin: "L",
        telepon: `0812345${s.nisn.slice(-5)}`,
      },
    });
    await prisma.waliSiswa.create({ data: { siswaId: s.id, penggunaId: waliAkun.id, hubungan: "Ayah" } });
  }

  // 1.21, diperbaiki (ditemukan saat testing) — sebelumnya cuma 5 dari 720 siswa (0.7%) yang punya
  // wali sama sekali, sisanya nol; UI sudah aman (Callout "Belum ada wali" + tombol tambah manual)
  // tapi datanya sendiri jauh dari realistis. Sekarang SEMUA siswa dapat wali otomatis.
  console.log("👨‍👩‍👧 Melengkapi wali untuk semua siswa lain yang belum punya...");
  const siswaSudahAdaWali = new Set([ahmadFauzi.id, siswa5B[1].id, siswaKelas4A[0].id, siswaKelas6A[0].id, siswaKelas1A[0].id]);
  for (const info of semuaKelasInfo) {
    for (let idx = 0; idx < info.siswa.length; idx++) {
      const s = info.siswa[idx];
      if (siswaSudahAdaWali.has(s.id)) continue;
      const jenisKelaminWali = idx % 2 === 0 ? "P" : "L";
      const waliAkun = await prisma.pengguna.create({
        data: {
          sekolahId: sekolah.id,
          nama: `${jenisKelaminWali === "P" ? "Ibu" : "Bpk."} ${s.nama.split(" ")[0]}`,
          email: `wali.${s.nisn}@selarasajar.demo`,
          passwordHash: hash,
          peran: "ORANG_TUA",
          jenisKelamin: jenisKelaminWali,
          telepon: `0812345${s.nisn.slice(-5)}`,
        },
      });
      await prisma.waliSiswa.create({ data: { siswaId: s.id, penggunaId: waliAkun.id, hubungan: jenisKelaminWali === "P" ? "Ibu" : "Ayah" } });
    }
  }

  console.log("✓ Membuat absensi (4 minggu terakhir, semua 24 kelas)...");
  const hariSekolah: Date[] = [];
  const cursor = new Date();
  while (hariSekolah.length < 20) {
    cursor.setDate(cursor.getDate() - 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) hariSekolah.push(new Date(cursor));
  }

  // 1.20, diminta eksplisit — guru bisa kasih catatan per murid saat absensi (mis. alasan sakit/izin).
  const CATATAN_SAKIT = ["Demam sejak semalam.", "Sakit perut, sudah izin ke UKS.", "Flu, istirahat di rumah."];
  const CATATAN_IZIN = ["Ada acara keluarga.", "Mengurus dokumen di kelurahan.", "Menjenguk kakek yang sakit."];
  for (const info of semuaKelasInfo) {
    for (const tgl of hariSekolah) {
      for (let i = 0; i < info.siswa.length; i++) {
        const roll = (i + tgl.getDate()) % 17;
        let status: StatusAbsensi = "HADIR";
        let catatan: string | null = null;
        if (roll === 0) { status = "SAKIT"; catatan = CATATAN_SAKIT[i % CATATAN_SAKIT.length]; }
        else if (roll === 1) { status = "IZIN"; catatan = CATATAN_IZIN[i % CATATAN_IZIN.length]; }
        else if (roll === 2 && tgl.getDate() % 5 === 0) status = "ALPA";
        await prisma.absensi.create({
          data: { siswaId: info.siswa[i].id, kelasId: info.kelas.id, tanggal: tgl, status, catatan },
        });
      }
    }
  }

  // 1.21 — Nilai TIDAK lagi digenerate sintetis di sini; diderivasi dari UjianPengerjaan/PengumpulanTugas
  // asli lewat generateNilaiDariHasilAsli() SETELAH ujian & tugas sekolah ini selesai dibuat (lihat di bawah).

  console.log("₽ Membuat tagihan SPP (3 periode, semua 24 kelas)...");
  const spp = await prisma.tagihanTipe.create({ data: { sekolahId: sekolah.id, nama: "SPP" } });
  const nominalPerTingkat: Record<number, number> = { 1: 300000, 2: 300000, 3: 310000, 4: 325000, 5: 350000, 6: 375000 };
  const periodeIni = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const duaBulanLalu = new Date();
  duaBulanLalu.setMonth(duaBulanLalu.getMonth() - 1);
  const bulanLalu = duaBulanLalu.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const tigaBulanLalu2 = new Date();
  tigaBulanLalu2.setMonth(tigaBulanLalu2.getMonth() - 2);
  const duaBulanLaluLabel = tigaBulanLalu2.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const periodeList = [duaBulanLaluLabel, bulanLalu, periodeIni];

  let tagihanIdx = 0;
  for (const periode of periodeList) {
    for (const info of semuaKelasInfo) {
      const nominal = nominalPerTingkat[info.kelas.tingkat];
      for (const s of info.siswa) {
        const mod = tagihanIdx % 6;
        let status: StatusTagihan = "LUNAS";
        let dibayarPada: Date | null = new Date();
        let metode: string | null = "QRIS";
        if (periode === periodeIni && mod === 1) {
          status = "BELUM_BAYAR";
          dibayarPada = null;
          metode = null;
        } else if (periode === periodeIni && mod === 2) {
          status = "CICILAN";
          metode = "VA BCA (cicilan 1/2)";
        } else if (mod === 4) {
          status = "BELUM_BAYAR";
          dibayarPada = null;
          metode = null;
        }
        await prisma.tagihan.create({
          data: {
            siswaId: s.id,
            tipeId: spp.id,
            periode,
            nominal,
            status,
            jatuhTempo: new Date("2026-08-10"),
            dibayarPada: dibayarPada ?? undefined,
            metodeBayar: metode ?? undefined,
            tahunAjaranId: info.kelas.tahunAjaranId,
          },
        });
        tagihanIdx++;
      }
    }
  }

  // 1.20, diminta eksplisit — bendahara/kepsek bisa bikin tagihan LAIN selain SPP (buku/seragam/dst).
  console.log("₽ Membuat contoh tagihan non-SPP (Buku Paket & Seragam)...");
  const bukuPaket = await prisma.tagihanTipe.create({ data: { sekolahId: sekolah.id, nama: "Buku Paket" } });
  const seragam = await prisma.tagihanTipe.create({ data: { sekolahId: sekolah.id, nama: "Seragam" } });
  for (const info of semuaKelasInfo.slice(0, 4)) {
    for (let i = 0; i < info.siswa.length; i++) {
      const lunasBuku = i % 3 !== 0;
      await prisma.tagihan.create({
        data: {
          siswaId: info.siswa[i].id, tipeId: bukuPaket.id, periode: "Tahun Ajaran 2026/2027", nominal: 150000,
          status: lunasBuku ? "LUNAS" : "BELUM_BAYAR", jatuhTempo: new Date("2026-07-31"), dibayarPada: lunasBuku ? new Date() : null,
          tahunAjaranId: info.kelas.tahunAjaranId,
        },
      });
      const lunasSeragam = i % 4 !== 0;
      await prisma.tagihan.create({
        data: {
          siswaId: info.siswa[i].id, tipeId: seragam.id, periode: "Tahun Ajaran 2026/2027", nominal: 250000,
          status: lunasSeragam ? "LUNAS" : "BELUM_BAYAR", jatuhTempo: new Date("2026-07-31"), dibayarPada: lunasSeragam ? new Date() : null,
          tahunAjaranId: info.kelas.tahunAjaranId,
        },
      });
    }
  }

  console.log("▢ Membuat materi belajar (semua kelas & mapel)...");
  // 1.23 — Bab (master data per-mapel) dibuat SEKALI per mapel, direuse lintas semua kelas —
  // itulah maksud utama fitur ini (bukan 1 row baru per kelas per materi).
  const babSatuPerMapel: Record<string, string> = {};
  for (const mapelNama of MAPEL_NAMA) {
    const bab = await prisma.bab.create({ data: { sekolahId: sekolah.id, mapelId: mapelMap[mapelNama], nama: "Bab 1" } });
    babSatuPerMapel[mapelNama] = bab.id;
  }
  const babPecahan = await prisma.bab.create({ data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], nama: "Bab 2 - Pecahan" } });
  for (const info of semuaKelasInfo) {
    for (const mapelNama of MAPEL_NAMA) {
      await prisma.materiBelajar.create({
        data: {
          kelasId: info.kelas.id,
          mapelId: mapelMap[mapelNama],
          penggunaId: rina.akun.id,
          judul: `Rangkuman ${mapelNama} — ${info.kelas.nama}`,
          tipe: "dokumen",
          isi: `Ringkasan materi ${mapelNama} untuk kelas ${info.kelas.nama}.`,
          babId: babSatuPerMapel[mapelNama],
        },
      });
    }
  }
  const materiPecahan = await prisma.materiBelajar.create({
    data: {
      kelasId: kelas5B.id,
      mapelId: mapelMap["Matematika"],
      penggunaId: rina.akun.id,
      judul: "Video: Penjumlahan Pecahan",
      tipe: "video",
      isi: "https://www.youtube.com/watch?v=demo-pecahan-01",
      babId: babPecahan.id,
    },
  });
  // 1.23 — contoh video yang guru unggah sendiri (bukan tautan YouTube), utk demo preview
  // <video> lewat toEmbedVideo() (jalur "file", terpisah dari jalur "youtube" di atas).
  await prisma.materiBelajar.create({
    data: {
      kelasId: kelas5B.id,
      mapelId: mapelMap["Matematika"],
      penggunaId: rina.akun.id,
      judul: "Video: Latihan Soal FPB & KPK (unggahan guru)",
      tipe: "video",
      isi: "/uploads/materi/demo-fpb-kpk.mp4",
      babId: babSatuPerMapel["Matematika"],
    },
  });

  // Sengaja BUKAN Matematika — itu satu-satunya mapel yang diajar Rina (guru demo utama dipakai
  // banyak test), test materi-bab-silabus.spec.ts butuh Matematika mulai dari kondisi "belum ada
  // silabus" supaya alur upload-sekali-lalu-reuse bisa didemokan dari awal tanpa bentrok data seed.
  console.log("📎 Menetapkan silabus (1.23) pada beberapa mapel...");
  await prisma.mataPelajaran.update({ where: { id: mapelMap["IPAS"] }, data: { silabusUrl: "/uploads/silabus/demo-silabus-ipas.pdf" } });
  await prisma.mataPelajaran.update({ where: { id: mapelMap["Bahasa Indonesia"] }, data: { silabusUrl: "/uploads/silabus/demo-silabus-bindo.pdf" } });

  console.log("▧ Membuat tugas (semua kelas, contoh lampiran & markdown)...");
  const tugasPecahan = await prisma.tugas.create({
    data: {
      kelasId: kelas5B.id,
      mapelId: mapelMap["Matematika"],
      penggunaId: rina.akun.id,
      judul: "PR Pecahan",
      instruksi: "Kerjakan soal halaman 24 nomor 1-10 tentang **penjumlahan pecahan**.\n\n- Tulis langkah penyelesaian\n- Sertakan hasil akhir dalam bentuk paling sederhana",
      lampiranUrl: "https://drive.google.com/contoh-soal-pecahan",
      tautanUrl: "https://youtube.com/watch?v=contoh-penjelasan",
      tenggat: new Date("2026-08-22"),
    },
  });
  // 1.11, diperbaiki (ditemukan saat testing) — `terlambat` HARUS dihitung dari submitAt vs
  // tenggat yang sungguhan, bukan flag acak lepas (sebelumnya bisa menghasilkan tugas yang
  // dikumpulkan jauh sebelum tenggat tapi tetap ditandai "Terlambat", atau sebaliknya).
  const submitAtAhmad = new Date(tugasPecahan.tenggat.getTime() - 2 * 86400000); // 2 hari sebelum tenggat
  await prisma.pengumpulanTugas.create({
    data: {
      tugasId: tugasPecahan.id,
      siswaId: ahmadFauzi.id,
      isiJawaban: "Sudah dikerjakan, terlampir.\n\n- No 1: 3/4\n- No 2: 7/8",
      lampiranUrl: "https://drive.google.com/jawaban-ahmad",
      nilai: 90,
      submitAt: submitAtAhmad,
      terlambat: submitAtAhmad > tugasPecahan.tenggat,
    },
  });
  const submitAtTelat = new Date(tugasPecahan.tenggat.getTime() + 6 * 3600000); // 6 jam setelah tenggat
  await prisma.pengumpulanTugas.create({
    data: {
      tugasId: tugasPecahan.id,
      siswaId: siswa5B[1].id,
      isiJawaban: "Dikumpulkan agak telat.",
      submitAt: submitAtTelat,
      terlambat: submitAtTelat > tugasPecahan.tenggat,
    },
  });
  // Beberapa lagi BELUM dinilai (nilai=null) — supaya alur "guru kasih nilai" bisa langsung didemokan.
  for (let i = 2; i < Math.min(7, siswa5B.length); i++) {
    const submitAtI = new Date(tugasPecahan.tenggat.getTime() - (1 + i) * 3600000); // beberapa jam sebelum tenggat
    await prisma.pengumpulanTugas.create({
      data: {
        tugasId: tugasPecahan.id,
        siswaId: siswa5B[i].id,
        isiJawaban: `Jawaban dari ${siswa5B[i].nama}.\n\n- No 1: 3/4\n- No 2: 7/8`,
        submitAt: submitAtI,
        terlambat: submitAtI > tugasPecahan.tenggat,
      },
    });
  }

  // 1.8, diminta eksplisit: 5-10 tugas per kelas (acak), pakai mapel+guru yang benar-benar
  // mengajar kelas itu (dari penugasanByKelas) — bukan satu mapel sembarang per kelas.
  const JUDUL_TUGAS = ["Latihan Soal", "Rangkuman Bab", "Kerja Kelompok", "Refleksi Pembelajaran", "Portofolio Mingguan", "Kuis Harian", "Proyek Mini", "Lembar Kerja Siswa"];
  for (const info of semuaKelasInfo) {
    const sudahAdaDiKelasIni = info.kelas.id === kelas5B.id ? 1 : 0; // tugasPecahan
    const targetJumlah = 5 + Math.floor(Math.random() * 6); // 5-10
    const daftarPengajar = penugasanByKelas.get(info.kelas.id) ?? [];
    if (daftarPengajar.length === 0) continue;

    for (let n = sudahAdaDiKelasIni; n < targetJumlah; n++) {
      const pengajar = daftarPengajar[n % daftarPengajar.length];
      const mapelNama = Object.entries(mapelMap).find(([, id]) => id === pengajar.mapelId)?.[0] ?? "Umum";
      const judulTugas = JUDUL_TUGAS[n % JUDUL_TUGAS.length];
      const sudahLewatTenggat = n % 2 === 0;
      const tugasBaru = await prisma.tugas.create({
        data: {
          kelasId: info.kelas.id,
          mapelId: pengajar.mapelId,
          penggunaId: pengajar.guruAkunId,
          judul: `${judulTugas} ${mapelNama} — ${info.kelas.nama}`,
          instruksi: `Kerjakan ${judulTugas.toLowerCase()} ${mapelNama} sesuai materi minggu ini.\n\n- Kerjakan di buku tulis\n- Foto & unggah hasilnya`,
          tenggat: sudahLewatTenggat ? new Date(Date.now() - (1 + (n % 5)) * 86400000) : new Date(Date.now() + (1 + (n % 7)) * 86400000),
        },
      });
      // Sebagian siswa di tiap kelas sudah mengumpulkan — sebagian sudah dinilai, sebagian belum.
      const jumlahKumpul = Math.min(info.siswa.length, 4 + (n % 5));
      for (let i = 0; i < jumlahKumpul; i++) {
        const sudahDinilai = sudahLewatTenggat && i % 3 !== 0; // hanya tugas yg lewat tenggat yg mulai dikoreksi
        // 1.11, diperbaiki (ditemukan saat testing) — `terlambat` dihitung dari submitAt vs tenggat
        // sungguhan (bukan flag acak lepas yang bisa nunjuk salah pas tenggatnya masih di masa depan).
        const submitAtI = new Date(Date.now() - (3 - (i % 3)) * 86400000);
        await prisma.pengumpulanTugas.create({
          data: {
            tugasId: tugasBaru.id,
            siswaId: info.siswa[i].id,
            isiJawaban: `Jawaban ${mapelNama} dari ${info.siswa[i].nama}.`,
            terlambat: submitAtI > tugasBaru.tenggat,
            nilai: sudahDinilai ? 65 + ((i * 7) % 35) : null,
            catatanGuru: sudahDinilai ? "Kerjakan lebih rapi lagi ya." : null,
            submitAt: submitAtI,
          },
        });
      }
    }
  }

  console.log("✉ Membuat pengumuman & pesan 2 arah...");
  await prisma.pesan.create({
    data: { pengirimId: rina.akun.id, kelasIdTarget: kelas5B.id, judul: "Rapat Orang Tua Murid", isi: "Rapat orang tua murid akan diadakan Sabtu, 23 Agustus 2026 pukul 09.00 di aula sekolah.", dibaca: true },
  });
  const pesanLangsung = await prisma.pesan.create({
    data: { pengirimId: rina.akun.id, penerimaId: fauzanAkun.id, judul: "Ahmad butuh latihan tambahan", isi: "Selamat siang Bpk. Fauzan, Ahmad perlu latihan tambahan soal pecahan di rumah ya. Terima kasih.", dibaca: false },
  });
  await prisma.pesan.create({
    data: { pengirimId: fauzanAkun.id, penerimaId: rina.akun.id, parentId: pesanLangsung.id, judul: "Re: Ahmad butuh latihan tambahan", isi: "Baik Bu Rina, terima kasih infonya. Nanti saya dampingi belajar di rumah.", dibaca: true },
  });

  console.log("⚖ Membuat rentang nilai → predikat...");
  await prisma.gradeScale.createMany({
    data: [
      { sekolahId: sekolah.id, minSkor: 100, maxSkor: 100, label: "Sempurna", urutan: 1 },
      { sekolahId: sekolah.id, minSkor: 80, maxSkor: 99, label: "Baik", urutan: 2 },
      { sekolahId: sekolah.id, minSkor: 70, maxSkor: 79, label: "Cukup", urutan: 3 },
      { sekolahId: sekolah.id, minSkor: 0, maxSkor: 69, label: "Perlu Bimbingan", urutan: 4 },
    ],
  });

  console.log("📝 Membuat bank soal (sebar ke semua mapel)...");
  const soalPecahan = await prisma.soal.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, jenis: "PILIHAN_GANDA", pertanyaan: "Hasil dari 3/4 + 1/8 adalah…", opsi: JSON.stringify(["1/2", "7/8", "5/8", "4/12"]), kunciJawaban: "1", topik: "Pecahan", tingkatKesulitan: "sedang", poinDefault: 20 },
  });
  const soalBilangan = await prisma.soal.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, jenis: "PILIHAN_GANDA", pertanyaan: "Bilangan bulat yang terletak antara −3 dan 2 ada berapa?", opsi: JSON.stringify(["3", "4", "5", "6"]), kunciJawaban: "1", topik: "Bilangan Bulat", tingkatKesulitan: "mudah", poinDefault: 20 },
  });
  const soalFPB = await prisma.soal.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, jenis: "PILIHAN_GANDA", pertanyaan: "FPB dari 24 dan 36 adalah…", opsi: JSON.stringify(["6", "12", "18", "24"]), kunciJawaban: "1", topik: "Bilangan Bulat", tingkatKesulitan: "sedang", poinDefault: 20 },
  });
  // 1.20, diminta eksplisit — contoh soal pilihan ganda kompleks (bisa >1 jawaban benar, skor all-or-nothing).
  await prisma.soal.create({
    data: {
      sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, jenis: "PILIHAN_GANDA_KOMPLEKS",
      pertanyaan: "Manakah di antara bilangan berikut yang merupakan bilangan genap? (pilih semua yang benar)",
      opsi: JSON.stringify(["12", "17", "24", "31"]), kunciJawaban: JSON.stringify([0, 2]),
      topik: "Bilangan Bulat", tingkatKesulitan: "sedang", poinDefault: 20,
    },
  });
  const soalSingkatDiskon = await prisma.soal.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, jenis: "JAWABAN_SINGKAT", pertanyaan: "Berapakah 15% dari 288.000?", kunciJawaban: "43200", topik: "Aritmatika Sosial", tingkatKesulitan: "sedang", poinDefault: 20 },
  });
  const soalEsaiUntung = await prisma.soal.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, jenis: "ESAI", pertanyaan: "Seorang pedagang membeli 24 kg beras seharga Rp288.000, lalu menjual dengan untung 15%. Hitung harga jual per kg. Tuliskan langkahnya.", topik: "Aritmatika Sosial", tingkatKesulitan: "sulit", poinDefault: 20 },
  });
  await prisma.soal.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, jenis: "PILIHAN_GANDA", pertanyaan: "Hasil dari 12 x 8 adalah…", opsi: JSON.stringify(["86", "96", "106", "112"]), kunciJawaban: "1", topik: "Perkalian", tingkatKesulitan: "mudah", poinDefault: 10 },
  });

  // 1.8, diminta eksplisit: bank soal diperbanyak signifikan, sebar ke SEMUA 8 mapel Kurikulum Merdeka.
  const soalTemplatePerMapel: Record<string, { jenis: "PILIHAN_GANDA" | "JAWABAN_SINGKAT" | "ESAI"; pertanyaan: string; opsi?: string[]; kunci?: string; topik: string }[]> = {
    Matematika: [
      { jenis: "PILIHAN_GANDA", pertanyaan: "Hasil dari 1/3 + 1/6 adalah…", opsi: ["1/2", "2/9", "1/9", "3/6"], kunci: "0", topik: "Pecahan" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "KPK dari 6 dan 8 adalah…", opsi: ["12", "24", "48", "16"], kunci: "1", topik: "Bilangan Bulat" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Berapa keliling persegi dengan sisi 9 cm?", kunci: "36", topik: "Bangun Datar" },
      { jenis: "ESAI", pertanyaan: "Sebuah kolam berbentuk persegi panjang panjang 8 m lebar 5 m. Hitung luas dan kelilingnya, tuliskan langkahnya.", topik: "Bangun Datar" },
    ],
    "Pendidikan Agama": [
      { jenis: "PILIHAN_GANDA", pertanyaan: "Rukun Islam yang pertama adalah…", opsi: ["Syahadat", "Shalat", "Zakat", "Puasa"], kunci: "0", topik: "Rukun Islam" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "Kitab suci umat Islam bernama…", opsi: ["Taurat", "Injil", "Al-Qur'an", "Zabur"], kunci: "2", topik: "Kitab Suci" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Sebutkan salah satu sifat wajib bagi Allah!", kunci: "Wujud", topik: "Akidah" },
      { jenis: "ESAI", pertanyaan: "Jelaskan pentingnya sikap jujur dalam kehidupan sehari-hari menurut ajaran agama.", topik: "Akhlak" },
    ],
    PPKn: [
      { jenis: "PILIHAN_GANDA", pertanyaan: "Sila pertama Pancasila berbunyi…", opsi: ["Kemanusiaan yang Adil dan Beradab", "Ketuhanan Yang Maha Esa", "Persatuan Indonesia", "Keadilan Sosial"], kunci: "1", topik: "Pancasila" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "Lambang negara Indonesia adalah…", opsi: ["Garuda Pancasila", "Bhinneka Tunggal Ika", "Merah Putih", "Elang Jawa"], kunci: "0", topik: "Lambang Negara" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Apa semboyan negara Indonesia?", kunci: "Bhinneka Tunggal Ika", topik: "Semboyan" },
      { jenis: "ESAI", pertanyaan: "Jelaskan sikap yang mencerminkan sila ke-3 Pancasila di lingkungan sekolah.", topik: "Pengamalan Pancasila" },
    ],
    "Bahasa Indonesia": [
      { jenis: "PILIHAN_GANDA", pertanyaan: "Kalimat yang menggunakan huruf kapital dengan benar adalah…", opsi: ["saya pergi ke Jakarta", "Saya pergi ke jakarta", "Saya pergi ke Jakarta", "Saya Pergi ke Jakarta"], kunci: "2", topik: "Ejaan" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "Sinonim dari kata 'gembira' adalah…", opsi: ["sedih", "senang", "marah", "takut"], kunci: "1", topik: "Kosakata" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Sebutkan satu contoh kalimat tanya!", kunci: "Apa", topik: "Kalimat" },
      { jenis: "ESAI", pertanyaan: "Tuliskan sebuah paragraf pendek (3-5 kalimat) tentang pengalamanmu di sekolah.", topik: "Menulis" },
    ],
    IPAS: [
      { jenis: "PILIHAN_GANDA", pertanyaan: "Organ tubuh yang berfungsi memompa darah adalah…", opsi: ["Paru-paru", "Jantung", "Ginjal", "Hati"], kunci: "1", topik: "Sistem Peredaran Darah" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "Tumbuhan hijau membuat makanan sendiri melalui proses…", opsi: ["Respirasi", "Fotosintesis", "Transpirasi", "Fermentasi"], kunci: "1", topik: "Fotosintesis" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "Pulau terbesar di Indonesia adalah…", opsi: ["Jawa", "Sumatra", "Kalimantan", "Papua"], kunci: "2", topik: "Geografi Indonesia" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Apa nama gas yang dihirup makhluk hidup untuk bernapas?", kunci: "oksigen", topik: "Pernapasan" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Apa nama mata uang Indonesia?", kunci: "rupiah", topik: "Ekonomi" },
      { jenis: "ESAI", pertanyaan: "Jelaskan proses terjadinya hujan (siklus air) secara singkat.", topik: "Siklus Air" },
      { jenis: "ESAI", pertanyaan: "Jelaskan pentingnya gotong royong dalam kehidupan bermasyarakat.", topik: "Kehidupan Sosial" },
    ],
    PJOK: [
      { jenis: "PILIHAN_GANDA", pertanyaan: "Induk organisasi sepak bola dunia adalah…", opsi: ["FIBA", "FIFA", "IAAF", "IOC"], kunci: "1", topik: "Permainan Bola Besar" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "Gerakan pemanasan sebelum olahraga bertujuan untuk…", opsi: ["Membuat lelah", "Mencegah cedera", "Mempercepat lapar", "Menambah waktu"], kunci: "1", topik: "Kebugaran Jasmani" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Berapa jumlah pemain inti dalam satu tim sepak bola?", kunci: "11", topik: "Permainan Bola Besar" },
      { jenis: "ESAI", pertanyaan: "Jelaskan manfaat olahraga rutin bagi kesehatan tubuh.", topik: "Kebugaran Jasmani" },
    ],
    "Seni Budaya": [
      { jenis: "PILIHAN_GANDA", pertanyaan: "Alat musik tradisional dari Jawa Barat yang dimainkan dengan digoyang adalah…", opsi: ["Angklung", "Gamelan", "Sasando", "Kolintang"], kunci: "0", topik: "Seni Musik" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "Warna primer terdiri dari…", opsi: ["Merah, hijau, biru", "Merah, kuning, biru", "Hijau, ungu, oranye", "Merah, hitam, putih"], kunci: "1", topik: "Seni Rupa" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Sebutkan salah satu tari tradisional dari Bali!", kunci: "Kecak", topik: "Seni Tari" },
      { jenis: "ESAI", pertanyaan: "Ceritakan pengalamanmu membuat sebuah karya seni rupa (gambar/kerajinan) di sekolah.", topik: "Seni Rupa" },
    ],
    "Bahasa Inggris": [
      { jenis: "PILIHAN_GANDA", pertanyaan: "'Book' dalam Bahasa Indonesia artinya…", opsi: ["Meja", "Buku", "Pensil", "Tas"], kunci: "1", topik: "Vocabulary" },
      { jenis: "PILIHAN_GANDA", pertanyaan: "\"She ___ to school every day.\" Kata yang tepat adalah…", opsi: ["go", "goes", "going", "gone"], kunci: "1", topik: "Simple Present Tense" },
      { jenis: "JAWABAN_SINGKAT", pertanyaan: "Tulis dalam Bahasa Inggris: 'kucing'", kunci: "cat", topik: "Vocabulary" },
      { jenis: "ESAI", pertanyaan: "Write 3-4 sentences to introduce yourself in English.", topik: "Writing" },
    ],
  };
  for (const [mapelNama, list] of Object.entries(soalTemplatePerMapel)) {
    for (const t of list) {
      await prisma.soal.create({
        data: {
          sekolahId: sekolah.id,
          mapelId: mapelMap[mapelNama],
          dibuatOlehId: rina.akun.id,
          jenis: t.jenis,
          pertanyaan: t.pertanyaan,
          opsi: t.opsi ? JSON.stringify(t.opsi) : null,
          kunciJawaban: t.kunci ?? null,
          topik: t.topik,
          tingkatKesulitan: "sedang",
          poinDefault: 20,
        },
      });
    }
  }

  // 1.10, diminta eksplisit: tiap ujian butuh 20 soal, jadi bank per mapel perlu lebih dari itu —
  // pertahankan soal asli di atas (kualitas tertinggi), tambah soal latihan generik utk volume.
  console.log("📝 Melengkapi bank soal (target ≥24 soal/mapel, cukup utk ujian 20 soal)...");
  const topikPerMapel: Record<string, string[]> = {
    Matematika: ["Pecahan", "Bilangan Bulat", "Aljabar", "Geometri", "Statistika"],
    "Pendidikan Agama": ["Akidah", "Akhlak", "Fikih", "Sejarah Islam", "Al-Qur'an"],
    PPKn: ["Pancasila", "UUD 1945", "Kebhinekaan", "Hak & Kewajiban", "Lembaga Negara"],
    "Bahasa Indonesia": ["Ejaan", "Kosakata", "Kalimat", "Membaca", "Menulis"],
    IPAS: ["Sistem Tubuh", "Ekosistem", "Geografi Indonesia", "Energi", "Siklus Air"],
    PJOK: ["Permainan Bola Besar", "Kebugaran Jasmani", "Atletik", "Senam", "Renang"],
    "Seni Budaya": ["Seni Musik", "Seni Rupa", "Seni Tari", "Seni Teater", "Kerajinan"],
    "Bahasa Inggris": ["Vocabulary", "Grammar", "Reading", "Writing", "Speaking"],
  };
  for (const [mapelNama, mapelId] of Object.entries(mapelMap)) {
    const jumlahAda = await prisma.soal.count({ where: { mapelId } });
    const topikList = topikPerMapel[mapelNama] ?? ["Materi Umum"];
    const target = 24;
    for (let i = jumlahAda; i < target; i++) {
      const topik = topikList[i % topikList.length];
      await prisma.soal.create({
        data: {
          sekolahId: sekolah.id,
          mapelId,
          dibuatOlehId: rina.akun.id,
          jenis: "PILIHAN_GANDA",
          pertanyaan: `Latihan ${topik} — soal variasi ${i + 1}`,
          opsi: JSON.stringify([
            `Berkaitan langsung dengan ${topik}`,
            "Tidak relevan dengan topik ini",
            "Hanya berlaku pada topik lain",
            "Bukan bagian dari pelajaran ini",
          ]),
          kunciJawaban: "0",
          topik,
          tingkatKesulitan: "sedang",
          poinDefault: 5,
        },
      });
    }
  }

  console.log("▤ Membuat ujian (variasi status, termasuk demo penggandaan multi-kelas 1.8)...");
  // U-1 (1.8, diminta eksplisit): "guru bikin 1 ujian untuk 5 kelas → 5 ujian tersimpan sendiri-
  // sendiri di masing-masing kelas" — didemokan langsung sbg 5 record Ujian terpisah (bukan 1
  // record dibagi 5 kelas seperti model 1.6), persis hasil akhir alur fan-out saat publish.
  const soalUts = [
    { soalId: soalPecahan.id, poin: 20 },
    { soalId: soalBilangan.id, poin: 20 },
    { soalId: soalFPB.id, poin: 20 },
    { soalId: soalSingkatDiskon.id, poin: 20 },
    { soalId: soalEsaiUntung.id, poin: 20 },
  ];
  const kelasUtsBersama = [kelas5A, kelas5B, kelasByName.get("5C")!, kelasByName.get("5D")!, kelas4A];
  let utsUntukKelas5B: Awaited<ReturnType<typeof prisma.ujian.create>> | null = null;
  for (const kUts of kelasUtsBersama) {
    const jamMulai = new Date(Date.now() - (30 + Math.floor(Math.random() * 30)) * 60 * 1000);
    const jamSelesai = new Date(jamMulai.getTime() + (2 + Math.floor(Math.random() * 2)) * 60 * 60 * 1000);
    const utsKelasIni = await prisma.ujian.create({
      data: {
        mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id,
        judul: "UTS Matematika", jenis: "UJIAN", status: "PUBLISHED",
        durasiMenit: 60, acakSoal: true, acakJawaban: true, sekaliAkses: true,
        kelas: { create: [{ kelasId: kUts.id, jamMulai, jamSelesai }] },
      },
    });
    for (let i = 0; i < soalUts.length; i++) {
      await prisma.ujianSoal.create({ data: { ujianId: utsKelasIni.id, soalId: soalUts[i].soalId, urutan: i + 1, poin: soalUts[i].poin } });
    }
    if (kUts.id === kelas5B.id) utsUntukKelas5B = utsKelasIni;
  }
  const uts = utsUntukKelas5B!;

  const soalIdList = soalUts.map((s) => s.soalId);
  const hasilSimulasi = [
    { siswa: siswa5B[0], jawabanBenar: [true, true, true, true], menit: 43, konfirmasi: true }, // Ahmad Fauzi — demo U-26 sudah dikonfirmasi + komentar (U-27)
    { siswa: siswa5B[2], jawabanBenar: [true, false, true, true], menit: 52, konfirmasi: false }, // menunggu konfirmasi
    { siswa: siswa5B[3], jawabanBenar: [false, true, false, true], menit: 38, konfirmasi: false },
  ];

  for (const h of hasilSimulasi) {
    const mulai = new Date(Date.now() - h.menit * 60 * 1000 - 5 * 60 * 1000);
    const selesai = new Date(mulai.getTime() + h.menit * 60 * 1000);
    const pengerjaan = await prisma.ujianPengerjaan.create({
      data: { ujianId: uts.id, siswaId: h.siswa.id, status: "SELESAI", soalUrutan: JSON.stringify(acak(soalIdList)), waktuMulai: mulai, waktuSelesai: selesai },
    });

    let total = 0;
    const pgSoal = [soalPecahan, soalBilangan, soalFPB];
    for (let i = 0; i < pgSoal.length; i++) {
      const benar = h.jawabanBenar[i];
      const kunci = Number(pgSoal[i].kunciJawaban);
      const jawabanPG = benar ? kunci : (kunci + 1) % 4;
      const skor = benar ? 20 : 0;
      total += skor;
      await prisma.ujianJawaban.create({ data: { pengerjaanId: pengerjaan.id, soalId: pgSoal[i].id, opsiUrutan: JSON.stringify(acak([0, 1, 2, 3])), jawabanPG, benar, skor } });
    }
    const benarSingkat = h.jawabanBenar[3];
    await prisma.ujianJawaban.create({ data: { pengerjaanId: pengerjaan.id, soalId: soalSingkatDiskon.id, jawabanTeks: benarSingkat ? "43200" : "40000", benar: benarSingkat, skor: benarSingkat ? 20 : 0 } });
    total += benarSingkat ? 20 : 0;

    const esaiSkor = h.konfirmasi ? 18 : null;
    await prisma.ujianJawaban.create({
      data: {
        pengerjaanId: pengerjaan.id, soalId: soalEsaiUntung.id,
        jawabanTeks: "Harga beli per kg = 288.000/24 = 12.000. Untung 15% = 1.800. Harga jual = 12.000 + 1.800 = 13.800 per kg.",
        skor: esaiSkor,
        dinilaiOlehId: h.konfirmasi ? rina.akun.id : undefined,
      },
    });
    total += esaiSkor ?? 0;

    await prisma.ujianPengerjaan.update({
      where: { id: pengerjaan.id },
      data: {
        nilaiTotal: total,
        koreksiDikonfirmasi: h.konfirmasi,
        dikonfirmasiPada: h.konfirmasi ? new Date() : null,
        komentarGuru: h.konfirmasi ? "Sudah bagus di aljabar & FPB, masih perlu latihan soal cerita aritmatika sosial ya." : null,
      },
    });
  }

  const uas = await prisma.ujian.create({
    data: { mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, judul: "UAS Matematika", jenis: "UJIAN", status: "DRAFT", acakSoal: true, acakJawaban: true, sekaliAkses: true, kelas: { create: [{ kelasId: kelas5B.id }] } },
  });
  await prisma.ujianSoal.create({ data: { ujianId: uas.id, soalId: soalPecahan.id, urutan: 1, poin: 50 } });
  await prisma.ujianSoal.create({ data: { ujianId: uas.id, soalId: soalEsaiUntung.id, urutan: 2, poin: 50 } });

  await prisma.ujian.create({
    data: { mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id, judul: "Latihan Pecahan", jenis: "LATIHAN", status: "PUBLISHED", acakSoal: true, acakJawaban: true, sekaliAkses: false, kelas: { create: [{ kelasId: kelas4A.id }] } },
  });

  // 1.23 — soal Pilihan Ganda Nilai Minus (2 mode pengurangan: persen & poin) + 1 esai berdurasi,
  // dipakai di 1 kuis demo yang jawabannya sengaja salah supaya potongan nilainya kelihatan jalan.
  console.log("📝 Membuat soal Nilai Minus & esai berdurasi + kuis demo (1.23)...");
  const soalMinusPersen = await prisma.soal.create({
    data: {
      sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id,
      jenis: "PILIHAN_GANDA_MINUS",
      pertanyaan: "1/2 + 1/3 = …",
      opsi: JSON.stringify(["5/6", "2/5", "1/6", "3/5"]), kunciJawaban: "0",
      topik: "Pecahan", tingkatKesulitan: "sedang", poinDefault: 20,
      penguranganMode: "PERSEN", penguranganNilai: 25,
    },
  });
  const soalMinusPoin = await prisma.soal.create({
    data: {
      sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id,
      jenis: "PILIHAN_GANDA_MINUS",
      pertanyaan: "Hasil dari 7 x 6 adalah…",
      opsi: JSON.stringify(["42", "36", "48", "40"]), kunciJawaban: "0",
      topik: "Perkalian", tingkatKesulitan: "mudah", poinDefault: 20,
      penguranganMode: "POIN", penguranganNilai: 5,
    },
  });
  const soalEsaiDurasi = await prisma.soal.create({
    data: {
      sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id,
      jenis: "ESAI", pertanyaan: "Jelaskan langkah menyamakan penyebut pada 1/2 + 1/3.",
      topik: "Pecahan", tingkatKesulitan: "sedang", poinDefault: 20, durasiDetik: 180,
    },
  });
  const kuisMinus = await prisma.ujian.create({
    data: {
      mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id,
      judul: "Kuis Nilai Minus & Esai Berdurasi", jenis: "LATIHAN", status: "PUBLISHED",
      durasiMenit: 30, acakSoal: false, acakJawaban: false, sekaliAkses: false,
      modeHasil: "OTOMATIS_SUBMIT",
      kelas: { create: [{ kelasId: kelas5B.id }] },
    },
  });
  await prisma.ujianSoal.create({ data: { ujianId: kuisMinus.id, soalId: soalMinusPersen.id, urutan: 1, poin: 20 } });
  await prisma.ujianSoal.create({ data: { ujianId: kuisMinus.id, soalId: soalMinusPoin.id, urutan: 2, poin: 20 } });
  await prisma.ujianSoal.create({ data: { ujianId: kuisMinus.id, soalId: soalEsaiDurasi.id, urutan: 3, poin: 20 } });

  const pengerjaanMinus = await prisma.ujianPengerjaan.create({
    data: {
      ujianId: kuisMinus.id, siswaId: siswa5B[4].id, status: "SELESAI",
      soalUrutan: JSON.stringify([soalMinusPersen.id, soalMinusPoin.id, soalEsaiDurasi.id]),
      waktuMulai: new Date(Date.now() - 20 * 60000), waktuSelesai: new Date(Date.now() - 5 * 60000),
    },
  });
  // Kedua jawaban PG-Minus di bawah SALAH (jawabanPG=1, kunci=0) — skor 20-25%=15 (persen) dan 20-5=15 (poin).
  await prisma.ujianJawaban.create({ data: { pengerjaanId: pengerjaanMinus.id, soalId: soalMinusPersen.id, jawabanPG: 1, benar: false, skor: 15 } });
  await prisma.ujianJawaban.create({ data: { pengerjaanId: pengerjaanMinus.id, soalId: soalMinusPoin.id, jawabanPG: 1, benar: false, skor: 15 } });
  await prisma.ujianJawaban.create({ data: { pengerjaanId: pengerjaanMinus.id, soalId: soalEsaiDurasi.id, jawabanTeks: "Samakan penyebut pakai KPK dulu, baru dijumlahkan.", skor: 18, dinilaiOlehId: rina.akun.id } });
  await prisma.ujianPengerjaan.update({ where: { id: pengerjaanMinus.id }, data: { nilaiTotal: 15 + 15 + 18, koreksiDikonfirmasi: true, dikonfirmasiPada: new Date() } });

  // 1.23 — ujian dgn mode hasil JADWAL_MANUAL, jadwalnya sengaja di masa lalu supaya hasilnya
  // kelihatan "sudah kebuka" begitu diseed (melengkapi mode SETELAH_JADWAL_BERAKHIR yg jadi default
  // di ujian2 lain & OTOMATIS_SUBMIT di kuisMinus di atas — jadi ketiga mode kepakai di data demo).
  const ujianJadwalManual = await prisma.ujian.create({
    data: {
      mapelId: mapelMap["Matematika"], dibuatOlehId: rina.akun.id,
      judul: "Kuis Bilangan Bulat (Jadwal Manual)", jenis: "LATIHAN", status: "PUBLISHED",
      acakSoal: true, acakJawaban: true, sekaliAkses: true,
      modeHasil: "JADWAL_MANUAL", jadwalHasilManual: new Date(Date.now() - 60 * 60000),
      kelas: { create: [{ kelasId: kelas5B.id, jamMulai: new Date(Date.now() - 3 * 3600000), jamSelesai: new Date(Date.now() - 2 * 3600000) }] },
    },
  });
  await prisma.ujianSoal.create({ data: { ujianId: ujianJadwalManual.id, soalId: soalBilangan.id, urutan: 1, poin: 100 } });

  // 1.20, diminta eksplisit: 6-9 ujian PER MAPEL per kelas (bukan cuma per kelas) — supaya waktu
  // murid/ortu buka rata-rata nilai satu mapel, daftar ujiannya panjang & realistis. Tiap ujian 20
  // soal dari bank mapel itu. UjianSoal/UjianJawaban pakai createMany (bukan create satu-satu) krn
  // volumenya jauh lebih besar dari sebelumnya (24 kelas x ~8 mapel x 6-9 ujian).
  console.log("▤ Membuat ujian per mapel per kelas (6-9/mapel, 20 soal/ujian)...");
  const semuaSoal = await prisma.soal.findMany();
  const soalByMapel = new Map<string, typeof semuaSoal>();
  for (const s of semuaSoal) {
    if (!s.mapelId) continue; // soal global superadmin (kalau ada) tak dipakai generator ujian dummy ini
    const cur = soalByMapel.get(s.mapelId) ?? [];
    cur.push(s);
    soalByMapel.set(s.mapelId, cur);
  }
  const JUDUL_UJIAN = ["Ulangan Harian", "Kuis", "Penilaian Tengah Bab", "Latihan Soal", "Penilaian Akhir Bab", "Tes Formatif"];
  const JENIS_PENILAIAN_URUT = ["HARIAN", "HARIAN", "HARIAN", "HARIAN", "UTS", "HARIAN", "HARIAN", "UAS"] as const;
  for (const info of semuaKelasInfo) {
    const daftarPengajar = penugasanByKelas.get(info.kelas.id) ?? [];

    for (const pengajar of daftarPengajar) {
      const soalMapelIni = soalByMapel.get(pengajar.mapelId) ?? [];
      if (soalMapelIni.length === 0) continue;
      const mapelNama = Object.entries(mapelMap).find(([, id]) => id === pengajar.mapelId)?.[0] ?? "Umum";
      const targetJumlah = 6 + Math.floor(Math.random() * 4); // 6-9

      for (let n = 0; n < targetJumlah; n++) {
        const judulUjian = JUDUL_UJIAN[n % JUDUL_UJIAN.length];

        // Variasi status: draft / berlangsung (jamSelesai depan) / selesai (jamSelesai lewat) / latihan.
        const variasi = n % 4;
        const jenis = variasi === 3 ? "LATIHAN" : "UJIAN";
        const status = variasi === 0 ? "DRAFT" : "PUBLISHED";
        const jenisPenilaian = JENIS_PENILAIAN_URUT[n % JENIS_PENILAIAN_URUT.length];
        const soalDipakai = acak(soalMapelIni).slice(0, Math.min(20, soalMapelIni.length));
        if (soalDipakai.length === 0) continue;

        const ujianBaru = await prisma.ujian.create({
          data: {
            mapelId: pengajar.mapelId,
            dibuatOlehId: pengajar.guruAkunId,
            judul: `${judulUjian} ${mapelNama}`,
            jenis,
            status,
            jenisPenilaian,
            durasiMenit: jenis === "UJIAN" ? 30 + (n % 3) * 15 : null,
            acakSoal: true,
            acakJawaban: true,
            sekaliAkses: jenis === "UJIAN",
            kelas:
              status === "PUBLISHED"
                ? {
                    create: [
                      {
                        kelasId: info.kelas.id,
                        jamMulai: variasi === 2 ? new Date(Date.now() - (2 + n) * 86400000) : new Date(Date.now() - 60 * 60 * 1000),
                        jamSelesai: variasi === 2 ? new Date(Date.now() - (1 + n) * 86400000) : new Date(Date.now() + (2 + n) * 60 * 60 * 1000),
                      },
                    ],
                  }
                : { create: [{ kelasId: info.kelas.id }] },
          },
        });
        const poinPerSoal = Math.floor(100 / soalDipakai.length);
        await prisma.ujianSoal.createMany({
          data: soalDipakai.map((s, i) => ({ ujianId: ujianBaru.id, soalId: s.id, urutan: i + 1, poin: poinPerSoal })),
        });

        // Untuk yang statusnya "selesai" (variasi 2), tambahkan beberapa pengerjaan LENGKAP dengan
        // jawaban per soal (1.10, diminta eksplisit) — bukan cuma baris ringkasan nilaiTotal, supaya
        // "lihat jawaban" (guru & murid) benar-benar ada isinya, bisa dicek per soal.
        if (variasi === 2) {
          // 1.20, diperbaiki (ditemukan saat testing) — dulu cuma 5-8 dari 30 murid/kelas yang
          // dikasih riwayat pengerjaan ujian lengkap, sisanya 0 sama sekali di SEMUA mapel (cuma
          // punya baris Nilai rapor tanpa riwayat ujian mentah). Sekarang semua murid kebagian.
          const jumlahKerja = info.siswa.length;
          for (let i = 0; i < jumlahKerja; i++) {
            const mulai = new Date(Date.now() - (3 + n) * 86400000);
            const selesai = new Date(mulai.getTime() + 35 * 60 * 1000);
            const pengerjaanSelesai = await prisma.ujianPengerjaan.create({
              data: {
                ujianId: ujianBaru.id,
                siswaId: info.siswa[i].id,
                status: "SELESAI",
                soalUrutan: JSON.stringify(acak(soalDipakai.map((s) => s.id))),
                waktuMulai: mulai,
                waktuSelesai: selesai,
              },
            });

            let totalNilai = 0;
            const jawabanRows: {
              pengerjaanId: string; soalId: string; opsiUrutan?: string; jawabanPG?: number; jawabanPGMulti?: string;
              jawabanTeks?: string; benar?: boolean; skor: number; dinilaiOlehId?: string;
            }[] = [];
            for (const s of soalDipakai) {
              const benar = (i + n + s.pertanyaan.length) % 3 !== 0; // ~2/3 benar, deterministik
              if (s.jenis === "PILIHAN_GANDA" && s.opsi) {
                const opsiArr: string[] = JSON.parse(s.opsi);
                const kunciIdx = Number(s.kunciJawaban);
                const jawabanPG = benar ? kunciIdx : (kunciIdx + 1) % opsiArr.length;
                const skor = benar ? poinPerSoal : 0;
                totalNilai += skor;
                jawabanRows.push({ pengerjaanId: pengerjaanSelesai.id, soalId: s.id, opsiUrutan: JSON.stringify(acak(opsiArr.map((_, idx) => idx))), jawabanPG, benar, skor });
              } else if (s.jenis === "PILIHAN_GANDA_KOMPLEKS" && s.kunciJawaban) {
                const kunci: number[] = JSON.parse(s.kunciJawaban);
                const skor = benar ? poinPerSoal : 0;
                totalNilai += skor;
                jawabanRows.push({ pengerjaanId: pengerjaanSelesai.id, soalId: s.id, jawabanPGMulti: JSON.stringify(benar ? kunci : kunci.slice(0, 1)), benar, skor });
              } else if (s.jenis === "JAWABAN_SINGKAT") {
                const skor = benar ? poinPerSoal : 0;
                totalNilai += skor;
                jawabanRows.push({ pengerjaanId: pengerjaanSelesai.id, soalId: s.id, jawabanTeks: benar ? (s.kunciJawaban ?? "") : "jawaban keliru", benar, skor });
              } else {
                // ESAI — sudah dikoreksi manual, skor selalu terisi biar konsisten dgn koreksiDikonfirmasi=true di bawah.
                const skor = Math.round(poinPerSoal * (0.6 + ((i + n) % 4) * 0.1));
                totalNilai += skor;
                jawabanRows.push({ pengerjaanId: pengerjaanSelesai.id, soalId: s.id, jawabanTeks: `Jawaban esai murid untuk "${s.pertanyaan.slice(0, 40)}..."`, skor, dinilaiOlehId: pengajar.guruAkunId });
              }
            }
            await prisma.ujianJawaban.createMany({ data: jawabanRows });

            await prisma.ujianPengerjaan.update({
              where: { id: pengerjaanSelesai.id },
              data: {
                nilaiTotal: totalNilai,
                koreksiDikonfirmasi: true,
                dikonfirmasiPada: selesai,
              },
            });
          }
        }
      }
    }
  }

  console.log("✎ Membuat nilai (diderivasi dari hasil ujian & tugas asli)...");
  await generateNilaiDariHasilAsli(sekolah.id);

  console.log("✋ Membuat pengajuan izin contoh...");
  await prisma.pengajuanIzin.create({
    data: { siswaId: ahmadFauzi.id, diajukanOlehId: fauzanAkun.id, tanggal: new Date(), jenis: "IZIN", keterangan: "Ada acara keluarga di luar kota.", status: "MENUNGGU" },
  });
  await prisma.pengajuanIzin.create({
    data: { siswaId: siswa5B[1].id, diajukanOlehId: sriAkun.id, tanggal: new Date(Date.now() - 86400000), jenis: "SAKIT", keterangan: "Demam, ada surat dokter.", status: "DISETUJUI", disetujuiOlehId: rina.akun.id },
  });

  console.log("🔒 Membuat consent UU PDP...");
  await prisma.consentPDP.create({ data: { penggunaId: fauzanAkun.id, disetujui: true, waktuPersetujuan: new Date("2026-07-20") } });
  await prisma.consentPDP.create({ data: { penggunaId: sriAkun.id, disetujui: false } });

  console.log("👁 Membuat catatan supervisi guru...");
  await prisma.catatanSupervisi.create({
    data: { guruId: rina.akun.id, kepsekId: hendra.id, catatan: "Observasi kelas 12 Agu: pengelolaan kelas baik, penjelasan konsep pecahan jelas. Saran: variasikan metode untuk siswa yang lebih lambat." },
  });

  console.log("🎒 Membuat pendaftar PPDB contoh...");
  await prisma.pPDBPendaftar.createMany({
    data: [
      { sekolahId: sekolah.id, namaCalon: "Raka Aditya", jenjangDaftar: "Kelas 1", namaOrtu: "Bpk. Aditya", kontak: "0812-1111-2222", status: "BARU" },
      { sekolahId: sekolah.id, namaCalon: "Zahra Amelia", jenjangDaftar: "Kelas 1", namaOrtu: "Ibu Amelia", kontak: "0813-2222-3333", status: "DITERIMA" },
      { sekolahId: sekolah.id, namaCalon: "Fajar Nugroho", jenjangDaftar: "Kelas 4 (pindahan)", namaOrtu: "Bpk. Nugroho", kontak: "0814-3333-4444", status: "BARU" },
    ],
  });

  console.log("📅 Membuat agenda akademik + libur nasional 2026...");
  await prisma.agendaAkademik.createMany({
    data: [
      { sekolahId: sekolah.id, judul: "Rapat Orang Tua Murid", tanggal: new Date("2026-08-23"), jenis: "Kegiatan" },
      { sekolahId: sekolah.id, judul: "UTS Semester Ganjil", tanggal: new Date("2026-09-15"), jenis: "Ujian" },
      { sekolahId: sekolah.id, judul: "UAS Semester Ganjil", tanggal: new Date("2026-12-08"), jenis: "Ujian" },
      { sekolahId: sekolah.id, judul: "Class Meeting Semester Ganjil", tanggal: new Date("2026-12-15"), jenis: "Kegiatan" },
      // Hari libur nasional Indonesia 2026 (perkiraan, untuk demo F-7)
      { sekolahId: sekolah.id, judul: "Tahun Baru Masehi", tanggal: new Date("2026-01-01"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Tahun Baru Imlek", tanggal: new Date("2026-02-17"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Hari Raya Nyepi", tanggal: new Date("2026-03-19"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Wafat Isa Almasih", tanggal: new Date("2026-04-03"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Hari Raya Idul Fitri", tanggal: new Date("2026-03-20"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Hari Buruh Internasional", tanggal: new Date("2026-05-01"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Kenaikan Isa Almasih", tanggal: new Date("2026-05-14"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Hari Lahir Pancasila", tanggal: new Date("2026-06-01"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Hari Raya Idul Adha", tanggal: new Date("2026-05-27"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Tahun Baru Islam", tanggal: new Date("2026-06-16"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Hari Kemerdekaan RI", tanggal: new Date("2026-08-17"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Maulid Nabi Muhammad SAW", tanggal: new Date("2026-08-25"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "Hari Raya Natal", tanggal: new Date("2026-12-25"), jenis: "Libur" },
    ],
  });

  // ================= JADWAL PELAJARAN (§4.14, direvisi 1.6: jam bebas per guru, tanpa slot baku) =================
  console.log("▥ Menyusun jadwal pelajaran (jam asli, bebas per guru, 24 kelas)...");
  // Jam mengajar riil per "urutan sesi" (bukan lagi slot baku sekolah) — dipakai berurutan
  // saat mengisi jadwal tiap kelas, cuma sebagai pola isian demo yang masuk akal jamnya.
  const JAM_SESI = [
    { mulai: "07:00", selesai: "07:40" },
    { mulai: "07:40", selesai: "08:20" },
    { mulai: "08:40", selesai: "09:20" }, // lompat 08:20-08:40 = istirahat
    { mulai: "09:20", selesai: "10:00" },
    { mulai: "10:00", selesai: "10:40" },
  ];

  const guruBooked = new Set<string>(); // `${guruId}-${hari}-${mulai}`
  const jadwalEntryByKelasGuruHari = new Map<string, string>(); // utk presensi demo nanti: `${kelasId}-${guruId}` -> jadwalEntryId pertama
  for (const info of semuaKelasInfo) {
    const daftar = penugasanByKelas.get(info.kelas.id) ?? [];
    let idx = 0;
    for (let hari = 1; hari <= 5 && idx < daftar.length; hari++) {
      for (const sesi of JAM_SESI) {
        if (idx >= daftar.length) break;
        const { mapelId, guruId } = daftar[idx];
        const key = `${guruId}-${hari}-${sesi.mulai}`;
        if (guruBooked.has(key)) continue;
        const entry = await prisma.jadwalEntry.create({
          data: { kelasId: info.kelas.id, mapelId, guruId, hari, jamMulai: sesi.mulai, jamSelesai: sesi.selesai, tahunAjaranId: tahunAjaran.id },
        });
        guruBooked.add(key);
        if (!jadwalEntryByKelasGuruHari.has(`${info.kelas.id}-${guruId}`)) {
          jadwalEntryByKelasGuruHari.set(`${info.kelas.id}-${guruId}`, entry.id);
        }
        idx++;
      }
    }
  }

  console.log("✓ Membuat presensi guru contoh (AG)...");
  const entryRinaDi5B = jadwalEntryByKelasGuruHari.get(`${kelas5B.id}-${rina.profil.id}`);
  const entrySolihinDi5B = jadwalEntryByKelasGuruHari.get(`${kelas5B.id}-${solihin.profil.id}`);
  const today = new Date();
  const tanggalOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const kemarinOnly = new Date(tanggalOnly.getTime() - 86400000);
  if (entryRinaDi5B) {
    await prisma.presensiGuru.create({ data: { jadwalEntryId: entryRinaDi5B, tanggal: kemarinOnly, hadir: true, sumber: "OTOMATIS_ABSENSI" } });
  }
  if (entrySolihinDi5B) {
    await prisma.presensiGuru.create({ data: { jadwalEntryId: entrySolihinDi5B, tanggal: kemarinOnly, hadir: false, sumber: "MANUAL", keterangan: "Izin acara keluarga" } });
  }

  // ================= RPP & CAPAIAN PEMBELAJARAN (§4.16) =================
  console.log("▤ Membuat Capaian Pembelajaran & RPP...");
  const cp1 = await prisma.capaianPembelajaran.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], kode: "CP.5.1", deskripsi: "Siswa mampu menjumlahkan dan mengurangkan pecahan berpenyebut sama maupun berbeda.", tingkat: 5 },
  });
  const cp2 = await prisma.capaianPembelajaran.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["Matematika"], kode: "CP.5.2", deskripsi: "Siswa mampu menentukan FPB dan KPK dari dua bilangan.", tingkat: 5 },
  });
  await prisma.capaianPembelajaran.create({
    data: { sekolahId: sekolah.id, mapelId: mapelMap["IPAS"], kode: "CP.5.3", deskripsi: "Siswa memahami proses fotosintesis pada tumbuhan hijau.", tingkat: 5 },
  });

  const rppPecahan = await prisma.rPP.create({
    data: {
      penggunaId: rina.akun.id, kelasId: kelas5B.id, mapelId: mapelMap["Matematika"], tahunAjaranId: tahunAjaran.id,
      judul: "Pecahan Senilai — Pertemuan 1",
      isi: "**Tujuan:** siswa dapat menjumlahkan pecahan berpenyebut beda.\n\n- Apersepsi 10 menit\n- Penjelasan konsep 20 menit\n- Latihan soal 15 menit\n- Penutup & refleksi 5 menit",
      lampiranUrl: null,
    },
  });
  await prisma.rPPCapaian.create({ data: { rppId: rppPecahan.id, capaianId: cp1.id } });
  await prisma.rPPCapaian.create({ data: { rppId: rppPecahan.id, capaianId: cp2.id } });
  await prisma.materiBelajar.update({ where: { id: materiPecahan.id }, data: { rppId: rppPecahan.id } });
  await prisma.tugas.update({ where: { id: tugasPecahan.id }, data: { rppId: rppPecahan.id } });
  await prisma.ujian.update({ where: { id: uts.id }, data: { rppId: rppPecahan.id } });

  // ================= DISKUSI (§4.17) =================
  // 1.8, diminta eksplisit: dummy tanya-jawab di materi belajar, relate ke akun murid asli (ahmadAkun).
  console.log("💬 Membuat contoh diskusi (relate ke akun murid asli)...");
  const komentarMateri = await prisma.komentarKonten.create({
    data: { penggunaId: ahmadAkun.id, materiId: materiPecahan.id, isi: "Bu, boleh dikasih contoh soal lagi yang lebih susah?" },
  });
  await prisma.komentarKonten.create({
    data: { penggunaId: rina.akun.id, materiId: materiPecahan.id, isi: "Boleh, nanti Ibu tambahkan di latihan minggu depan ya.", parentId: komentarMateri.id },
  });
  await prisma.komentarKonten.create({
    data: { penggunaId: ahmadAkun.id, tugasId: tugasPecahan.id, isi: "Bu, untuk nomor 5 apakah harus disederhanakan?" },
  });

  const materiLainKelas5B = await prisma.materiBelajar.findMany({ where: { kelasId: kelas5B.id, id: { not: materiPecahan.id } } });
  const guruPerMapel: Record<string, { akun: { id: string; nama: string } }> = {
    "Bahasa Indonesia": solihin, IPAS: yuni, PPKn: wulan, "Pendidikan Agama": agama, PJOK: pjok, "Bahasa Inggris": inggris,
  };
  for (const m of materiLainKelas5B.slice(0, 5)) {
    const mapelNama = Object.entries(mapelMap).find(([, id]) => id === m.mapelId)?.[0] ?? "";
    const guruPengampu = guruPerMapel[mapelNama];
    if (!guruPengampu) continue;
    const tanya = await prisma.komentarKonten.create({
      data: { penggunaId: ahmadAkun.id, materiId: m.id, isi: `Bu/Pak, materi ${mapelNama} ini apa ada latihan tambahan?` },
    });
    await prisma.komentarKonten.create({
      data: { penggunaId: guruPengampu.akun.id, materiId: m.id, isi: "Ada, nanti Bapak/Ibu bagikan di pertemuan berikutnya ya.", parentId: tanya.id },
    });
  }

  // 1.23 — Tanya Jawab Kelas (fitur baru, terpisah dari Diskusi/KomentarKonten di atas): 1 thread
  // anonim + 1 thread publik, keduanya dibalas guru — supaya demo "guru tetap lihat nama asli
  // walau anonim" langsung ada datanya begitu diseed.
  console.log("💬 Membuat contoh Tanya Jawab Kelas (1.23 — anonim & publik, balasan guru)...");
  const tanyaAnonim = await prisma.tanyaJawabKelas.create({
    data: {
      kelasId: kelas5B.id, mapelId: mapelMap["Matematika"], penggunaId: ahmadAkun.id, anonim: true,
      isi: "Bu, kalau penyebut pecahannya beda gimana lagi cara nyamainnya ya? Masih suka bingung.",
    },
  });
  await prisma.tanyaJawabKelas.create({
    data: {
      kelasId: kelas5B.id, mapelId: mapelMap["Matematika"], penggunaId: rina.akun.id,
      isi: "Disamakan dulu penyebutnya pakai KPK ya, nanti Ibu ulang lagi pelan-pelan di kelas.",
      parentId: tanyaAnonim.id,
    },
  });
  const tanyaPublik = await prisma.tanyaJawabKelas.create({
    data: {
      kelasId: kelas5B.id, mapelId: mapelMap["Matematika"], penggunaId: ahmadAkun.id, anonim: false,
      isi: "Bu, UTS besok materinya sampai bab berapa ya?",
    },
  });
  await prisma.tanyaJawabKelas.create({
    data: {
      kelasId: kelas5B.id, mapelId: mapelMap["Matematika"], penggunaId: rina.akun.id,
      isi: "Sampai Bab 2 - Pecahan ya, nanti Ibu infokan lagi detailnya di kelas.",
      parentId: tanyaPublik.id,
    },
  });

  // ================= ASESMEN LANJUTAN (§4.9 N-5/N-6) =================
  // 1.8, diminta eksplisit: dummy asesmen deskriptif diperbanyak, sebar ke beberapa kelas/mapel.
  console.log("✒ Membuat asesmen deskriptif (diperbanyak) & Projek P5...");
  await prisma.catatanAsesmen.create({
    data: { siswaId: ahmadFauzi.id, mapelId: mapelMap["Matematika"], penggunaId: rina.akun.id, periode: periodeIni, isi: "Ananda sudah baik dalam operasi hitung, perlu latihan lebih pada soal cerita." },
  });
  await prisma.catatanAsesmen.create({
    data: { siswaId: siswa5B[1].id, mapelId: mapelMap["Matematika"], penggunaId: rina.akun.id, periode: periodeIni, isi: "Perkembangan cukup baik, semangat belajar tinggi." },
  });
  const CATATAN_ASESMEN_TEMPLATE = [
    "Ananda menunjukkan pemahaman yang baik, terus dipertahankan.",
    "Perlu bimbingan lebih pada penerapan konsep ke soal cerita.",
    "Sangat aktif bertanya, rasa ingin tahu tinggi.",
    "Ketelitian dalam mengerjakan soal masih perlu ditingkatkan.",
    "Kemampuan komunikasi & kerja sama kelompok berkembang baik.",
  ];
  const kelasUntukAsesmen = semuaKelasInfo.filter((i) => i.kelas.tingkat >= 3).slice(0, 8);
  for (const info of kelasUntukAsesmen) {
    const daftarPengajar = penugasanByKelas.get(info.kelas.id) ?? [];
    if (daftarPengajar.length === 0) continue;
    const pengajar = daftarPengajar[0];
    for (let i = 0; i < Math.min(3, info.siswa.length); i++) {
      await prisma.catatanAsesmen.create({
        data: {
          siswaId: info.siswa[i].id,
          mapelId: pengajar.mapelId,
          penggunaId: pengajar.guruAkunId,
          periode: periodeIni,
          isi: CATATAN_ASESMEN_TEMPLATE[(i + info.kelas.tingkat) % CATATAN_ASESMEN_TEMPLATE.length],
        },
      });
    }
  }

  const projek = await prisma.projek.create({
    data: { sekolahId: sekolah.id, tahunAjaranId: tahunAjaran.id, tema: "Aksi Hemat Energi di Sekolah", dimensiP5: JSON.stringify(["Bergotong Royong", "Bernalar Kritis"]), dibuatOlehId: rina.akun.id },
  });
  for (let i = 0; i < Math.min(6, siswa5B.length); i++) {
    await prisma.projekPenilaian.create({ data: { projekId: projek.id, siswaId: siswa5B[i].id, dimensi: "Bergotong Royong", capaian: i % 4 === 0 ? "SB" : "BSH" } });
    await prisma.projekPenilaian.create({ data: { projekId: projek.id, siswaId: siswa5B[i].id, dimensi: "Bernalar Kritis", capaian: i % 3 === 0 ? "BSH" : "MB" } });
  }

  // ================= SISWA 360°: CATATAN GURU & PRESTASI =================
  console.log("📇 Membuat catatan guru (lintas guru) & prestasi siswa...");
  await prisma.catatanSiswa.create({
    data: { siswaId: ahmadFauzi.id, penggunaId: rina.akun.id, mapelKonteks: "Matematika", isi: "Ahmad cukup aktif bertanya di kelas, tapi kadang kurang teliti saat mengerjakan soal hitungan panjang." },
  });
  await prisma.catatanSiswa.create({
    data: { siswaId: ahmadFauzi.id, penggunaId: solihin.akun.id, mapelKonteks: "Bahasa Indonesia", isi: "Kemampuan membaca lancar, perlu didorong lebih percaya diri saat presentasi di depan kelas." },
  });
  await prisma.catatanSiswa.create({
    data: { siswaId: ahmadFauzi.id, penggunaId: yuni.akun.id, mapelKonteks: "IPAS", isi: "Sangat antusias saat praktikum, senang bertanya hal-hal baru." },
  });

  await prisma.prestasiSiswa.create({
    data: { siswaId: ahmadFauzi.id, judul: "Juara 1 Lomba Cerdas Cermat Matematika Tingkat Kecamatan", tanggal: new Date("2026-06-10"), dicatatOlehId: rina.akun.id, keterangan: "Mewakili sekolah dan meraih juara 1." },
  });
  await prisma.prestasiSiswa.create({
    data: { siswaId: siswa5B[1].id, judul: "Juara 2 Lomba Mewarnai", tanggal: new Date("2026-05-15"), dicatatOlehId: rina.akun.id },
  });

  // ================= RIWAYAT SISWA (F-2/F-3, 1.7): contoh siswa lulus/pindah/mutasi keluar =================
  console.log("📜 Membuat contoh Riwayat Siswa (lulus/pindah/mutasi keluar)...");
  const contohRiwayat = [siswaKelas6A[siswaKelas6A.length - 1], siswaKelas6A[siswaKelas6A.length - 2], siswaKelas1A[siswaKelas1A.length - 1]].filter(Boolean);
  if (contohRiwayat[0]) {
    await prisma.siswa.update({
      where: { id: contohRiwayat[0].id },
      data: { aktif: false, statusKeluar: "LULUS", tanggalKeluar: new Date("2026-06-20"), keteranganKeluar: "Lulus dari SD Harapan Bangsa tahun ajaran 2025/2026" },
    });
  }
  if (contohRiwayat[1]) {
    await prisma.siswa.update({
      where: { id: contohRiwayat[1].id },
      data: { aktif: false, statusKeluar: "PINDAH_SEKOLAH", tanggalKeluar: new Date("2026-05-10"), keteranganKeluar: "Pindah mengikuti orang tua pindah tugas ke Surabaya" },
    });
  }
  if (contohRiwayat[2]) {
    await prisma.siswa.update({
      where: { id: contohRiwayat[2].id },
      data: { aktif: false, statusKeluar: "MUTASI_KELUAR", tanggalKeluar: new Date("2026-07-05"), keteranganKeluar: "Pindah ke SD swasta lain di dekat rumah baru" },
    });
  }

  // ================= TAHUN AJARAN HISTORIS (1.8, diminta eksplisit: 3 tahun ajaran) =================
  console.log("🗓 Membuat 2 tahun ajaran historis (non-aktif) — utk demo riwayat kinerja guru MG-5...");
  async function buatTahunHistoris(label: string, mulai: string, selesai: string) {
    const ta = await prisma.tahunAjaran.create({
      data: { sekolahId: sekolah.id, label, semester: "Genap", aktif: false, mulai: new Date(mulai), selesai: new Date(selesai) },
    });
    const kelasHistorisByTingkat = new Map<number, Awaited<ReturnType<typeof prisma.kelas.create>>>();
    for (let tingkat = 1; tingkat <= 6; tingkat++) {
      const kelasHistoris = await prisma.kelas.create({
        data: { sekolahId: sekolah.id, tahunAjaranId: ta.id, nama: `${tingkat}A`, tingkat },
      });
      kelasHistorisByTingkat.set(tingkat, kelasHistoris);
      const dataSiswaHistoris = buatDataSiswa(8 + Math.floor(Math.random() * 4));
      const siswaHistoris = await buatSiswa(dataSiswaHistoris, kelasHistoris.id, tingkat);
      // 1.9 — siswa dummy tahun historis BUKAN siswa aktif tahun ini; kalau dibiarkan aktif:true
      // (default), mereka ikut kehitung di query "siswa aktif sekolah" manapun yang cuma filter
      // sekolahId+aktif tanpa scoping tahun ajaran (K-1 total siswa, daftar siswa, dst) — jadi
      // seolah beberapa murid "nyata" cuma punya nilai 1 mapel. Tandai nonaktif dari awal.
      await prisma.siswa.updateMany({ where: { id: { in: siswaHistoris.map((s) => s.id) } }, data: { aktif: false } });

      // Wali & pengajar: reuse guru inti yang sama supaya riwayatnya nyambung ke akun yang bisa dilogin.
      const waliHistoris = tingkat <= 3 ? [made, citra, dedi][tingkat - 1] : tingkat === 5 ? rina : tingkat === 4 ? solihin : wulan;
      await prisma.kelas.update({ where: { id: kelasHistoris.id }, data: { waliKelasId: waliHistoris.akun.id } });
      await prisma.penugasanGuru.create({ data: { guruId: rina.profil.id, kelasId: kelasHistoris.id, mapelId: mapelMap["Matematika"] } });
      await prisma.penugasanGuru.create({ data: { guruId: solihin.profil.id, kelasId: kelasHistoris.id, mapelId: mapelMap["Bahasa Indonesia"] } });

      // Data KPI ringan (bukan penuh 20 hari seperti tahun aktif) — cukup utk angka non-nol di MG-5.
      for (let i = 0; i < 5; i++) {
        const tgl = new Date(mulai);
        tgl.setDate(tgl.getDate() + i * 7);
        for (const s of siswaHistoris) {
          await prisma.absensi.create({ data: { siswaId: s.id, kelasId: kelasHistoris.id, tanggal: tgl, status: i % 6 === 0 ? "IZIN" : "HADIR" } });
        }
      }
      for (const s of siswaHistoris) {
        await prisma.nilai.upsert({
          where: { siswaId_kelasId_mapelId_komponen_judul: { siswaId: s.id, kelasId: kelasHistoris.id, mapelId: mapelMap["Matematika"], komponen: "Ulangan Harian", judul: `UH 1 - Matematika (${label})` } },
          update: {},
          create: { siswaId: s.id, kelasId: kelasHistoris.id, mapelId: mapelMap["Matematika"], komponen: "Ulangan Harian", judul: `UH 1 - Matematika (${label})`, skor: 65 + Math.floor(Math.random() * 30) },
        });
      }
    }
    return { ta, kelasHistorisByTingkat };
  }
  await buatTahunHistoris("2024/2025", "2025-01-13", "2025-06-20");
  await buatTahunHistoris("2025/2026", "2026-01-12", "2026-06-19");

  console.log("📣 Membuat pengumuman sekolah...");
  await prisma.pengumumanSekolah.createMany({
    data: [
      { sekolahId: sekolah.id, judul: "Libur Semester Ganjil", isi: "Libur semester ganjil dimulai 20 Desember 2026 dan sekolah kembali aktif 12 Januari 2027. Selamat berlibur!", dibuatOlehId: hendra.id },
      { sekolahId: sekolah.id, judul: "Jadwal Pembagian Rapor", isi: "Pembagian rapor semester ganjil dilaksanakan Sabtu, 19 Desember 2026 pukul 08.00 - 12.00 di kelas masing-masing.", dibuatOlehId: tono.id },
      { sekolahId: sekolah.id, judul: "Pembayaran SPP & Buku Paket", isi: "Mohon segera melunasi SPP bulan berjalan serta Buku Paket/Seragam yang belum dibayar melalui menu Keuangan/SPP.", dibuatOlehId: tono.id },
    ],
  });

  // ================= SUPERADMIN & SEKOLAH LAIN (multi-tenant demo) =================
  console.log("🛡 Membuat akun superadmin & beberapa sekolah lain...");
  const superadmin = await prisma.pengguna.create({
    data: {
      sekolahId: null,
      nama: "Admin Selaras Ajar",
      email: "admin@selarasajar.id",
      passwordHash: hash,
      peran: "SUPERADMIN",
    },
  });

  // 1.20 — Kurikulum Merdeka dibuat superadmin & jadi pilihan dropdown di Master Data kepsek
  // (bukan cuma preset hardcode lib/kurikulum.ts). `jenjang` dicocokkan persis oleh
  // getKurikulumUntukJenjang(), jadi satu record per jenjang (bukan satu utk semua) — tetap
  // "superadmin bikin sekali per jenjang, banyak sekolah sejenjang itu mengadopsinya".
  const kurikulumByJenjang: Record<string, Awaited<ReturnType<typeof prisma.kurikulum.create>>> = {};
  for (const j of ["SD", "SMP", "SMA", "SMK"]) {
    kurikulumByJenjang[j] = await prisma.kurikulum.create({
      data: {
        nama: "Kurikulum Merdeka",
        jenjang: j,
        dibuatOlehId: superadmin.id,
        mapel: { createMany: { data: mapelData.map((m) => ({ nama: m.nama, kkm: m.kkm })) } },
      },
    });
  }
  await prisma.sekolah.update({
    where: { id: sekolah.id },
    data: { kurikulumId: kurikulumByJenjang["SD"].id, latitude: -6.9147, longitude: 107.6098 },
  });

  // 1.22 — bank soal global (superadmin, sekolahId null) sebelumnya NOL sama sekali (soal.dibuatOleh
  // guru penuh, bank superadmin kosong). Sekarang superadmin ikut punya bank soal "siap pakai" per
  // mapel, dicocokkan by mapelNama (bukan mapelId, krn lintas sekolah) — muncul ke SEMUA guru di
  // getBankSoal() dgn label "Dari Selaras Ajar", terpisah dari soal privat masing-masing sekolah.
  console.log("📝 Membuat bank soal global superadmin (visible ke semua guru, label 'Dari Selaras Ajar')...");
  for (const [mapelNamaGlobal, list] of Object.entries(soalTemplatePerMapel)) {
    for (const t of list) {
      await prisma.soal.create({
        data: {
          sekolahId: null,
          mapelNama: mapelNamaGlobal,
          dibuatOlehId: superadmin.id,
          jenis: t.jenis,
          pertanyaan: t.pertanyaan,
          opsi: t.opsi ? JSON.stringify(t.opsi) : null,
          kunciJawaban: t.kunci ?? null,
          topik: t.topik,
          tingkatKesulitan: "sedang",
          poinDefault: 20,
          rekomendasiKelas: "Semua jenjang",
        },
      });
    }
  }
  // IPA (dipakai sekolah jenjang SMP, beda nama dari IPAS-nya SD) — alias subset soal IPAS di atas.
  for (const t of soalTemplatePerMapel.IPAS.slice(0, 4)) {
    await prisma.soal.create({
      data: {
        sekolahId: null,
        mapelNama: "IPA",
        dibuatOlehId: superadmin.id,
        jenis: t.jenis,
        pertanyaan: t.pertanyaan,
        opsi: t.opsi ? JSON.stringify(t.opsi) : null,
        kunciJawaban: t.kunci ?? null,
        topik: t.topik,
        tingkatKesulitan: "sedang",
        poinDefault: 20,
        rekomendasiKelas: "SMP semua kelas",
      },
    });
  }
  // Volume tambahan per mapel (pola sama filler bank soal sekolah utama di atas) supaya bank
  // global benar-benar "siap pakai" (bukan cuma segelintir contoh).
  for (const [mapelNamaGlobal, topikList] of Object.entries(topikPerMapel)) {
    for (let i = 0; i < 15; i++) {
      const topik = topikList[i % topikList.length];
      await prisma.soal.create({
        data: {
          sekolahId: null,
          mapelNama: mapelNamaGlobal,
          dibuatOlehId: superadmin.id,
          jenis: "PILIHAN_GANDA",
          pertanyaan: `[Bank Soal Selaras Ajar] Latihan ${topik} — variasi ${i + 1}`,
          opsi: JSON.stringify([
            `Berkaitan langsung dengan ${topik}`,
            "Tidak relevan dengan topik ini",
            "Hanya berlaku pada topik lain",
            "Bukan bagian dari pelajaran ini",
          ]),
          kunciJawaban: "0",
          topik,
          tingkatKesulitan: ["mudah", "sedang", "sulit"][i % 3],
          poinDefault: 10,
          rekomendasiKelas: "Semua jenjang",
        },
      });
    }
  }

  // 1.19, diminta eksplisit — sekolah lain tak lagi cuma "kerangka" (kelas+siswa doang, tanpa
  // nilai/absensi/ujian/dst). Tiap sekolah lain sekarang dapat ekosistem LENGKAP (semua fitur ada
  // datanya, tak ada yang kosong), dan datanya (nama/NPSN/alamat/kecamatan/kabupaten/provinsi)
  // diambil dari sekolah SUNGGUHAN lewat integrasi api.co.id (1.12) — bukan nama fiktif lagi.
  async function buatSekolahLain(opts: {
    nama: string;
    jenjang: string;
    npsn: string;
    alamat: string;
    kecamatan: string;
    kabupatenKota: string;
    provinsi: string;
    aktif: boolean;
    emailDomain: string;
    kepsekNama: string;
    namaKelas: string[]; // mis. ["7A","8A","9A"]
    latitude: number;
    longitude: number;
  }) {
    const sekolahLain = await prisma.sekolah.create({
      data: {
        nama: opts.nama, jenjang: opts.jenjang, npsn: opts.npsn, alamat: opts.alamat,
        kecamatan: opts.kecamatan, kabupatenKota: opts.kabupatenKota, provinsi: opts.provinsi, aktif: opts.aktif,
        latitude: opts.latitude, longitude: opts.longitude,
        kurikulumId: kurikulumByJenjang[opts.jenjang]?.id ?? null,
      },
    });
    const taLain = await prisma.tahunAjaran.create({
      data: { sekolahId: sekolahLain.id, label: "2026/2027", semester: "Ganjil", aktif: true, mulai: new Date("2026-07-14"), selesai: new Date("2026-12-19") },
    });
    await prisma.gradeScale.createMany({
      data: [
        { sekolahId: sekolahLain.id, minSkor: 100, maxSkor: 100, label: "Sempurna", urutan: 1 },
        { sekolahId: sekolahLain.id, minSkor: 80, maxSkor: 99, label: "Baik", urutan: 2 },
        { sekolahId: sekolahLain.id, minSkor: 70, maxSkor: 79, label: "Cukup", urutan: 3 },
        { sekolahId: sekolahLain.id, minSkor: 0, maxSkor: 69, label: "Perlu Bimbingan", urutan: 4 },
      ],
    });

    const kepsekAkun = await prisma.pengguna.create({
      data: { sekolahId: sekolahLain.id, nama: opts.kepsekNama, email: `kepsek@${opts.emailDomain}`, passwordHash: hash, peran: "KEPALA_SEKOLAH" },
    });

    // Sains & mapel kejuruan disesuaikan jenjang (Kurikulum Merdeka) — bukan seragam SD utk semua
    // sekolah lain seperti sebelumnya: SMP pakai IPA terpisah (bukan IPAS gabungan ala SD/SMK),
    // dan SMK dapat tambahan mapel kejuruan TKJ nyata karena namaKelas sekolah SMK di seed ini "TKJ".
    const mapelSainsLain = opts.jenjang === "SMP" ? "IPA" : "IPAS";
    // Kelompok umum jenjang lain sudah tercakup lewat Pendidikan Agama/PPKn/Bahasa Indonesia/
    // Matematika/mapelSainsLain di atas — di sini cuma ditambahkan mapel kejuruan konsentrasi TKJ
    // yang sungguh spesifik ke jurusan sekolah SMK ini (bukan mapel kejuruan generik).
    const mapelKejuruanTKJ = opts.jenjang === "SMK" ? ["Dasar-Dasar Teknik Jaringan Komputer dan Telekomunikasi", "Pemrograman Dasar"] : [];
    const MAPEL_LAIN = ["Pendidikan Agama", "PPKn", "Bahasa Indonesia", "Matematika", mapelSainsLain, ...mapelKejuruanTKJ];
    const mapelLainMap: Record<string, string> = {};
    for (const m of MAPEL_LAIN) {
      const created = await prisma.mataPelajaran.create({ data: { sekolahId: sekolahLain.id, nama: m, kkm: 70 } });
      mapelLainMap[m] = created.id;
      await prisma.bobotKomponen.createMany({
        data: [
          { mapelId: created.id, komponen: "Ulangan Harian", persentase: 30 },
          { mapelId: created.id, komponen: "Tugas", persentase: 20 },
          { mapelId: created.id, komponen: "UTS", persentase: 20 },
          { mapelId: created.id, komponen: "UAS", persentase: 30 },
        ],
      });
    }
    // 1.20, diminta eksplisit — contoh KKM UTS/UAS beda dari KKM harian.
    await prisma.mataPelajaran.update({ where: { id: mapelLainMap["Matematika"] }, data: { kkmUTS: 75, kkmUAS: 80 } });

    // 1 guru spesialis Agama lintas semua kelas + 1 wali per kelas yg mengajar 4 mapel sisanya ke kelasnya sendiri.
    const agamaLainAkun = await prisma.pengguna.create({
      data: { sekolahId: sekolahLain.id, nama: `${opts.kepsekNama.startsWith("Bu") ? "Pak" : "Bu"} Guru Agama`, email: `agama@${opts.emailDomain}`, passwordHash: hash, peran: "GURU", telepon: `081311100000` },
    });
    const agamaLainProfil = await prisma.guruProfil.create({ data: { penggunaId: agamaLainAkun.id, mapelUtama: "Pendidikan Agama" } });
    // 1.20, diminta eksplisit — contoh akun multi-role: guru Agama merangkap TU, bisa switch peran.
    await prisma.penggunaPeran.create({ data: { penggunaId: agamaLainAkun.id, sekolahId: sekolahLain.id, peran: "TU" } });

    // 1.23 — Bab (master data per-mapel) dibuat SEKALI per mapel di sini, direuse lintas semua
    // kelas di bawah (bukan 1 row per kelas) — persis maksud fitur "bab reusable".
    const babLainMap: Record<string, string> = {};
    for (const m of MAPEL_LAIN) {
      const bab = await prisma.bab.create({ data: { sekolahId: sekolahLain.id, mapelId: mapelLainMap[m], nama: "Bab 1" } });
      babLainMap[m] = bab.id;
    }

    type SiswaLain = Awaited<ReturnType<typeof prisma.siswa.create>>;
    const kelasList: { kelas: Awaited<ReturnType<typeof prisma.kelas.create>>; siswa: SiswaLain[]; waliAkunId: string; waliProfilId: string }[] = [];

    for (let ki = 0; ki < opts.namaKelas.length; ki++) {
      const namaKelas = opts.namaKelas[ki];
      const waliAkun = await prisma.pengguna.create({
        data: { sekolahId: sekolahLain.id, nama: `${ki % 2 === 0 ? "Bu" : "Pak"} Wali ${namaKelas}`, email: `wali${ki + 1}@${opts.emailDomain}`, passwordHash: hash, peran: "GURU", telepon: `08131120000${ki}` },
      });
      const waliProfil = await prisma.guruProfil.create({ data: { penggunaId: waliAkun.id, mapelUtama: "Guru Kelas" } });

      const kelasLain = await prisma.kelas.create({
        data: { sekolahId: sekolahLain.id, tahunAjaranId: taLain.id, nama: namaKelas, tingkat: parseInt(namaKelas) || ki + 1, waliKelasId: waliAkun.id },
      });

      const penugasanRowsLain: { guruId: string; kelasId: string; mapelId: string }[] = MAPEL_LAIN.map((m) => ({
        guruId: m === "Pendidikan Agama" ? agamaLainProfil.id : waliProfil.id,
        kelasId: kelasLain.id,
        mapelId: mapelLainMap[m],
      }));
      await prisma.penugasanGuru.createMany({ data: penugasanRowsLain });

      const siswaBaru: SiswaLain[] = [];
      for (const s of buatDataSiswa(30)) {
        const siswa = await prisma.siswa.create({
          data: { sekolahId: sekolahLain.id, kelasId: kelasLain.id, nisn: s.nisn, nama: s.nama, jenisKelamin: s.jk, aktif: true },
        });
        siswaBaru.push(siswa);
      }
      kelasList.push({ kelas: kelasLain, siswa: siswaBaru, waliAkunId: waliAkun.id, waliProfilId: waliProfil.id });
    }

    // Akun ortu+murid contoh, cuma utk siswa pertama kelas pertama (biar bisa login & didemokan).
    const siswaContoh = kelasList[0].siswa[0];
    const ortuAkun = await prisma.pengguna.create({
      data: { sekolahId: sekolahLain.id, nama: `Ortu ${siswaContoh.nama.split(" ")[0]}`, email: `ortu@${opts.emailDomain}`, passwordHash: hash, peran: "ORANG_TUA", jenisKelamin: "L", telepon: "081399900001" },
    });
    await prisma.waliSiswa.create({ data: { siswaId: siswaContoh.id, penggunaId: ortuAkun.id, hubungan: "Ayah" } });
    const muridAkun = await prisma.pengguna.create({
      data: { sekolahId: sekolahLain.id, nama: siswaContoh.nama, email: `murid@${opts.emailDomain}`, passwordHash: hash, peran: "MURID" },
    });
    await prisma.siswa.update({ where: { id: siswaContoh.id }, data: { akunId: muridAkun.id } });
    await prisma.consentPDP.create({ data: { penggunaId: ortuAkun.id, disetujui: true, waktuPersetujuan: new Date("2026-07-25") } });

    // 1.21 — lengkapi wali utk semua siswa lain di sekolah ini (siswaContoh di atas sudah dpt wali).
    for (const { siswa: siswaKelasIni } of kelasList) {
      for (let idx = 0; idx < siswaKelasIni.length; idx++) {
        const s = siswaKelasIni[idx];
        if (s.id === siswaContoh.id) continue;
        const jenisKelaminWali = idx % 2 === 0 ? "P" : "L";
        const waliLain = await prisma.pengguna.create({
          data: {
            sekolahId: sekolahLain.id,
            nama: `${jenisKelaminWali === "P" ? "Ibu" : "Bpk."} ${s.nama.split(" ")[0]}`,
            email: `wali.${s.nisn}@${opts.emailDomain}`,
            passwordHash: hash,
            peran: "ORANG_TUA",
            jenisKelamin: jenisKelaminWali,
            telepon: `0812399${s.nisn.slice(-5)}`,
          },
        });
        await prisma.waliSiswa.create({ data: { siswaId: s.id, penggunaId: waliLain.id, hubungan: jenisKelaminWali === "P" ? "Ibu" : "Ayah" } });
      }
    }

    // ---- Absensi (2 minggu terakhir) ----
    const hariSekolahLain: Date[] = [];
    const cursorLain = new Date();
    while (hariSekolahLain.length < 10) {
      cursorLain.setDate(cursorLain.getDate() - 1);
      const day = cursorLain.getDay();
      if (day !== 0 && day !== 6) hariSekolahLain.push(new Date(cursorLain));
    }
    const CATATAN_ABSENSI_LAIN = ["Demam, sudah izin ke UKS.", "Ada keperluan keluarga."];
    for (const { kelas, siswa } of kelasList) {
      for (const tgl of hariSekolahLain) {
        for (let i = 0; i < siswa.length; i++) {
          const roll = (i + tgl.getDate()) % 13;
          const status: StatusAbsensi = roll === 0 ? "SAKIT" : roll === 1 ? "IZIN" : roll === 2 ? "ALPA" : "HADIR";
          const catatan = status === "SAKIT" ? CATATAN_ABSENSI_LAIN[0] : status === "IZIN" ? CATATAN_ABSENSI_LAIN[1] : null;
          await prisma.absensi.create({ data: { siswaId: siswa[i].id, kelasId: kelas.id, tanggal: tgl, status, catatan } });
        }
      }
    }

    // ---- Bank soal (5 mapel x 8 soal) ----
    const soalLainByMapel = new Map<string, Awaited<ReturnType<typeof prisma.soal.create>>[]>();
    for (const m of MAPEL_LAIN) {
      const daftarSoal: Awaited<ReturnType<typeof prisma.soal.create>>[] = [];
      for (let i = 0; i < 8; i++) {
        const jenis = i < 6 ? "PILIHAN_GANDA" : "JAWABAN_SINGKAT";
        const s = await prisma.soal.create({
          data: {
            sekolahId: sekolahLain.id, mapelId: mapelLainMap[m], dibuatOlehId: agamaLainAkun.id,
            jenis, pertanyaan: `Soal latihan ${m} nomor ${i + 1}`,
            opsi: jenis === "PILIHAN_GANDA" ? JSON.stringify([`Jawaban benar ${m}`, "Pilihan lain 1", "Pilihan lain 2", "Pilihan lain 3"]) : null,
            kunciJawaban: jenis === "PILIHAN_GANDA" ? "0" : "benar",
            topik: `Bab ${Math.ceil((i + 1) / 2)}`, tingkatKesulitan: "sedang", poinDefault: 100 / 8,
          },
        });
        daftarSoal.push(s);
      }
      if (m === "Matematika") {
        // 1.20, diminta eksplisit — contoh soal pilihan ganda kompleks (skor all-or-nothing).
        const pgKompleks = await prisma.soal.create({
          data: {
            sekolahId: sekolahLain.id, mapelId: mapelLainMap[m], dibuatOlehId: agamaLainAkun.id, jenis: "PILIHAN_GANDA_KOMPLEKS",
            pertanyaan: "Manakah bilangan genap di bawah ini? (pilih semua yang benar)",
            opsi: JSON.stringify(["8", "13", "20", "27"]), kunciJawaban: JSON.stringify([0, 2]),
            topik: "Bilangan", tingkatKesulitan: "sedang", poinDefault: 100 / 8,
          },
        });
        daftarSoal.push(pgKompleks);
      }
      soalLainByMapel.set(m, daftarSoal);
    }

    // ---- Materi + Tugas + Ujian per kelas (Nilai diderivasi belakangan dari hasil asli, bukan sintetis di sini) ----
    const JUDUL_TUGAS_LAIN = ["Latihan Soal", "Rangkuman Bab", "Refleksi Pembelajaran", "Lembar Kerja Siswa"];
    for (const { kelas, siswa, waliAkunId } of kelasList) {
      for (const m of MAPEL_LAIN) {
        await prisma.materiBelajar.create({
          data: { kelasId: kelas.id, mapelId: mapelLainMap[m], penggunaId: waliAkunId, judul: `Rangkuman ${m} — ${kelas.nama}`, tipe: "dokumen", isi: `Ringkasan materi ${m} untuk kelas ${kelas.nama}.`, babId: babLainMap[m] },
        });
      }

      // Tugas: 2/kelas, sebagian besar siswa kumpul (mix tepat waktu/terlambat dihitung dari tanggal asli)
      for (let t = 0; t < 2; t++) {
        const mapelTugas = MAPEL_LAIN[t % MAPEL_LAIN.length];
        const tenggat = new Date(Date.now() - (2 - t) * 86400000 * 2);
        const tugasLain = await prisma.tugas.create({
          data: { kelasId: kelas.id, mapelId: mapelLainMap[mapelTugas], penggunaId: waliAkunId, judul: `${JUDUL_TUGAS_LAIN[t % JUDUL_TUGAS_LAIN.length]} ${mapelTugas}`, instruksi: `Kerjakan latihan ${mapelTugas} sesuai materi minggu ini.`, tenggat },
        });
        for (let i = 0; i < Math.min(siswa.length, 8); i++) {
          const submitAt = new Date(tenggat.getTime() - (2 - i % 3) * 3600000);
          await prisma.pengumpulanTugas.create({
            data: {
              tugasId: tugasLain.id, siswaId: siswa[i].id, isiJawaban: `Jawaban ${mapelTugas} dari ${siswa[i].nama}.`,
              submitAt, terlambat: submitAt > tenggat, nilai: i % 3 !== 0 ? 65 + ((i * 7) % 35) : null,
            },
          });
        }
      }

      // 1.20, diminta eksplisit — 6-9 ujian PER MAPEL (bukan cuma 2/kelas total), pakai createMany
      // utk soal/jawaban krn volumenya jauh lebih besar dari sebelumnya.
      const JUDUL_UJIAN_LAIN = ["Ulangan Harian", "Kuis", "Penilaian Tengah Bab", "Latihan Soal", "Penilaian Akhir Bab", "Tes Formatif"];
      const JENIS_PENILAIAN_LAIN = ["HARIAN", "HARIAN", "HARIAN", "HARIAN", "UTS", "HARIAN", "HARIAN", "UAS"] as const;
      for (const mapelUjian of MAPEL_LAIN) {
        const soalTersedia = soalLainByMapel.get(mapelUjian) ?? [];
        if (soalTersedia.length === 0) continue;
        const targetJumlah = 6 + Math.floor(Math.random() * 4); // 6-9

        for (let n = 0; n < targetJumlah; n++) {
          const soalUjian = acak(soalTersedia).slice(0, Math.min(20, soalTersedia.length));
          if (soalUjian.length === 0) continue;
          const variasi = n % 4;
          const jenis = variasi === 3 ? "LATIHAN" : "UJIAN";
          const status = variasi === 0 ? "DRAFT" : "PUBLISHED";
          const jenisPenilaian = JENIS_PENILAIAN_LAIN[n % JENIS_PENILAIAN_LAIN.length];
          const jamMulai = variasi === 2 ? new Date(Date.now() - (3 + n) * 86400000) : new Date(Date.now() - 60 * 60 * 1000);
          const jamSelesai = variasi === 2 ? new Date(Date.now() - (2 + n) * 86400000) : new Date(Date.now() + (2 + n) * 60 * 60 * 1000);
          const ujianLain = await prisma.ujian.create({
            data: {
              mapelId: mapelLainMap[mapelUjian], dibuatOlehId: waliAkunId, judul: `${JUDUL_UJIAN_LAIN[n % JUDUL_UJIAN_LAIN.length]} ${mapelUjian}`,
              jenis, status, jenisPenilaian, durasiMenit: jenis === "UJIAN" ? 45 : null, acakSoal: true, acakJawaban: true, sekaliAkses: jenis === "UJIAN",
              kelas: status === "PUBLISHED" ? { create: [{ kelasId: kelas.id, jamMulai, jamSelesai }] } : { create: [{ kelasId: kelas.id }] },
            },
          });
          const poinPerSoal = Math.floor(100 / soalUjian.length);
          await prisma.ujianSoal.createMany({
            data: soalUjian.map((s, i) => ({ ujianId: ujianLain.id, soalId: s.id, urutan: i + 1, poin: poinPerSoal })),
          });

          if (variasi === 2) {
            // 1.20, diperbaiki — semua murid kebagian riwayat pengerjaan ujian (bukan cuma 5-8/30).
            const jumlahKerja = siswa.length;
            for (let i = 0; i < jumlahKerja; i++) {
              const mulai = new Date(jamMulai.getTime() + 5 * 60 * 1000);
              const selesai = new Date(mulai.getTime() + 30 * 60 * 1000);
              const pengerjaanLain = await prisma.ujianPengerjaan.create({
                data: { ujianId: ujianLain.id, siswaId: siswa[i].id, status: "SELESAI", soalUrutan: JSON.stringify(acak(soalUjian.map((s) => s.id))), waktuMulai: mulai, waktuSelesai: selesai },
              });
              let total = 0;
              const jawabanRowsLain: { pengerjaanId: string; soalId: string; opsiUrutan?: string; jawabanPG?: number; jawabanPGMulti?: string; jawabanTeks?: string; benar?: boolean; skor: number }[] = [];
              for (const s of soalUjian) {
                const benar = (i + n + s.pertanyaan.length) % 3 !== 0;
                if (s.jenis === "PILIHAN_GANDA" && s.opsi) {
                  const opsiArr: string[] = JSON.parse(s.opsi);
                  const kunciIdx = Number(s.kunciJawaban);
                  const jawabanPG = benar ? kunciIdx : (kunciIdx + 1) % opsiArr.length;
                  const skor = benar ? poinPerSoal : 0;
                  total += skor;
                  jawabanRowsLain.push({ pengerjaanId: pengerjaanLain.id, soalId: s.id, opsiUrutan: JSON.stringify(acak(opsiArr.map((_, idx) => idx))), jawabanPG, benar, skor });
                } else if (s.jenis === "PILIHAN_GANDA_KOMPLEKS" && s.kunciJawaban) {
                  const kunci: number[] = JSON.parse(s.kunciJawaban);
                  const skor = benar ? poinPerSoal : 0;
                  total += skor;
                  jawabanRowsLain.push({ pengerjaanId: pengerjaanLain.id, soalId: s.id, jawabanPGMulti: JSON.stringify(benar ? kunci : kunci.slice(0, 1)), benar, skor });
                } else {
                  const skor = benar ? poinPerSoal : 0;
                  total += skor;
                  jawabanRowsLain.push({ pengerjaanId: pengerjaanLain.id, soalId: s.id, jawabanTeks: benar ? (s.kunciJawaban ?? "") : "jawaban keliru", benar, skor });
                }
              }
              await prisma.ujianJawaban.createMany({ data: jawabanRowsLain });
              await prisma.ujianPengerjaan.update({ where: { id: pengerjaanLain.id }, data: { nilaiTotal: total, koreksiDikonfirmasi: true, dikonfirmasiPada: selesai } });
            }
          }
        }
      }
    }

    await generateNilaiDariHasilAsli(sekolahLain.id);

    // ---- Tagihan SPP (2 periode) ----
    const spplain = await prisma.tagihanTipe.create({ data: { sekolahId: sekolahLain.id, nama: "SPP" } });
    const periodeLain = [
      new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    ];
    for (const { kelas, siswa } of kelasList) {
      for (let i = 0; i < siswa.length; i++) {
        for (let p = 0; p < periodeLain.length; p++) {
          const lunas = (i + p) % 3 !== 0;
          const status: StatusTagihan = lunas ? "LUNAS" : "BELUM_BAYAR";
          await prisma.tagihan.create({
            data: { siswaId: siswa[i].id, tipeId: spplain.id, periode: periodeLain[p], nominal: 300000, status, jatuhTempo: new Date("2026-08-10"), dibayarPada: lunas ? new Date() : null, tahunAjaranId: kelas.tahunAjaranId },
          });
        }
      }
    }

    // 1.20, diminta eksplisit — tagihan LAIN selain SPP (buku/seragam/dst).
    const bukuPaketLain = await prisma.tagihanTipe.create({ data: { sekolahId: sekolahLain.id, nama: "Buku Paket" } });
    const seragamLain = await prisma.tagihanTipe.create({ data: { sekolahId: sekolahLain.id, nama: "Seragam" } });
    for (const { kelas, siswa } of kelasList) {
      for (let i = 0; i < siswa.length; i++) {
        const lunasBuku = i % 3 !== 0;
        await prisma.tagihan.create({
          data: { siswaId: siswa[i].id, tipeId: bukuPaketLain.id, periode: "Tahun Ajaran 2026/2027", nominal: 150000, status: lunasBuku ? "LUNAS" : "BELUM_BAYAR", jatuhTempo: new Date("2026-07-31"), dibayarPada: lunasBuku ? new Date() : null, tahunAjaranId: kelas.tahunAjaranId },
        });
        const lunasSeragam = i % 4 !== 0;
        await prisma.tagihan.create({
          data: { siswaId: siswa[i].id, tipeId: seragamLain.id, periode: "Tahun Ajaran 2026/2027", nominal: 250000, status: lunasSeragam ? "LUNAS" : "BELUM_BAYAR", jatuhTempo: new Date("2026-07-31"), dibayarPada: lunasSeragam ? new Date() : null, tahunAjaranId: kelas.tahunAjaranId },
        });
      }
    }

    // ---- Jadwal pelajaran (Senin-Jumat, 5 mapel/kelas) ----
    const JAM_SESI_LAIN = [
      { mulai: "07:00", selesai: "07:40" }, { mulai: "07:40", selesai: "08:20" },
      { mulai: "08:40", selesai: "09:20" }, { mulai: "09:20", selesai: "10:00" }, { mulai: "10:00", selesai: "10:40" },
    ];
    const jadwalEntryPertamaWali = new Map<string, string>();
    for (const { kelas, waliAkunId, waliProfilId } of kelasList) {
      const daftarPengajarLain = MAPEL_LAIN.map((m) => ({
        mapelId: mapelLainMap[m],
        guruId: m === "Pendidikan Agama" ? agamaLainProfil.id : waliProfilId,
      }));
      for (let hari = 1; hari <= 5; hari++) {
        const sesi = JAM_SESI_LAIN[hari - 1];
        const { mapelId, guruId } = daftarPengajarLain[(hari - 1) % daftarPengajarLain.length];
        const entry = await prisma.jadwalEntry.create({
          data: { kelasId: kelas.id, mapelId, guruId, hari, jamMulai: sesi.mulai, jamSelesai: sesi.selesai, tahunAjaranId: taLain.id },
        });
        if (!jadwalEntryPertamaWali.has(waliAkunId)) jadwalEntryPertamaWali.set(waliAkunId, entry.id);
      }
    }
    const kemarinLain = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1));
    for (const entryId of jadwalEntryPertamaWali.values()) {
      await prisma.presensiGuru.create({ data: { jadwalEntryId: entryId, tanggal: kemarinLain, hadir: true, sumber: "OTOMATIS_ABSENSI" } });
    }

    // ---- Capaian Pembelajaran & RPP ----
    const cpLain = await prisma.capaianPembelajaran.create({
      data: { sekolahId: sekolahLain.id, mapelId: mapelLainMap["Matematika"], kode: "CP.1", deskripsi: `Siswa ${opts.jenjang} mampu menerapkan konsep dasar Matematika sesuai jenjangnya.`, tingkat: kelasList[0].kelas.tingkat },
    });
    await prisma.rPP.create({
      data: {
        penggunaId: kelasList[0].waliAkunId, kelasId: kelasList[0].kelas.id, mapelId: mapelLainMap["Matematika"], tahunAjaranId: taLain.id,
        judul: `RPP Matematika — Pertemuan 1`, isi: "**Tujuan:** siswa memahami konsep dasar.\n\n- Apersepsi 10 menit\n- Penjelasan 20 menit\n- Latihan 15 menit\n- Penutup 5 menit",
      },
    });
    void cpLain;

    // ---- Diskusi (murid contoh tanya di materi kelasnya) ----
    const materiSiswaContoh = await prisma.materiBelajar.findFirst({ where: { kelasId: kelasList[0].kelas.id } });
    if (materiSiswaContoh) {
      const tanyaLain = await prisma.komentarKonten.create({ data: { penggunaId: muridAkun.id, materiId: materiSiswaContoh.id, isi: "Bu/Pak, boleh minta contoh soal tambahan?" } });
      await prisma.komentarKonten.create({ data: { penggunaId: kelasList[0].waliAkunId, materiId: materiSiswaContoh.id, isi: "Boleh, nanti Bapak/Ibu bagikan minggu depan ya.", parentId: tanyaLain.id } });
    }

    // ---- Asesmen deskriptif (N-5) — semua siswa kelas pertama, diminta eksplisit jangan kosong ----
    const CATATAN_ASESMEN_LAIN = [
      "Ananda menunjukkan pemahaman yang baik, terus dipertahankan.",
      "Perlu bimbingan lebih pada penerapan konsep ke soal cerita.",
      "Sangat aktif bertanya, rasa ingin tahu tinggi.",
      "Ketelitian dalam mengerjakan soal masih perlu ditingkatkan.",
    ];
    for (const { siswa, waliAkunId } of kelasList) {
      for (let i = 0; i < siswa.length; i++) {
        await prisma.catatanAsesmen.create({
          data: { siswaId: siswa[i].id, mapelId: mapelLainMap["Matematika"], penggunaId: waliAkunId, periode: "Semester Ganjil 2026/2027", isi: CATATAN_ASESMEN_LAIN[i % CATATAN_ASESMEN_LAIN.length] },
        });
      }
    }

    // ---- Projek P5 ----
    const projekLain = await prisma.projek.create({
      data: { sekolahId: sekolahLain.id, tahunAjaranId: taLain.id, tema: "Gaya Hidup Berkelanjutan", dimensiP5: JSON.stringify(["Bergotong Royong", "Bernalar Kritis"]), dibuatOlehId: kepsekAkun.id },
    });
    for (let i = 0; i < Math.min(6, kelasList[0].siswa.length); i++) {
      await prisma.projekPenilaian.create({ data: { projekId: projekLain.id, siswaId: kelasList[0].siswa[i].id, dimensi: "Bergotong Royong", capaian: i % 4 === 0 ? "SB" : "BSH" } });
      await prisma.projekPenilaian.create({ data: { projekId: projekLain.id, siswaId: kelasList[0].siswa[i].id, dimensi: "Bernalar Kritis", capaian: i % 3 === 0 ? "BSH" : "MB" } });
    }

    // ---- Catatan Guru & Prestasi (untuk siswa contoh yg py akun) ----
    await prisma.catatanSiswa.create({
      data: { siswaId: siswaContoh.id, penggunaId: kelasList[0].waliAkunId, mapelKonteks: "Matematika", isi: `${siswaContoh.nama.split(" ")[0]} cukup aktif di kelas, terus semangat belajar.` },
    });
    await prisma.prestasiSiswa.create({
      data: { siswaId: siswaContoh.id, judul: "Juara Harapan Lomba Cerdas Cermat Tingkat Kecamatan", tanggal: new Date("2026-06-05"), dicatatOlehId: kelasList[0].waliAkunId },
    });

    // ---- Agenda akademik ----
    await prisma.agendaAkademik.createMany({
      data: [
        { sekolahId: sekolahLain.id, judul: "Rapat Orang Tua Murid", tanggal: new Date("2026-08-30"), jenis: "Kegiatan" },
        { sekolahId: sekolahLain.id, judul: "UTS Semester Ganjil", tanggal: new Date("2026-09-20"), jenis: "Ujian" },
        { sekolahId: sekolahLain.id, judul: "UAS Semester Ganjil", tanggal: new Date("2026-12-10"), jenis: "Ujian" },
      ],
    });

    // ---- Pengajuan izin & Pesan ----
    await prisma.pengajuanIzin.create({
      data: { siswaId: siswaContoh.id, diajukanOlehId: ortuAkun.id, tanggal: new Date(), jenis: "IZIN", keterangan: "Ada keperluan keluarga.", status: "MENUNGGU" },
    });
    await prisma.pesan.create({
      data: { pengirimId: kepsekAkun.id, kelasIdTarget: kelasList[0].kelas.id, judul: "Selamat Datang Tahun Ajaran Baru", isi: `Selamat datang di tahun ajaran baru 2026/2027 di ${opts.nama}!`, dibaca: false },
    });

    // ---- Pengumuman sekolah ----
    await prisma.pengumumanSekolah.createMany({
      data: [
        { sekolahId: sekolahLain.id, judul: "Libur Semester Ganjil", isi: "Libur semester ganjil dimulai 20 Desember 2026, sekolah kembali aktif 12 Januari 2027.", dibuatOlehId: kepsekAkun.id },
        { sekolahId: sekolahLain.id, judul: "Pembayaran SPP & Buku Paket", isi: "Mohon segera melunasi SPP, Buku Paket, dan Seragam yang belum dibayar melalui menu Keuangan/SPP.", dibuatOlehId: kepsekAkun.id },
      ],
    });

    return sekolahLain;
  }

  // 1.20, diminta eksplisit — 30 sekolah SUNGGUHAN (bukan cuma 3), loop data-driven atas
  // DATA_SEKOLAH_NYATA (didefinisikan di atas main(), diambil dari api.co.id). Sekolah terakhir
  // sengaja dinonaktifkan (aktif: false) sbg demo "sekolah nonaktif" di dashboard superadmin.
  for (let i = 0; i < DATA_SEKOLAH_NYATA.length; i++) {
    const s = DATA_SEKOLAH_NYATA[i];
    const emailDomain = `sekolah${s.npsn}.demo`;
    console.log(`🏫 [${i + 1}/${DATA_SEKOLAH_NYATA.length}] Membuat sekolah lain: ${s.nama}...`);
    await buatSekolahLain({
      nama: s.nama, jenjang: s.jenjang, npsn: s.npsn, alamat: s.alamat,
      kecamatan: s.kecamatan, kabupatenKota: s.kabupatenKota, provinsi: s.provinsi,
      aktif: i !== DATA_SEKOLAH_NYATA.length - 1,
      emailDomain, kepsekNama: NAMA_KEPSEK_LAIN[i % NAMA_KEPSEK_LAIN.length],
      namaKelas: NAMA_KELAS_PER_JENJANG[s.jenjang] ?? ["A"],
      latitude: s.latitude, longitude: s.longitude,
    });
  }

  console.log("₽ Membuat data langganan platform (revenue superadmin, 1.21)...");
  const NAMA_BULAN_INDO = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const PAKET_HARGA: Record<string, number> = { BASIC: 500000, PRO: 1250000, ENTERPRISE: 3000000 };
  const PAKET_URUT = ["BASIC", "PRO", "ENTERPRISE"] as const;
  const semuaSekolahUntukLangganan = await prisma.sekolah.findMany({ select: { id: true } });
  for (let i = 0; i < semuaSekolahUntukLangganan.length; i++) {
    const sId = semuaSekolahUntukLangganan[i].id;
    const paket = PAKET_URUT[i % 3];
    const mulai = new Date(Date.now() - (200 + i * 5) * 86400000);
    const langgananBaru = await prisma.langganan.create({
      data: { sekolahId: sId, paket, hargaPerBulan: PAKET_HARGA[paket], mulai, status: "AKTIF" },
    });
    // 6-12 bulan riwayat, mayoritas lunas — sebagian kecil (~1/8) sengaja nunggak bulan berjalan
    // supaya kartu "Sekolah yang nunggak" di dashboard revenue ada isinya, bukan selalu kosong.
    const jumlahBulan = 6 + (i % 7);
    for (let b = jumlahBulan - 1; b >= 0; b--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - b);
      const label = `${NAMA_BULAN_INDO[d.getMonth()]} ${d.getFullYear()}`;
      const nunggak = b === 0 && i % 8 === 0;
      await prisma.pembayaranLangganan.create({
        data: {
          langgananId: langgananBaru.id,
          periode: label,
          nominal: PAKET_HARGA[paket],
          dibayarPada: nunggak ? null : new Date(d.getFullYear(), d.getMonth(), 5 + (i % 10)),
          status: nunggak ? (i % 16 === 0 ? "TELAT" : "BELUM_BAYAR") : "LUNAS",
        },
      });
    }
  }

  console.log("\n✅ Seed selesai! Ringkasan data:\n");
  const ringkasan = [
    ["Sekolah", await prisma.sekolah.count()],
    ["TahunAjaran", await prisma.tahunAjaran.count()],
    ["Kelas", await prisma.kelas.count()],
    ["MataPelajaran", await prisma.mataPelajaran.count()],
    ["Pengguna", await prisma.pengguna.count()],
    ["GuruProfil", await prisma.guruProfil.count()],
    ["PenugasanGuru", await prisma.penugasanGuru.count()],
    ["Siswa", await prisma.siswa.count()],
    ["Siswa aktif", await prisma.siswa.count({ where: { aktif: true } })],
    ["Riwayat Siswa (nonaktif)", await prisma.siswa.count({ where: { aktif: false } })],
    ["WaliSiswa", await prisma.waliSiswa.count()],
    ["Absensi", await prisma.absensi.count()],
    ["Nilai", await prisma.nilai.count()],
    ["Tagihan", await prisma.tagihan.count()],
    ["MateriBelajar", await prisma.materiBelajar.count()],
    ["Tugas", await prisma.tugas.count()],
    ["PengumpulanTugas", await prisma.pengumpulanTugas.count()],
    ["Soal", await prisma.soal.count()],
    ["Ujian", await prisma.ujian.count()],
    ["UjianKelas", await prisma.ujianKelas.count()],
    ["UjianPengerjaan", await prisma.ujianPengerjaan.count()],
    ["JadwalEntry", await prisma.jadwalEntry.count()],
    ["PresensiGuru", await prisma.presensiGuru.count()],
    ["CapaianPembelajaran", await prisma.capaianPembelajaran.count()],
    ["RPP", await prisma.rPP.count()],
    ["KomentarKonten", await prisma.komentarKonten.count()],
    ["CatatanAsesmen", await prisma.catatanAsesmen.count()],
    ["Projek", await prisma.projek.count()],
    ["ProjekPenilaian", await prisma.projekPenilaian.count()],
    ["CatatanSiswa", await prisma.catatanSiswa.count()],
    ["PrestasiSiswa", await prisma.prestasiSiswa.count()],
    ["AgendaAkademik", await prisma.agendaAkademik.count()],
    ["Langganan", await prisma.langganan.count()],
    ["PembayaranLangganan", await prisma.pembayaranLangganan.count()],
  ] as const;
  for (const [nama, jumlah] of ringkasan) console.log(`  ${nama.padEnd(24)} ${jumlah}`);

  console.log("\nAkun demo (password sama untuk semua: selaras123):");
  console.log("  🏫 Kepala Sekolah : hendra@selarasajar.demo");
  console.log("  ₽  Bendahara      : tuti@selarasajar.demo");
  console.log("  🗂  Tata Usaha (TU): tono@selarasajar.demo");
  console.log("  👩‍🏫 Guru (wali 5B) : rina@selarasajar.demo");
  console.log("  👩‍🏫 Guru spesialis : solihin@ · yuni@ · wulan@ · made@ · citra@ · dedi@selarasajar.demo");
  console.log("  👩‍🏫 Guru lintas kelas: zainal@ (Agama) · fikri@ (PJOK) · melissa@ (B. Inggris) — mengajar semua 24 kelas");
  console.log("  👩‍🏫 Guru lain      : guru11@ .. guru<n>@selarasajar.demo (wali kelas rendah B-D & wali kelas tinggi)");
  console.log("  👨‍👩‍👧 Orang Tua      : fauzan@selarasajar.demo");
  console.log("  🎒 Murid          : ahmad@selarasajar.demo");
  console.log("\n  🛡  Superadmin (password sama juga) : admin@selarasajar.id");
  console.log(`     Lihat ${DATA_SEKOLAH_NYATA.length} sekolah lain di dashboard superadmin (1 dinonaktifkan sbg demo).`);
  console.log("\n  🏫 Sekolah lain (1.20 — 30 sekolah nyata se-Indonesia dari api.co.id, semua fitur terisi):");
  console.log("     Pola akun tiap sekolah: kepsek@sekolah<NPSN>.demo · wali1@sekolah<NPSN>.demo · murid@sekolah<NPSN>.demo · ortu@sekolah<NPSN>.demo");
  console.log(`     Contoh: ${DATA_SEKOLAH_NYATA[0].nama} → kepsek@sekolah${DATA_SEKOLAH_NYATA[0].npsn}.demo`);
  console.log(`     Sekolah terakhir (${DATA_SEKOLAH_NYATA[DATA_SEKOLAH_NYATA.length - 1].nama}) sengaja dinonaktifkan sbg demo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
