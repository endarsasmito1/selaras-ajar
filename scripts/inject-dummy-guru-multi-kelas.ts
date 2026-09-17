// Injeksi skenario dummy "1 guru mengampu 10 kelas" — lihat docs/panduan-data-dummy-guru-multi-kelas.md
// untuk rasionalnya. Script ini NAMBAH data baru di atas seed yang sudah ada (tidak menghapus/mengubah
// apa pun), jadi aman dijalankan tanpa mengganggu 264 test Playwright yang sensitif ke data seed lama.
//
// Nilai (`Nilai` tabel) di app ini DIDERIVASI dari UjianPengerjaan + PengumpulanTugas (lihat
// `generateNilaiDariHasilAsli` di prisma/seed.ts) — bukan ditulis manual lepas. Script ini ikut pola
// yang sama: skor di-generate SEKALI per (murid, sumber), dipakai identik utk UjianPengerjaan.nilaiTotal
// / PengumpulanTugas.nilai DAN untuk baris Nilai yang diturunkan langsung, tanpa re-generate acak.
//
// Jalankan: npx tsx scripts/inject-dummy-guru-multi-kelas.ts

import "dotenv/config"; // node/tsx biasa gak auto-load .env spt Next.js/Prisma CLI — sama pola dgn prisma.config.ts
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL tidak di-set — cek .env (connection string PostgreSQL/Supabase)");
}
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "selaras123";
const MAPEL_UTAMA = ["Pendidikan Agama", "PPKn", "Bahasa Indonesia", "Matematika", "IPAS", "PJOK", "Seni Budaya", "Bahasa Inggris"];

const NAMA_DEPAN_L = ["Ahmad", "Budi", "Eko", "Fajar", "Galih", "Hafiz", "Irfan", "Joko", "Lukman", "Nanda", "Oki", "Rendi", "Satria", "Taufik", "Wahyu", "Yoga", "Zaki", "Bagus", "Dimas", "Rizky"];
const NAMA_DEPAN_P = ["Siti", "Dewi", "Fitri", "Hana", "Kartika", "Melati", "Putri", "Ratna", "Sari", "Tania", "Wulan", "Yuni", "Ayu", "Bella", "Citra", "Dinda", "Intan", "Nabila", "Salsabila", "Zahra"];
const NAMA_BELAKANG = ["Santoso", "Wijaya", "Kusuma", "Pratama", "Ramadhan", "Saputra", "Handayani", "Lestari", "Permata", "Nurhaliza", "Maulana", "Firmansyah", "Setiawan", "Hidayat", "Utami", "Wibowo", "Anggraini", "Rahayu", "Gunawan", "Halim"];

/** Distribusi skor realistis relatif ke KKM: ~80% lulus wajar, ~15% pas-pasan, ~5% di bawah KKM. */
function skorAcak(kkm: number): number {
  const r = Math.random();
  let skor: number;
  if (r < 0.05) skor = kkm - 1 - Math.floor(Math.random() * 20);
  else if (r < 0.2) skor = kkm - 3 + Math.floor(Math.random() * 7);
  else skor = kkm + Math.floor(Math.random() * 26);
  return Math.max(0, Math.min(100, skor));
}

async function createManyChunked<T>(fn: (data: T[]) => Promise<unknown>, rows: T[], size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    await fn(rows.slice(i, i + size));
  }
}

async function main() {
  console.log("🔎 Mencari data existing (sekolah, tahun ajaran, mapel, guru spesialis)...");
  const sekolah = await prisma.sekolah.findFirst({ where: { nama: "SD Harapan Bangsa" } });
  if (!sekolah) throw new Error("Sekolah utama 'SD Harapan Bangsa' tidak ditemukan — jalankan `npm run db:seed` dulu.");

  const tahunAjaran = await prisma.tahunAjaran.findFirst({ where: { sekolahId: sekolah.id, aktif: true } });
  if (!tahunAjaran) throw new Error("Tahun ajaran aktif untuk sekolah ini tidak ditemukan.");

  const mapelRows = await prisma.mataPelajaran.findMany({ where: { sekolahId: sekolah.id } });
  const mapelMap = new Map(mapelRows.map((m) => [m.nama, m]));
  for (const nm of MAPEL_UTAMA) {
    if (!mapelMap.has(nm)) throw new Error(`Mapel "${nm}" tidak ditemukan di sekolah ini.`);
  }

  async function guruByEmail(email: string) {
    const akun = await prisma.pengguna.findUnique({ where: { email }, include: { guruProfil: true } });
    if (!akun || !akun.guruProfil) throw new Error(`Guru dengan email ${email} tidak ditemukan.`);
    return { akunId: akun.id, profilId: akun.guruProfil.id };
  }
  const rina = await guruByEmail("rina@selarasajar.demo"); // Matematika
  const solihin = await guruByEmail("solihin@selarasajar.demo"); // Bahasa Indonesia
  const yuni = await guruByEmail("yuni@selarasajar.demo"); // IPAS
  const wulan = await guruByEmail("wulan@selarasajar.demo"); // PPKn & Seni Budaya
  const zainal = await guruByEmail("zainal@selarasajar.demo"); // Pendidikan Agama
  const fikri = await guruByEmail("fikri@selarasajar.demo"); // PJOK

  console.log("👤 Membuat guru baru: Bu Nadia Kurniasari (Bahasa Inggris, 10 kelas)...");
  const nadiaAkunId = randomUUID();
  const nadiaProfilId = randomUUID();
  const hash = await bcrypt.hash(PASSWORD, 10);
  await prisma.pengguna.create({
    data: { id: nadiaAkunId, sekolahId: sekolah.id, nama: "Bu Nadia Kurniasari", email: "nadia@selarasajar.demo", passwordHash: hash, peran: "GURU", telepon: "081234509001" },
  });
  await prisma.guruProfil.create({
    data: { id: nadiaProfilId, penggunaId: nadiaAkunId, nip: "198808142013012099", mapelUtama: "Bahasa Inggris" },
  });
  const nadia = { akunId: nadiaAkunId, profilId: nadiaProfilId };

  console.log("🏫 Membuat 10 kelas baru (terisolasi dari 24 kelas seed asli)...");
  const KELAS_BARU: { nama: string; tingkat: number }[] = [
    { nama: "4E", tingkat: 4 }, { nama: "4F", tingkat: 4 }, { nama: "4G", tingkat: 4 }, { nama: "4H", tingkat: 4 },
    { nama: "5E", tingkat: 5 }, { nama: "5F", tingkat: 5 }, { nama: "5G", tingkat: 5 },
    { nama: "6E", tingkat: 6 }, { nama: "6F", tingkat: 6 }, { nama: "6G", tingkat: 6 },
  ];
  const kelasList: { id: string; nama: string; tingkat: number }[] = [];
  for (const k of KELAS_BARU) {
    const id = randomUUID();
    await prisma.kelas.create({ data: { id, sekolahId: sekolah.id, tahunAjaranId: tahunAjaran.id, nama: k.nama, tingkat: k.tingkat } });
    kelasList.push({ id, ...k });
  }
  const kelasWaliId = kelasList[0].id; // "4E" — Bu Nadia jadi wali di sini
  await prisma.kelas.update({ where: { id: kelasWaliId }, data: { waliKelasId: nadiaAkunId } });
  console.log(`   Wali kelas Bu Nadia: ${kelasList[0].nama}`);

  function guruMapelDiKelas(mapelNama: string, kelasId: string) {
    const isWali = kelasId === kelasWaliId;
    if (mapelNama === "Bahasa Inggris") return nadia;
    if (mapelNama === "Matematika") return rina;
    if (mapelNama === "Bahasa Indonesia") return solihin;
    if (mapelNama === "IPAS") return yuni;
    if (mapelNama === "Pendidikan Agama") return zainal;
    if (mapelNama === "PJOK") return fikri;
    if (mapelNama === "Seni Budaya") return wulan;
    if (mapelNama === "PPKn") return isWali ? nadia : wulan;
    throw new Error(`Mapel tak dikenal: ${mapelNama}`);
  }

  console.log("🏷 Penugasan guru (8 mapel × 10 kelas = 80 baris)...");
  const penugasanRows = kelasList.flatMap((k) =>
    MAPEL_UTAMA.map((mapelNama) => ({
      id: randomUUID(),
      guruId: guruMapelDiKelas(mapelNama, k.id).profilId,
      kelasId: k.id,
      mapelId: mapelMap.get(mapelNama)!.id,
    })),
  );
  await prisma.penugasanGuru.createMany({ data: penugasanRows });

  console.log("🎒 Membuat 400 murid (10 kelas × 40)...");
  // NISN existing tertinggi di DB ini per pengecekan manual ~98237672 — mulai dari 99000001 supaya jelas terisolasi.
  let nisnCounter = 99000000;
  const siswaList: { id: string; kelasId: string }[] = [];
  const siswaRows: { id: string; sekolahId: string; kelasId: string; nisn: string; nama: string; jenisKelamin: "L" | "P" }[] = [];
  for (const k of kelasList) {
    for (let i = 0; i < 40; i++) {
      const jk: "L" | "P" = i % 2 === 0 ? "L" : "P";
      const depan = jk === "L" ? NAMA_DEPAN_L[Math.floor(Math.random() * NAMA_DEPAN_L.length)] : NAMA_DEPAN_P[Math.floor(Math.random() * NAMA_DEPAN_P.length)];
      const belakang = NAMA_BELAKANG[Math.floor(Math.random() * NAMA_BELAKANG.length)];
      nisnCounter++;
      const id = randomUUID();
      siswaRows.push({ id, sekolahId: sekolah.id, kelasId: k.id, nisn: String(nisnCounter), nama: `${depan} ${belakang}`, jenisKelamin: jk });
      siswaList.push({ id, kelasId: k.id });
    }
  }
  await createManyChunked((data) => prisma.siswa.createMany({ data }), siswaRows, 200);

  const siswaByKelas = new Map<string, string[]>();
  for (const s of siswaList) {
    const arr = siswaByKelas.get(s.kelasId) ?? [];
    arr.push(s.id);
    siswaByKelas.set(s.kelasId, arr);
  }

  // Dikumpulkan bareng semua sumber (Tugas & Ujian) lalu di-insert sekali di akhir sebagai `Nilai`.
  const nilaiRows: { id: string; siswaId: string; kelasId: string; mapelId: string; komponen: string; judul: string; skor: number }[] = [];

  console.log("📝 Membuat Tugas + PengumpulanTugas (3 tugas/mapel/kelas → 240 tugas, 9.600 pengumpulan)...");
  const tenggat = new Date("2026-11-30");
  for (const k of kelasList) {
    const tugasBatch: { id: string; kelasId: string; mapelId: string; penggunaId: string; judul: string; instruksi: string; tenggat: Date }[] = [];
    const pengumpulanBatch: { id: string; tugasId: string; siswaId: string; nilai: number }[] = [];
    for (const mapelNama of MAPEL_UTAMA) {
      const mapel = mapelMap.get(mapelNama)!;
      const guru = guruMapelDiKelas(mapelNama, k.id);
      for (let t = 1; t <= 3; t++) {
        const tugasId = randomUUID();
        const judul = `Tugas ${t}`;
        tugasBatch.push({
          id: tugasId, kelasId: k.id, mapelId: mapel.id, penggunaId: guru.akunId,
          judul, instruksi: `Kerjakan latihan ${mapelNama} bab berjalan, kumpulkan sebelum tenggat.`, tenggat,
        });
        for (const siswaId of siswaByKelas.get(k.id)!) {
          const skor = skorAcak(mapel.kkm);
          pengumpulanBatch.push({ id: randomUUID(), tugasId, siswaId, nilai: skor });
          nilaiRows.push({ id: randomUUID(), siswaId, kelasId: k.id, mapelId: mapel.id, komponen: "Tugas", judul, skor });
        }
      }
    }
    await prisma.tugas.createMany({ data: tugasBatch });
    await createManyChunked((data) => prisma.pengumpulanTugas.createMany({ data }), pengumpulanBatch, 500);
    console.log(`   Tugas kelas ${k.nama} selesai.`);
  }

  console.log("🧾 Membuat Ujian (5 harian + 1 UTS + 1 UAS per mapel = 56 ujian, lintas 10 kelas)...");
  const now = new Date();
  const ujianKelasRows: { id: string; ujianId: string; kelasId: string }[] = [];
  const pengerjaanRows: { id: string; ujianId: string; siswaId: string; status: "SELESAI"; soalUrutan: string; waktuMulai: Date; waktuSelesai: Date; nilaiTotal: number; koreksiDikonfirmasi: boolean; dikonfirmasiPada: Date }[] = [];

  for (const mapelNama of MAPEL_UTAMA) {
    const mapel = mapelMap.get(mapelNama)!;
    // dibuatOlehId: guru mayoritas mapel ini (utk PPKn pakai Wulan, dia yg pegang di 9/10 kelas).
    const guru = guruMapelDiKelas(mapelNama, kelasList.find((k) => k.id !== kelasWaliId)!.id);
    const spesifikasi: { judul: string; jenisPenilaian: "HARIAN" | "UTS" | "UAS"; jenis: "UJIAN" | "LATIHAN" }[] = [
      { judul: "Ulangan Harian 1", jenisPenilaian: "HARIAN", jenis: "UJIAN" },
      { judul: "Ulangan Harian 2", jenisPenilaian: "HARIAN", jenis: "UJIAN" },
      { judul: "Ulangan Harian 3", jenisPenilaian: "HARIAN", jenis: "UJIAN" },
      { judul: "Latihan Harian 4", jenisPenilaian: "HARIAN", jenis: "LATIHAN" },
      { judul: "Latihan Harian 5", jenisPenilaian: "HARIAN", jenis: "LATIHAN" },
      { judul: "UTS Semester Ganjil", jenisPenilaian: "UTS", jenis: "UJIAN" },
      { judul: "UAS Semester Ganjil", jenisPenilaian: "UAS", jenis: "UJIAN" },
    ];
    for (const spec of spesifikasi) {
      const ujianId = randomUUID();
      const judulLengkap = `${spec.judul} — ${mapelNama}`;
      const komponen = spec.jenisPenilaian === "HARIAN" ? "Ulangan Harian" : spec.jenisPenilaian;
      const kkmEfektif = spec.jenisPenilaian === "UTS" ? (mapel.kkmUTS ?? mapel.kkm) : spec.jenisPenilaian === "UAS" ? (mapel.kkmUAS ?? mapel.kkm) : mapel.kkm;
      await prisma.ujian.create({
        data: {
          id: ujianId, mapelId: mapel.id, dibuatOlehId: guru.akunId, judul: judulLengkap,
          jenis: spec.jenis, jenisPenilaian: spec.jenisPenilaian, status: "PUBLISHED",
          modeHasil: "SETELAH_JADWAL_BERAKHIR",
        },
      });
      for (const k of kelasList) {
        ujianKelasRows.push({ id: randomUUID(), ujianId, kelasId: k.id });
        for (const siswaId of siswaByKelas.get(k.id)!) {
          const skor = skorAcak(kkmEfektif);
          pengerjaanRows.push({
            id: randomUUID(), ujianId, siswaId, status: "SELESAI", soalUrutan: "[]",
            waktuMulai: now, waktuSelesai: now, nilaiTotal: skor, koreksiDikonfirmasi: true, dikonfirmasiPada: now,
          });
          nilaiRows.push({ id: randomUUID(), siswaId, kelasId: k.id, mapelId: mapel.id, komponen, judul: judulLengkap, skor });
        }
      }
    }
    console.log(`   Ujian mapel ${mapelNama} selesai (7 ujian × 10 kelas).`);
  }
  await createManyChunked((data) => prisma.ujianKelas.createMany({ data }), ujianKelasRows, 500);
  await createManyChunked((data) => prisma.ujianPengerjaan.createMany({ data }), pengerjaanRows, 1000);

  console.log(`📊 Menulis ${nilaiRows.length} baris Nilai (target: 400×8×10 = 32.000)...`);
  await createManyChunked((data) => prisma.nilai.createMany({ data }), nilaiRows, 1000);

  console.log("\n✅ Selesai. Ringkasan:");
  console.log(`   Guru baru        : 1 (nadia@selarasajar.demo / ${PASSWORD})`);
  console.log(`   Kelas baru       : ${kelasList.length} (${kelasList.map((k) => k.nama).join(", ")}) — wali kelas Nadia: ${kelasList[0].nama}`);
  console.log(`   Murid baru       : ${siswaRows.length}`);
  console.log(`   PenugasanGuru    : ${penugasanRows.length}`);
  console.log(`   Ujian            : ${MAPEL_UTAMA.length * 7}`);
  console.log(`   UjianPengerjaan  : ${pengerjaanRows.length}`);
  console.log(`   Nilai            : ${nilaiRows.length}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
