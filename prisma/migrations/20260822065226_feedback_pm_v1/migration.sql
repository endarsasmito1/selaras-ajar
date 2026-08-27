-- AlterTable
ALTER TABLE "GuruProfil" ADD COLUMN "mapelDiampu" TEXT;

-- AlterTable
ALTER TABLE "MataPelajaran" ADD COLUMN "kkmUAS" INTEGER;
ALTER TABLE "MataPelajaran" ADD COLUMN "kkmUTS" INTEGER;

-- AlterTable
ALTER TABLE "UjianJawaban" ADD COLUMN "jawabanPGMulti" TEXT;

-- CreateTable
CREATE TABLE "PenggunaPeran" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "penggunaId" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "peran" TEXT NOT NULL,
    CONSTRAINT "PenggunaPeran_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PenggunaPeran_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kurikulum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "jenjang" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kurikulum_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KurikulumMapel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kurikulumId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kkm" INTEGER NOT NULL DEFAULT 70,
    CONSTRAINT "KurikulumMapel_kurikulumId_fkey" FOREIGN KEY ("kurikulumId") REFERENCES "Kurikulum" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PengumumanSekolah" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PengumumanSekolah_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengumumanSekolah_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sekolah" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "npsn" TEXT,
    "kecamatan" TEXT,
    "kabupatenKota" TEXT,
    "provinsi" TEXT,
    "kodePos" TEXT,
    "jenjang" TEXT NOT NULL,
    "satuanPeriode" TEXT NOT NULL DEFAULT 'BULANAN',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "kurikulumId" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sekolah_kurikulumId_fkey" FOREIGN KEY ("kurikulumId") REFERENCES "Kurikulum" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sekolah" ("aktif", "alamat", "createdAt", "id", "jenjang", "kabupatenKota", "kecamatan", "kodePos", "nama", "npsn", "provinsi", "satuanPeriode") SELECT "aktif", "alamat", "createdAt", "id", "jenjang", "kabupatenKota", "kecamatan", "kodePos", "nama", "npsn", "provinsi", "satuanPeriode" FROM "Sekolah";
DROP TABLE "Sekolah";
ALTER TABLE "new_Sekolah" RENAME TO "Sekolah";
CREATE TABLE "new_Soal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT,
    "mapelId" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "opsi" TEXT,
    "kunciJawaban" TEXT,
    "topik" TEXT,
    "tingkatKesulitan" TEXT,
    "poinDefault" INTEGER NOT NULL DEFAULT 10,
    "rekomendasiKelas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Soal_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Soal_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soal_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Soal" ("createdAt", "dibuatOlehId", "id", "jenis", "kunciJawaban", "mapelId", "opsi", "pertanyaan", "poinDefault", "sekolahId", "tingkatKesulitan", "topik") SELECT "createdAt", "dibuatOlehId", "id", "jenis", "kunciJawaban", "mapelId", "opsi", "pertanyaan", "poinDefault", "sekolahId", "tingkatKesulitan", "topik" FROM "Soal";
DROP TABLE "Soal";
ALTER TABLE "new_Soal" RENAME TO "Soal";
CREATE TABLE "new_Ujian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mapelId" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'UJIAN',
    "jenisPenilaian" TEXT NOT NULL DEFAULT 'HARIAN',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "durasiMenit" INTEGER,
    "acakSoal" BOOLEAN NOT NULL DEFAULT true,
    "acakJawaban" BOOLEAN NOT NULL DEFAULT true,
    "sekaliAkses" BOOLEAN NOT NULL DEFAULT true,
    "rppId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ujian_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ujian_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ujian_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ujian" ("acakJawaban", "acakSoal", "createdAt", "dibuatOlehId", "durasiMenit", "id", "jenis", "judul", "mapelId", "rppId", "sekaliAkses", "status") SELECT "acakJawaban", "acakSoal", "createdAt", "dibuatOlehId", "durasiMenit", "id", "jenis", "judul", "mapelId", "rppId", "sekaliAkses", "status" FROM "Ujian";
DROP TABLE "Ujian";
ALTER TABLE "new_Ujian" RENAME TO "Ujian";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PenggunaPeran_penggunaId_sekolahId_peran_key" ON "PenggunaPeran"("penggunaId", "sekolahId", "peran");
