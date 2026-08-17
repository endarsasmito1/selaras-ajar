-- CreateTable
CREATE TABLE "Soal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "opsi" TEXT,
    "kunciJawaban" TEXT,
    "topik" TEXT,
    "tingkatKesulitan" TEXT,
    "poinDefault" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Soal_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soal_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soal_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ujian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'UJIAN',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "jamMulai" DATETIME,
    "jamSelesai" DATETIME,
    "durasiMenit" INTEGER,
    "acakSoal" BOOLEAN NOT NULL DEFAULT true,
    "acakJawaban" BOOLEAN NOT NULL DEFAULT true,
    "sekaliAkses" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ujian_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ujian_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ujian_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UjianSoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ujianId" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "poin" INTEGER NOT NULL,
    CONSTRAINT "UjianSoal_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianSoal_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "Soal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UjianPengerjaan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ujianId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BELUM_MULAI',
    "soalUrutan" TEXT NOT NULL,
    "waktuMulai" DATETIME,
    "waktuSelesai" DATETIME,
    "nilaiTotal" REAL,
    CONSTRAINT "UjianPengerjaan_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianPengerjaan_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UjianJawaban" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pengerjaanId" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "opsiUrutan" TEXT,
    "jawabanPG" INTEGER,
    "jawabanTeks" TEXT,
    "benar" BOOLEAN,
    "skor" REAL,
    "dinilaiOlehId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UjianJawaban_pengerjaanId_fkey" FOREIGN KEY ("pengerjaanId") REFERENCES "UjianPengerjaan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianJawaban_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "Soal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianJawaban_dinilaiOlehId_fkey" FOREIGN KEY ("dinilaiOlehId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeScale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "minSkor" INTEGER NOT NULL,
    "maxSkor" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GradeScale_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PengajuanIzin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "diajukanOlehId" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "jenis" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU',
    "disetujuiOlehId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PengajuanIzin_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengajuanIzin_diajukanOlehId_fkey" FOREIGN KEY ("diajukanOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengajuanIzin_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DanaAlokasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DanaAlokasi_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentPDP" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "penggunaId" TEXT NOT NULL,
    "disetujui" BOOLEAN NOT NULL DEFAULT false,
    "waktuPersetujuan" DATETIME,
    "versiKebijakan" TEXT NOT NULL DEFAULT '1.0',
    CONSTRAINT "ConsentPDP_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatatanSupervisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guruId" TEXT NOT NULL,
    "kepsekId" TEXT NOT NULL,
    "catatan" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatatanSupervisi_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatatanSupervisi_kepsekId_fkey" FOREIGN KEY ("kepsekId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PPDBPendaftar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "namaCalon" TEXT NOT NULL,
    "jenjangDaftar" TEXT NOT NULL,
    "namaOrtu" TEXT NOT NULL,
    "kontak" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BARU',
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PPDBPendaftar_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgendaAkademik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "jenis" TEXT NOT NULL,
    "keterangan" TEXT,
    CONSTRAINT "AgendaAkademik_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pesan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pengirimId" TEXT NOT NULL,
    "penerimaId" TEXT,
    "kelasIdTarget" TEXT,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pesan_pengirimId_fkey" FOREIGN KEY ("pengirimId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pesan_penerimaId_fkey" FOREIGN KEY ("penerimaId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pesan_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Pesan" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Pesan" ("createdAt", "id", "isi", "judul", "kelasIdTarget", "penerimaId", "pengirimId") SELECT "createdAt", "id", "isi", "judul", "kelasIdTarget", "penerimaId", "pengirimId" FROM "Pesan";
DROP TABLE "Pesan";
ALTER TABLE "new_Pesan" RENAME TO "Pesan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UjianSoal_ujianId_soalId_key" ON "UjianSoal"("ujianId", "soalId");

-- CreateIndex
CREATE UNIQUE INDEX "UjianPengerjaan_ujianId_siswaId_key" ON "UjianPengerjaan"("ujianId", "siswaId");

-- CreateIndex
CREATE UNIQUE INDEX "UjianJawaban_pengerjaanId_soalId_key" ON "UjianJawaban"("pengerjaanId", "soalId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentPDP_penggunaId_key" ON "ConsentPDP"("penggunaId");
