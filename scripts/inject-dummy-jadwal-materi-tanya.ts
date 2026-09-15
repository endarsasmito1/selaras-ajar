// Lanjutan scripts/inject-dummy-guru-multi-kelas.ts — mengisi 3 hal yang kosong di 10 kelas
// skenario Bu Nadia (feedback Sep 2026): jadwal pelajaran, materi belajar, tanya jawab kelas.
// Non-destruktif: cuma nambah, gak menyentuh 24 kelas seed asli atau data yang sudah diinjeksi.
//
// Jalankan SETELAH scripts/inject-dummy-guru-multi-kelas.ts: npx tsx scripts/inject-dummy-jadwal-materi-tanya.ts

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const PASSWORD = "selaras123";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const KELAS_BARU_NAMA = ["4E", "4F", "4G", "4H", "5E", "5F", "5G", "6E", "6F", "6G"];
const MAPEL_UTAMA = ["Pendidikan Agama", "PPKn", "Bahasa Indonesia", "Matematika", "IPAS", "PJOK", "Seni Budaya", "Bahasa Inggris"];

// Feedback teknis (Sep 2026) — sebelumnya cuma 5 sesi pagi × 5 hari (25 slot/minggu/guru), yang di
// seed ASLI saja sudah nyaris penuh buat guru spesialis lintas-24-kelas (Zainal/Fikri: 24/25 slot
// terpakai). Nambah 10 kelas lagi ke guru yang SAMA (bukan bikin guru baru per mapel) gak akan
// muat tanpa expand kapasitas — jadi digenapin ke 6 hari (Senin–Sabtu, dipayungi schema `hari 1..6`)
// + sesi siang, muat 54 slot/minggu/guru, jauh lebih dari cukup (butuh maks +10 per guru).
const JAM_SESI = [
  { mulai: "07:00", selesai: "07:40" },
  { mulai: "07:40", selesai: "08:20" },
  { mulai: "08:40", selesai: "09:20" },
  { mulai: "09:20", selesai: "10:00" },
  { mulai: "10:00", selesai: "10:40" },
  { mulai: "10:40", selesai: "11:20" },
  { mulai: "11:20", selesai: "12:00" },
  { mulai: "13:00", selesai: "13:40" },
  { mulai: "13:40", selesai: "14:20" },
];

const CATATAN_PER_MAPEL: Record<string, string[]> = {
  Matematika: [
    "Pecahan senilai punya nilai sama meski angka pembilang/penyebutnya beda, misalnya 1/2 = 2/4 = 3/6 — didapat dengan mengalikan atau membagi pembilang & penyebut dengan angka yang sama.",
    "KPK (Kelipatan Persekutuan Terkecil) dan FPB (Faktor Persekutuan Terbesar) dicari lewat pohon faktor — KPK dari perkalian semua faktor prima pangkat tertinggi, FPB dari faktor prima yang sama pangkat terendah.",
  ],
  "Pendidikan Agama": [
    "Rukun Islam ada 5: syahadat, shalat, zakat, puasa, dan haji bagi yang mampu — jadi fondasi ibadah sehari-hari umat Islam.",
    "Akhlak terpuji seperti jujur, amanah, dan tolong-menolong dicontohkan langsung lewat kisah para nabi, bukan sekadar dihafal.",
  ],
  PPKn: [
    "Pancasila terdiri dari 5 sila yang saling melengkapi, dari Ketuhanan sampai Keadilan Sosial — jadi dasar bersikap di sekolah maupun masyarakat.",
    "Hak dan kewajiban berjalan beriringan: siswa berhak dapat pelajaran, tapi juga wajib menjaga ketertiban kelas dan menghormati teman.",
  ],
  "Bahasa Indonesia": [
    "Kalimat efektif itu singkat, jelas, dan tidak bertele-tele — hindari pengulangan kata yang tidak perlu supaya pesan mudah dipahami pembaca.",
    "Paragraf yang baik punya 1 gagasan utama yang didukung beberapa kalimat penjelas, bukan sekadar kumpulan kalimat acak.",
  ],
  IPAS: [
    "Fotosintesis adalah proses tumbuhan hijau membuat makanan sendiri dari air, karbon dioksida, dan cahaya matahari, menghasilkan oksigen sebagai hasil sampingnya.",
    "Siklus air terjadi lewat 3 tahap utama: penguapan (air jadi uap), kondensasi (uap jadi awan), dan presipitasi (awan turun jadi hujan).",
  ],
  PJOK: [
    "Pemanasan sebelum olahraga penting untuk menyiapkan otot dan mencegah cedera — minimal 5-10 menit gerakan ringan sebelum aktivitas inti.",
    "Permainan bola besar seperti sepak bola melatih kerja sama tim, selain kebugaran fisik seperti kecepatan dan daya tahan.",
  ],
  "Seni Budaya": [
    "Warna primer (merah, kuning, biru) jadi dasar semua campuran warna lain — dua warna primer dicampur menghasilkan warna sekunder.",
    "Setiap daerah di Indonesia punya alat musik tradisional khas, seperti angklung dari Jawa Barat yang dimainkan dengan cara digoyangkan.",
  ],
  "Bahasa Inggris": [
    "Simple Present Tense dipakai untuk kebiasaan atau fakta umum, contoh: 'She goes to school every day' — tambahkan 's/es' untuk subjek tunggal (he/she/it).",
    "Vocabulary sehari-hari perlu dilatih lewat konteks kalimat, bukan cuma dihafal daftar kata, supaya lebih mudah diingat dan dipakai.",
  ],
};

async function main() {
  console.log("🔎 Mencari 10 kelas skenario Bu Nadia beserta penugasan guru & muridnya...");
  const kelasList = await prisma.kelas.findMany({ where: { nama: { in: KELAS_BARU_NAMA } }, include: { siswa: { select: { id: true, nama: true, akunId: true } } } });
  if (kelasList.length !== 10) throw new Error(`Ekspektasi 10 kelas, ketemu ${kelasList.length} — sudah jalankan inject-dummy-guru-multi-kelas.ts?`);

  const sekolahId = kelasList[0].sekolahId;
  const mapelRows = await prisma.mataPelajaran.findMany({ where: { sekolahId } });
  const mapelMap = new Map(mapelRows.map((m) => [m.nama, m]));

  const penugasanRows = await prisma.penugasanGuru.findMany({
    where: { kelasId: { in: kelasList.map((k) => k.id) } },
    include: { guru: { include: { pengguna: true } } },
  });
  const penugasanByKelas = new Map<string, { mapelId: string; guruId: string; guruAkunId: string; mapelNama: string }[]>();
  for (const p of penugasanRows) {
    const mapelNama = mapelRows.find((m) => m.id === p.mapelId)!.nama;
    const arr = penugasanByKelas.get(p.kelasId) ?? [];
    arr.push({ mapelId: p.mapelId, guruId: p.guruId, guruAkunId: p.guru.penggunaId, mapelNama });
    penugasanByKelas.set(p.kelasId, arr);
  }

  console.log("📅 Menyusun jadwal pelajaran (cek konflik lawan jadwal yang sudah ada)...");
  const tahunAjaranId = kelasList[0].tahunAjaranId;
  const jadwalEksisting = await prisma.jadwalEntry.findMany({ where: { tahunAjaranId }, select: { guruId: true, hari: true, jamMulai: true } });
  const guruBooked = new Set(jadwalEksisting.map((j) => `${j.guruId}-${j.hari}-${j.jamMulai}`));

  const jadwalRows: { id: string; kelasId: string; mapelId: string; guruId: string; hari: number; jamMulai: string; jamSelesai: string; tahunAjaranId: string }[] = [];
  for (const k of kelasList) {
    const daftar = penugasanByKelas.get(k.id) ?? [];
    let idx = 0;
    for (let hari = 1; hari <= 6 && idx < daftar.length; hari++) {
      for (const sesi of JAM_SESI) {
        if (idx >= daftar.length) break;
        const { mapelId, guruId } = daftar[idx];
        const key = `${guruId}-${hari}-${sesi.mulai}`;
        if (guruBooked.has(key)) continue;
        jadwalRows.push({ id: randomUUID(), kelasId: k.id, mapelId, guruId, hari, jamMulai: sesi.mulai, jamSelesai: sesi.selesai, tahunAjaranId });
        guruBooked.add(key);
        idx++;
      }
    }
    if (idx < daftar.length) {
      console.warn(`   ⚠ Kelas ${k.nama}: ${daftar.length - idx} mapel gak kebagian slot (kapasitas guru penuh) — cek manual.`);
    }
  }
  await prisma.jadwalEntry.createMany({ data: jadwalRows });
  console.log(`   ${jadwalRows.length} entri jadwal dibuat (target ${kelasList.length * MAPEL_UTAMA.length}).`);

  console.log("📚 Menulis materi belajar (2 catatan per mapel per kelas)...");
  const babByMapel = new Map<string, string>();
  for (const nm of MAPEL_UTAMA) {
    const bab = await prisma.bab.findFirst({ where: { mapelId: mapelMap.get(nm)!.id, nama: "Bab 1" } });
    if (!bab) throw new Error(`Bab "Bab 1" utk mapel ${nm} tidak ditemukan — jalankan npm run db:seed dulu.`);
    babByMapel.set(nm, bab.id);
  }
  const materiRows: { id: string; kelasId: string; mapelId: string; penggunaId: string; judul: string; tipe: string; isi: string; babId: string }[] = [];
  for (const k of kelasList) {
    const daftar = penugasanByKelas.get(k.id) ?? [];
    for (const p of daftar) {
      const catatanList = CATATAN_PER_MAPEL[p.mapelNama] ?? ["Catatan ringkas materi berjalan."];
      catatanList.forEach((catatan, i) => {
        materiRows.push({
          id: randomUUID(), kelasId: k.id, mapelId: p.mapelId, penggunaId: p.guruAkunId,
          judul: `Catatan ${p.mapelNama} ${i + 1} — Kelas ${k.nama}`,
          // Feedback teknis (Sep 2026) — tipe "catatan" + isi teks asli (BUKAN tipe "dokumen" dgn isi
          // deskripsi kalimat biasa, seperti bug yg ketemu di materi seed lama "Rangkuman X — Y" yang
          // hrefnya jadi kalimat deskripsi, bukan berkas beneran). Di sini isi = konten aslinya.
          tipe: "catatan", isi: catatan, babId: babByMapel.get(p.mapelNama)!,
        });
      });
    }
  }
  await prisma.materiBelajar.createMany({ data: materiRows });
  console.log(`   ${materiRows.length} materi dibuat.`);

  console.log("👤 Memberi 1 murid per kelas akun login (dibutuhkan sbg penanya Tanya Jawab — TanyaJawabKelas.penggunaId merujuk Pengguna, bukan Siswa)...");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const penanyaAkunByKelas = new Map<string, string>();
  for (const k of kelasList) {
    const wakil = k.siswa[0];
    if (!wakil) continue;
    if (wakil.akunId) {
      penanyaAkunByKelas.set(k.id, wakil.akunId);
      continue;
    }
    const emailSlug = wakil.nama.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
    const akun = await prisma.pengguna.create({
      data: { sekolahId, nama: wakil.nama, email: `${emailSlug}.${k.nama.toLowerCase()}@selarasajar.demo`, passwordHash: hash, peran: "MURID" },
    });
    await prisma.siswa.update({ where: { id: wakil.id }, data: { akunId: akun.id } });
    penanyaAkunByKelas.set(k.id, akun.id);
  }

  console.log("💬 Menulis tanya jawab kelas (1 pertanyaan + 1 balasan guru per mapel per kelas)...");
  const tanyaRows: { id: string; kelasId: string; mapelId: string; penggunaId: string; anonim: boolean; isi: string; parentId: string | null }[] = [];
  const PERTANYAAN_CONTOH = [
    "Bu/Pak, untuk tugas bab ini dikumpulkan lewat aplikasi atau ditulis tangan ya?",
    "Maaf mau tanya, materi hari ini apakah akan keluar di ulangan harian minggu depan?",
    "Izin bertanya, kalau belum paham bagian ini boleh minta dijelaskan ulang pas jam pelajaran berikutnya?",
  ];
  const BALASAN_CONTOH = [
    "Boleh lewat aplikasi ya, supaya lebih rapi dan gampang dicek Bapak/Ibu.",
    "Iya, jadi pelajari baik-baik catatannya ya, nanti dibahas lagi sebelum ulangan.",
    "Boleh sekali, nanti kita ulas lagi sama-sama di kelas ya.",
  ];
  for (const k of kelasList) {
    const daftar = penugasanByKelas.get(k.id) ?? [];
    const penanyaAkunId = penanyaAkunByKelas.get(k.id);
    if (!penanyaAkunId) continue;
    daftar.forEach((p, i) => {
      const pertanyaanId = randomUUID();
      tanyaRows.push({
        id: pertanyaanId, kelasId: k.id, mapelId: p.mapelId, penggunaId: penanyaAkunId, anonim: i % 3 === 0,
        isi: PERTANYAAN_CONTOH[i % PERTANYAAN_CONTOH.length], parentId: null,
      });
      tanyaRows.push({
        id: randomUUID(), kelasId: k.id, mapelId: p.mapelId, penggunaId: p.guruAkunId, anonim: false,
        isi: BALASAN_CONTOH[i % BALASAN_CONTOH.length], parentId: pertanyaanId,
      });
    });
  }
  await prisma.tanyaJawabKelas.createMany({ data: tanyaRows });
  console.log(`   ${tanyaRows.length} baris tanya-jawab dibuat (${tanyaRows.length / 2} thread).`);

  console.log("\n✅ Selesai.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
