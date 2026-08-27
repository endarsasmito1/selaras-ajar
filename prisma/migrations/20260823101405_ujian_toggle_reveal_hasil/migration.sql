-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ujian_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ujian_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ujian_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ujian" ("acakJawaban", "acakSoal", "createdAt", "dibuatOlehId", "durasiMenit", "id", "jenis", "jenisPenilaian", "judul", "mapelId", "rppId", "sekaliAkses", "status") SELECT "acakJawaban", "acakSoal", "createdAt", "dibuatOlehId", "durasiMenit", "id", "jenis", "jenisPenilaian", "judul", "mapelId", "rppId", "sekaliAkses", "status" FROM "Ujian";
DROP TABLE "Ujian";
ALTER TABLE "new_Ujian" RENAME TO "Ujian";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
