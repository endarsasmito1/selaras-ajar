-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tagihan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "tipeId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BELUM_BAYAR',
    "jatuhTempo" DATETIME NOT NULL,
    "dibayarPada" DATETIME,
    "metodeBayar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tahunAjaranId" TEXT,
    CONSTRAINT "Tagihan_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tagihan_tipeId_fkey" FOREIGN KEY ("tipeId") REFERENCES "TagihanTipe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tagihan_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tagihan" ("createdAt", "dibayarPada", "id", "jatuhTempo", "metodeBayar", "nominal", "periode", "siswaId", "status", "tipeId") SELECT "createdAt", "dibayarPada", "id", "jatuhTempo", "metodeBayar", "nominal", "periode", "siswaId", "status", "tipeId" FROM "Tagihan";
DROP TABLE "Tagihan";
ALTER TABLE "new_Tagihan" RENAME TO "Tagihan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
