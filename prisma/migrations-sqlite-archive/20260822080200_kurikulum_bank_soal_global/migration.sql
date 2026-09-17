-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Soal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT,
    "mapelId" TEXT,
    "mapelNama" TEXT,
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
    CONSTRAINT "Soal_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Soal_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Soal" ("createdAt", "dibuatOlehId", "id", "jenis", "kunciJawaban", "mapelId", "opsi", "pertanyaan", "poinDefault", "rekomendasiKelas", "sekolahId", "tingkatKesulitan", "topik") SELECT "createdAt", "dibuatOlehId", "id", "jenis", "kunciJawaban", "mapelId", "opsi", "pertanyaan", "poinDefault", "rekomendasiKelas", "sekolahId", "tingkatKesulitan", "topik" FROM "Soal";
DROP TABLE "Soal";
ALTER TABLE "new_Soal" RENAME TO "Soal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
