import { PrismaClient, StatusAbsensi, StatusTagihan } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "selaras123";

async function main() {
  console.log("🌱 Membersihkan data lama...");
  await prisma.pesan.deleteMany();
  await prisma.catatanSupervisi.deleteMany();
  await prisma.consentPDP.deleteMany();
  await prisma.pengajuanIzin.deleteMany();
  await prisma.ujianJawaban.deleteMany();
  await prisma.ujianPengerjaan.deleteMany();
  await prisma.ujianSoal.deleteMany();
  await prisma.ujian.deleteMany();
  await prisma.soal.deleteMany();
  await prisma.gradeScale.deleteMany();
  await prisma.danaAlokasi.deleteMany();
  await prisma.pPDBPendaftar.deleteMany();
  await prisma.agendaAkademik.deleteMany();
  await prisma.pengumpulanTugas.deleteMany();
  await prisma.tugas.deleteMany();
  await prisma.materiBelajar.deleteMany();
  await prisma.tagihan.deleteMany();
  await prisma.tagihanTipe.deleteMany();
  await prisma.nilai.deleteMany();
  await prisma.absensi.deleteMany();
  await prisma.bobotKomponen.deleteMany();
  await prisma.waliSiswa.deleteMany();
  await prisma.penugasanGuru.deleteMany();
  await prisma.siswa.deleteMany();
  await prisma.guruProfil.deleteMany();
  await prisma.pengguna.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.kelas.deleteMany();
  await prisma.tahunAjaran.deleteMany();
  await prisma.sekolah.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);

  console.log("🏫 Membuat sekolah & tahun ajaran...");
  const sekolah = await prisma.sekolah.create({
    data: { nama: "SD Harapan Bangsa", jenjang: "SD" },
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

  console.log("📚 Membuat kelas & mata pelajaran...");
  const kelas5B = await prisma.kelas.create({
    data: { sekolahId: sekolah.id, tahunAjaranId: tahunAjaran.id, nama: "5B", tingkat: 5 },
  });
  const kelas4A = await prisma.kelas.create({
    data: { sekolahId: sekolah.id, tahunAjaranId: tahunAjaran.id, nama: "4A", tingkat: 4 },
  });
  const kelas6A = await prisma.kelas.create({
    data: { sekolahId: sekolah.id, tahunAjaranId: tahunAjaran.id, nama: "6A", tingkat: 6 },
  });

  const mapelData = [
    { nama: "Matematika", kkm: 70 },
    { nama: "Bahasa Indonesia", kkm: 72 },
    { nama: "IPA", kkm: 70 },
    { nama: "IPS", kkm: 68 },
    { nama: "PKn", kkm: 70 },
  ];
  const mapelMap: Record<string, string> = {};
  for (const m of mapelData) {
    const created = await prisma.mataPelajaran.create({
      data: { sekolahId: sekolah.id, nama: m.nama, kkm: m.kkm },
    });
    mapelMap[m.nama] = created.id;
  }

  await prisma.bobotKomponen.createMany({
    data: [
      { mapelId: mapelMap["Matematika"], komponen: "Ulangan Harian", persentase: 30 },
      { mapelId: mapelMap["Matematika"], komponen: "Tugas", persentase: 20 },
      { mapelId: mapelMap["Matematika"], komponen: "UTS", persentase: 20 },
      { mapelId: mapelMap["Matematika"], komponen: "UAS", persentase: 30 },
    ],
  });

  console.log("👤 Membuat akun pengguna (5 peran demo)...");
  const hendra = await prisma.pengguna.create({
    data: {
      sekolahId: sekolah.id,
      nama: "Pak Hendra",
      email: "hendra@selarasajar.demo",
      passwordHash: hash,
      peran: "KEPALA_SEKOLAH",
      telepon: "081234500001",
    },
  });

  const tuti = await prisma.pengguna.create({
    data: {
      sekolahId: sekolah.id,
      nama: "Bu Tuti",
      email: "tuti@selarasajar.demo",
      passwordHash: hash,
      peran: "BENDAHARA",
      telepon: "081234500002",
    },
  });

  const rinaAkun = await prisma.pengguna.create({
    data: {
      sekolahId: sekolah.id,
      nama: "Bu Rina Wulandari",
      email: "rina@selarasajar.demo",
      passwordHash: hash,
      peran: "GURU",
      telepon: "081234500003",
    },
  });
  const rinaGuru = await prisma.guruProfil.create({
    data: { penggunaId: rinaAkun.id, nip: "198705152010012001", mapelUtama: "Matematika" },
  });

  // Guru kedua (tanpa akun login) untuk realisme penugasan
  const solihinAkun = await prisma.pengguna.create({
    data: {
      sekolahId: sekolah.id,
      nama: "Ahmad Solihin",
      email: "solihin@selarasajar.demo",
      passwordHash: hash,
      peran: "GURU",
      aktif: true,
    },
  });
  const solihinGuru = await prisma.guruProfil.create({
    data: { penggunaId: solihinAkun.id, nip: "199003102015011002", mapelUtama: "Bahasa Indonesia" },
  });

  // Tetapkan wali kelas
  await prisma.kelas.update({ where: { id: kelas5B.id }, data: { waliKelasId: rinaAkun.id } });
  await prisma.kelas.update({ where: { id: kelas6A.id }, data: { waliKelasId: solihinAkun.id } });

  // Penugasan mengajar
  await prisma.penugasanGuru.createMany({
    data: [
      { guruId: rinaGuru.id, kelasId: kelas5B.id, mapelId: mapelMap["Matematika"] },
      { guruId: rinaGuru.id, kelasId: kelas4A.id, mapelId: mapelMap["Matematika"] },
      { guruId: rinaGuru.id, kelasId: kelas6A.id, mapelId: mapelMap["Matematika"] },
      { guruId: solihinGuru.id, kelasId: kelas5B.id, mapelId: mapelMap["Bahasa Indonesia"] },
      { guruId: solihinGuru.id, kelasId: kelas6A.id, mapelId: mapelMap["Bahasa Indonesia"] },
    ],
  });

  console.log("🎒 Membuat data siswa (kelas 5B, 4A, 6A)...");
  const siswa5BData = [
    { nisn: "0098234571", nama: "Ahmad Fauzi", jk: "L" },
    { nisn: "0098234572", nama: "Siti Nurhaliza", jk: "P" },
    { nisn: "0098234574", nama: "Dewi Lestari", jk: "P" },
    { nisn: "0098234575", nama: "Eko Prasetyo", jk: "L" },
    { nisn: "0098234576", nama: "Fitri Handayani", jk: "P" },
    { nisn: "0098234580", nama: "Hana Permata", jk: "P" },
    { nisn: "0098234581", nama: "Irfan Maulana", jk: "L" },
  ];
  const siswa4AData = [
    { nisn: "0098234590", nama: "Joko Wibowo", jk: "L" },
    { nisn: "0098234591", nama: "Kartika Sari", jk: "P" },
    { nisn: "0098234592", nama: "Lukman Hakim", jk: "L" },
    { nisn: "0098234593", nama: "Melati Putri", jk: "P" },
    { nisn: "0098234594", nama: "Nanda Saputra", jk: "L" },
  ];
  const siswa6AData = [
    { nisn: "0098234573", nama: "Budi Santoso", jk: "L" },
    { nisn: "0098234577", nama: "Galih Ramadhan", jk: "L" },
    { nisn: "0098234595", nama: "Oki Setiawan", jk: "L" },
    { nisn: "0098234596", nama: "Putri Ayu", jk: "P" },
    { nisn: "0098234597", nama: "Rendi Firmansyah", jk: "L" },
  ];

  async function buatSiswa(list: typeof siswa5BData, kelasId: string) {
    const hasil = [];
    for (const s of list) {
      const siswa = await prisma.siswa.create({
        data: { sekolahId: sekolah.id, kelasId, nisn: s.nisn, nama: s.nama, jenisKelamin: s.jk },
      });
      hasil.push(siswa);
    }
    return hasil;
  }

  const siswa5B = await buatSiswa(siswa5BData, kelas5B.id);
  const siswa4A = await buatSiswa(siswa4AData, kelas4A.id);
  const siswa6A = await buatSiswa(siswa6AData, kelas6A.id);
  const semuaSiswa = [...siswa5B, ...siswa4A, ...siswa6A];

  console.log("👨‍👩‍👧 Membuat akun orang tua & murid demo...");
  const ahmadFauzi = siswa5B[0]; // Ahmad Fauzi

  const fauzanAkun = await prisma.pengguna.create({
    data: {
      sekolahId: sekolah.id,
      nama: "Bpk. Fauzan",
      email: "fauzan@selarasajar.demo",
      passwordHash: hash,
      peran: "ORANG_TUA",
      telepon: "081234567890",
    },
  });
  await prisma.waliSiswa.create({
    data: { siswaId: ahmadFauzi.id, penggunaId: fauzanAkun.id, hubungan: "Ayah" },
  });

  const ahmadAkun = await prisma.pengguna.create({
    data: {
      sekolahId: sekolah.id,
      nama: "Ahmad Fauzi",
      email: "ahmad@selarasajar.demo",
      passwordHash: hash,
      peran: "MURID",
    },
  });
  await prisma.siswa.update({ where: { id: ahmadFauzi.id }, data: { akunId: ahmadAkun.id } });

  // Wali untuk Siti Nurhaliza juga (tanpa akun login, buat realisme data tunggakan)
  const sriAkun = await prisma.pengguna.create({
    data: {
      sekolahId: sekolah.id,
      nama: "Ibu Sri",
      email: "sri@selarasajar.demo",
      passwordHash: hash,
      peran: "ORANG_TUA",
      telepon: "081234500099",
    },
  });
  await prisma.waliSiswa.create({
    data: { siswaId: siswa5B[1].id, penggunaId: sriAkun.id, hubungan: "Ibu" },
  });

  console.log("✅ Membuat data absensi (5 hari terakhir, kelas 5B)...");
  const hariSekolah: Date[] = [];
  const cursor = new Date();
  while (hariSekolah.length < 5) {
    cursor.setDate(cursor.getDate() - 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) hariSekolah.push(new Date(cursor));
  }

  for (const tgl of hariSekolah) {
    for (let i = 0; i < siswa5B.length; i++) {
      let status: StatusAbsensi = "HADIR";
      if (i === 1 && tgl.getTime() === hariSekolah[0].getTime()) status = "SAKIT";
      if (i === 3 && tgl.getTime() === hariSekolah[1].getTime()) status = "IZIN";
      if (i === 4 && tgl.getTime() === hariSekolah[2].getTime()) status = "ALPA";
      await prisma.absensi.create({
        data: { siswaId: siswa5B[i].id, kelasId: kelas5B.id, tanggal: tgl, status },
      });
    }
  }

  console.log("✎ Membuat data nilai (Matematika, kelas 5B)...");
  const skorUH = [88, 72, 58, 76, 64, 91, 69];
  for (let i = 0; i < siswa5B.length; i++) {
    await prisma.nilai.create({
      data: {
        siswaId: siswa5B[i].id,
        kelasId: kelas5B.id,
        mapelId: mapelMap["Matematika"],
        komponen: "Ulangan Harian",
        judul: "UH 1 - Bilangan Bulat",
        skor: skorUH[i],
      },
    });
    await prisma.nilai.create({
      data: {
        siswaId: siswa5B[i].id,
        kelasId: kelas5B.id,
        mapelId: mapelMap["Matematika"],
        komponen: "Tugas",
        judul: "Tugas Pecahan",
        skor: Math.min(100, skorUH[i] + 4),
      },
    });
  }

  console.log("₽ Membuat tagihan SPP...");
  const spp = await prisma.tagihanTipe.create({ data: { sekolahId: sekolah.id, nama: "SPP" } });
  const nominalPerKelas: Record<string, number> = {
    [kelas5B.id]: 350000,
    [kelas4A.id]: 325000,
    [kelas6A.id]: 375000,
  };
  const jatuhTempo = new Date("2026-08-10");

  for (let i = 0; i < semuaSiswa.length; i++) {
    const s = semuaSiswa[i];
    const nominal = nominalPerKelas[s.kelasId];
    const mod = i % 5;
    let status: StatusTagihan = "LUNAS";
    let dibayarPada: Date | null = new Date("2026-08-05");
    let metode: string | null = "QRIS";
    if (mod === 1) {
      status = "BELUM_BAYAR";
      dibayarPada = null;
      metode = null;
    } else if (mod === 2) {
      status = "CICILAN";
      dibayarPada = new Date("2026-08-08");
      metode = "VA BCA (cicilan 1/2)";
    }
    await prisma.tagihan.create({
      data: {
        siswaId: s.id,
        tipeId: spp.id,
        periode: "Agustus 2026",
        nominal,
        status,
        jatuhTempo,
        dibayarPada: dibayarPada ?? undefined,
        metodeBayar: metode ?? undefined,
      },
    });
  }

  console.log("▢ Membuat materi belajar & tugas...");
  await prisma.materiBelajar.create({
    data: {
      kelasId: kelas5B.id,
      mapelId: mapelMap["Matematika"],
      penggunaId: rinaAkun.id,
      judul: "Rangkuman Bilangan Bulat",
      tipe: "dokumen",
      isi: "Ringkasan materi bab 1 tentang operasi bilangan bulat.",
      bab: "Bab 1 - Bilangan Bulat",
    },
  });
  await prisma.materiBelajar.create({
    data: {
      kelasId: kelas5B.id,
      mapelId: mapelMap["Matematika"],
      penggunaId: rinaAkun.id,
      judul: "Video: Penjumlahan Pecahan",
      tipe: "video",
      isi: "https://youtube.com/watch?v=contoh",
      bab: "Bab 2 - Pecahan",
    },
  });

  const tugasPecahan = await prisma.tugas.create({
    data: {
      kelasId: kelas5B.id,
      mapelId: mapelMap["Matematika"],
      penggunaId: rinaAkun.id,
      judul: "PR Pecahan",
      instruksi: "Kerjakan soal halaman 24 nomor 1-10 tentang penjumlahan pecahan.",
      tenggat: new Date("2026-08-22"),
    },
  });

  await prisma.pengumpulanTugas.create({
    data: {
      tugasId: tugasPecahan.id,
      siswaId: ahmadFauzi.id,
      isiJawaban: "Sudah dikerjakan, terlampir.",
      nilai: 90,
      terlambat: false,
    },
  });
  await prisma.pengumpulanTugas.create({
    data: {
      tugasId: tugasPecahan.id,
      siswaId: siswa5B[1].id,
      isiJawaban: "Dikumpulkan agak telat.",
      terlambat: true,
    },
  });

  console.log("✉ Membuat pengumuman & pesan 2 arah contoh...");
  const pengumuman = await prisma.pesan.create({
    data: {
      pengirimId: rinaAkun.id,
      kelasIdTarget: kelas5B.id,
      judul: "Rapat Orang Tua Murid",
      isi: "Rapat orang tua murid akan diadakan Sabtu, 23 Agustus 2026 pukul 09.00 di aula sekolah.",
      dibaca: true,
    },
  });
  const pesanLangsung = await prisma.pesan.create({
    data: {
      pengirimId: rinaAkun.id,
      penerimaId: fauzanAkun.id,
      judul: "Ahmad butuh latihan tambahan",
      isi: "Selamat siang Bpk. Fauzan, Ahmad perlu latihan tambahan soal pecahan di rumah ya. Terima kasih.",
      dibaca: false,
    },
  });
  await prisma.pesan.create({
    data: {
      pengirimId: fauzanAkun.id,
      penerimaId: rinaAkun.id,
      parentId: pesanLangsung.id,
      judul: "Re: Ahmad butuh latihan tambahan",
      isi: "Baik Bu Rina, terima kasih infonya. Nanti saya dampingi belajar di rumah.",
      dibaca: true,
    },
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

  console.log("📝 Membuat bank soal Matematika...");
  const soalPecahan = await prisma.soal.create({
    data: {
      sekolahId: sekolah.id,
      mapelId: mapelMap["Matematika"],
      dibuatOlehId: rinaAkun.id,
      jenis: "PILIHAN_GANDA",
      pertanyaan: "Hasil dari 3/4 + 1/8 adalah…",
      opsi: JSON.stringify(["1/2", "7/8", "5/8", "4/12"]),
      kunciJawaban: "1", // index 1 = "7/8"
      topik: "Pecahan",
      tingkatKesulitan: "sedang",
      poinDefault: 20,
    },
  });
  const soalBilangan = await prisma.soal.create({
    data: {
      sekolahId: sekolah.id,
      mapelId: mapelMap["Matematika"],
      dibuatOlehId: rinaAkun.id,
      jenis: "PILIHAN_GANDA",
      pertanyaan: "Bilangan bulat yang terletak antara −3 dan 2 ada berapa?",
      opsi: JSON.stringify(["3", "4", "5", "6"]),
      kunciJawaban: "1", // index 1 = "4"
      topik: "Bilangan Bulat",
      tingkatKesulitan: "mudah",
      poinDefault: 20,
    },
  });
  const soalFPB = await prisma.soal.create({
    data: {
      sekolahId: sekolah.id,
      mapelId: mapelMap["Matematika"],
      dibuatOlehId: rinaAkun.id,
      jenis: "PILIHAN_GANDA",
      pertanyaan: "FPB dari 24 dan 36 adalah…",
      opsi: JSON.stringify(["6", "12", "18", "24"]),
      kunciJawaban: "1", // index 1 = "12"
      topik: "Bilangan Bulat",
      tingkatKesulitan: "sedang",
      poinDefault: 20,
    },
  });
  const soalSingkatDiskon = await prisma.soal.create({
    data: {
      sekolahId: sekolah.id,
      mapelId: mapelMap["Matematika"],
      dibuatOlehId: rinaAkun.id,
      jenis: "JAWABAN_SINGKAT",
      pertanyaan: "Berapakah 15% dari 288.000?",
      kunciJawaban: "43200",
      topik: "Aritmatika Sosial",
      tingkatKesulitan: "sedang",
      poinDefault: 20,
    },
  });
  const soalEsaiUntung = await prisma.soal.create({
    data: {
      sekolahId: sekolah.id,
      mapelId: mapelMap["Matematika"],
      dibuatOlehId: rinaAkun.id,
      jenis: "ESAI",
      pertanyaan:
        "Seorang pedagang membeli 24 kg beras seharga Rp288.000, lalu menjual dengan untung 15%. Hitung harga jual per kg. Tuliskan langkahnya.",
      topik: "Aritmatika Sosial",
      tingkatKesulitan: "sulit",
      poinDefault: 20,
    },
  });

  console.log("▤ Membuat ujian (UTS - published + hasil pengerjaan, UAS - draft, Latihan)...");
  const uts = await prisma.ujian.create({
    data: {
      kelasId: kelas5B.id,
      mapelId: mapelMap["Matematika"],
      dibuatOlehId: rinaAkun.id,
      judul: "UTS Matematika",
      jenis: "UJIAN",
      status: "PUBLISHED",
      jamMulai: new Date(Date.now() - 60 * 60 * 1000), // mulai 1 jam lalu
      jamSelesai: new Date(Date.now() + 3 * 60 * 60 * 1000), // tutup 3 jam lagi
      durasiMenit: 60,
      acakSoal: true,
      acakJawaban: true,
      sekaliAkses: true,
    },
  });
  const soalUts = [
    { soalId: soalPecahan.id, poin: 20 },
    { soalId: soalBilangan.id, poin: 20 },
    { soalId: soalFPB.id, poin: 20 },
    { soalId: soalSingkatDiskon.id, poin: 20 },
    { soalId: soalEsaiUntung.id, poin: 20 },
  ];
  for (let i = 0; i < soalUts.length; i++) {
    await prisma.ujianSoal.create({
      data: { ujianId: uts.id, soalId: soalUts[i].soalId, urutan: i + 1, poin: soalUts[i].poin },
    });
  }

  // Simulasikan 3 siswa sudah mengerjakan UTS (untuk demo hasil & analisis), 1 belum mulai
  const soalIdList = soalUts.map((s) => s.soalId);
  function acak<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const hasilSimulasi = [
    { siswa: siswa5B[0], jawabanBenar: [true, true, true, true], menit: 43 }, // Ahmad Fauzi 88ish
    { siswa: siswa5B[2], jawabanBenar: [true, false, true, true], menit: 52 }, // Dewi Lestari (indeks 2)
    { siswa: siswa5B[3], jawabanBenar: [false, true, false, true], menit: 38 }, // Eko Prasetyo
  ];

  for (const h of hasilSimulasi) {
    const mulai = new Date(Date.now() - h.menit * 60 * 1000 - 5 * 60 * 1000);
    const selesai = new Date(mulai.getTime() + h.menit * 60 * 1000);
    const pengerjaan = await prisma.ujianPengerjaan.create({
      data: {
        ujianId: uts.id,
        siswaId: h.siswa.id,
        status: "SELESAI",
        soalUrutan: JSON.stringify(acak(soalIdList)),
        waktuMulai: mulai,
        waktuSelesai: selesai,
      },
    });

    let total = 0;
    // 3 soal PG (dengan kunci jawaban benar 1) + 1 singkat "benar"
    const pgSoal = [soalPecahan, soalBilangan, soalFPB];
    for (let i = 0; i < pgSoal.length; i++) {
      const benar = h.jawabanBenar[i];
      const kunci = Number(pgSoal[i].kunciJawaban);
      const jawabanPG = benar ? kunci : (kunci + 1) % 4;
      const skor = benar ? 20 : 0;
      total += skor;
      await prisma.ujianJawaban.create({
        data: {
          pengerjaanId: pengerjaan.id,
          soalId: pgSoal[i].id,
          opsiUrutan: JSON.stringify(acak([0, 1, 2, 3])),
          jawabanPG,
          benar,
          skor,
        },
      });
    }
    // jawaban singkat
    const benarSingkat = h.jawabanBenar[3];
    await prisma.ujianJawaban.create({
      data: {
        pengerjaanId: pengerjaan.id,
        soalId: soalSingkatDiskon.id,
        jawabanTeks: benarSingkat ? "43200" : "40000",
        benar: benarSingkat,
        skor: benarSingkat ? 20 : 0,
      },
    });
    total += benarSingkat ? 20 : 0;
    // esai — belum dinilai guru (skor null) supaya ada contoh "perlu dinilai"
    await prisma.ujianJawaban.create({
      data: {
        pengerjaanId: pengerjaan.id,
        soalId: soalEsaiUntung.id,
        jawabanTeks:
          "Harga beli per kg = 288.000/24 = 12.000. Untung 15% = 1.800. Harga jual = 12.000 + 1.800 = 13.800 per kg.",
        skor: null,
      },
    });

    await prisma.ujianPengerjaan.update({
      where: { id: pengerjaan.id },
      data: { nilaiTotal: total }, // sementara tanpa esai, diupdate lagi setelah guru nilai esai
    });
  }

  const uas = await prisma.ujian.create({
    data: {
      kelasId: kelas5B.id,
      mapelId: mapelMap["Matematika"],
      dibuatOlehId: rinaAkun.id,
      judul: "UAS Matematika",
      jenis: "UJIAN",
      status: "DRAFT",
      acakSoal: true,
      acakJawaban: true,
      sekaliAkses: true,
    },
  });
  await prisma.ujianSoal.create({
    data: { ujianId: uas.id, soalId: soalPecahan.id, urutan: 1, poin: 50 },
  });
  await prisma.ujianSoal.create({
    data: { ujianId: uas.id, soalId: soalEsaiUntung.id, urutan: 2, poin: 50 },
  });

  await prisma.ujian.create({
    data: {
      kelasId: kelas4A.id,
      mapelId: mapelMap["Matematika"],
      dibuatOlehId: rinaAkun.id,
      judul: "Latihan Pecahan",
      jenis: "LATIHAN",
      status: "PUBLISHED",
      acakSoal: true,
      acakJawaban: true,
      sekaliAkses: false,
    },
  });

  console.log("✋ Membuat pengajuan izin contoh...");
  await prisma.pengajuanIzin.create({
    data: {
      siswaId: ahmadFauzi.id,
      diajukanOlehId: fauzanAkun.id,
      tanggal: new Date(),
      jenis: "IZIN",
      keterangan: "Ada acara keluarga di luar kota.",
      status: "MENUNGGU",
    },
  });
  await prisma.pengajuanIzin.create({
    data: {
      siswaId: siswa5B[1].id,
      diajukanOlehId: sriAkun.id,
      tanggal: new Date(Date.now() - 86400000),
      jenis: "SAKIT",
      keterangan: "Demam, ada surat dokter.",
      status: "DISETUJUI",
      disetujuiOlehId: rinaAkun.id,
    },
  });

  console.log("◑ Membuat transparansi dana...");
  await prisma.danaAlokasi.createMany({
    data: [
      { sekolahId: sekolah.id, periode: "Semester Ganjil 2026/2027", kategori: "Gaji guru & staf", nominal: 129220000, urutan: 1 },
      { sekolahId: sekolah.id, periode: "Semester Ganjil 2026/2027", kategori: "Operasional & listrik", nominal: 44730000, urutan: 2 },
      { sekolahId: sekolah.id, periode: "Semester Ganjil 2026/2027", kategori: "Kegiatan & ekskul", nominal: 37275000, urutan: 3 },
      { sekolahId: sekolah.id, periode: "Semester Ganjil 2026/2027", kategori: "Sarana & pemeliharaan", nominal: 24850000, urutan: 4 },
      { sekolahId: sekolah.id, periode: "Semester Ganjil 2026/2027", kategori: "Lainnya", nominal: 12425000, urutan: 5 },
    ],
  });

  console.log("🔒 Membuat consent UU PDP...");
  await prisma.consentPDP.create({
    data: { penggunaId: fauzanAkun.id, disetujui: true, waktuPersetujuan: new Date("2026-07-20") },
  });
  await prisma.consentPDP.create({
    data: { penggunaId: sriAkun.id, disetujui: false },
  });

  console.log("👁 Membuat catatan supervisi guru...");
  await prisma.catatanSupervisi.create({
    data: {
      guruId: rinaAkun.id,
      kepsekId: hendra.id,
      catatan:
        "Observasi kelas 12 Agu: pengelolaan kelas baik, penjelasan konsep pecahan jelas. Saran: variasikan metode untuk siswa yang lebih lambat.",
    },
  });

  console.log("🎒 Membuat pendaftar PPDB contoh...");
  await prisma.pPDBPendaftar.createMany({
    data: [
      { sekolahId: sekolah.id, namaCalon: "Raka Aditya", jenjangDaftar: "Kelas 1", namaOrtu: "Bpk. Aditya", kontak: "0812-1111-2222", status: "BARU" },
      { sekolahId: sekolah.id, namaCalon: "Zahra Amelia", jenjangDaftar: "Kelas 1", namaOrtu: "Ibu Amelia", kontak: "0813-2222-3333", status: "DITERIMA" },
      { sekolahId: sekolah.id, namaCalon: "Fajar Nugroho", jenjangDaftar: "Kelas 4 (pindahan)", namaOrtu: "Bpk. Nugroho", kontak: "0814-3333-4444", status: "BARU" },
    ],
  });

  console.log("📅 Membuat agenda akademik...");
  await prisma.agendaAkademik.createMany({
    data: [
      { sekolahId: sekolah.id, judul: "Rapat Orang Tua Murid", tanggal: new Date("2026-08-23"), jenis: "Kegiatan" },
      { sekolahId: sekolah.id, judul: "UTS Semester Ganjil", tanggal: new Date("2026-09-15"), jenis: "Ujian" },
      { sekolahId: sekolah.id, judul: "Libur Maulid Nabi", tanggal: new Date("2026-09-05"), jenis: "Libur" },
      { sekolahId: sekolah.id, judul: "UAS Semester Ganjil", tanggal: new Date("2026-12-08"), jenis: "Ujian" },
    ],
  });

  console.log("\n✅ Seed selesai!\n");
  console.log("Akun demo (password sama untuk semua: selaras123):");
  console.log("  🏫 Kepala Sekolah : hendra@selarasajar.demo");
  console.log("  ₽  Bendahara      : tuti@selarasajar.demo");
  console.log("  👩‍🏫 Guru           : rina@selarasajar.demo");
  console.log("  👨‍👩‍👧 Orang Tua      : fauzan@selarasajar.demo");
  console.log("  🎒 Murid          : ahmad@selarasajar.demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
