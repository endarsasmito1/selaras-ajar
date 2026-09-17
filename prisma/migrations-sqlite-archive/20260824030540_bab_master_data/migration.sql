-- AlterTable
ALTER TABLE "MataPelajaran" ADD COLUMN "silabusUrl" TEXT;

-- CreateTable
CREATE TABLE "Bab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bab_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bab_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MateriBelajar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "babId" TEXT,
    "rppId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MateriBelajar_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MateriBelajar_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MateriBelajar_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MateriBelajar_babId_fkey" FOREIGN KEY ("babId") REFERENCES "Bab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MateriBelajar_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MateriBelajar" ("createdAt", "id", "isi", "judul", "kelasId", "mapelId", "penggunaId", "rppId", "tipe") SELECT "createdAt", "id", "isi", "judul", "kelasId", "mapelId", "penggunaId", "rppId", "tipe" FROM "MateriBelajar";
DROP TABLE "MateriBelajar";
ALTER TABLE "new_MateriBelajar" RENAME TO "MateriBelajar";
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
    "tampilkanHasilSetelahSubmit" BOOLEAN NOT NULL DEFAULT true,
    "rppId" TEXT,
    "babId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ujian_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ujian_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ujian_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ujian_babId_fkey" FOREIGN KEY ("babId") REFERENCES "Bab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ujian" ("acakJawaban", "acakSoal", "createdAt", "dibuatOlehId", "durasiMenit", "id", "jenis", "jenisPenilaian", "judul", "mapelId", "rppId", "sekaliAkses", "status", "tampilkanHasilSetelahSubmit") SELECT "acakJawaban", "acakSoal", "createdAt", "dibuatOlehId", "durasiMenit", "id", "jenis", "jenisPenilaian", "judul", "mapelId", "rppId", "sekaliAkses", "status", "tampilkanHasilSetelahSubmit" FROM "Ujian";
DROP TABLE "Ujian";
ALTER TABLE "new_Ujian" RENAME TO "Ujian";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Bab_mapelId_nama_key" ON "Bab"("mapelId", "nama");

