-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "penggunaId" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "entitasKey" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "href" TEXT,
    "prioritas" TEXT NOT NULL DEFAULT 'SEDANG',
    "dibacaPada" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notifikasi_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Notifikasi_penggunaId_dibacaPada_idx" ON "Notifikasi"("penggunaId", "dibacaPada");

-- CreateIndex
CREATE UNIQUE INDEX "Notifikasi_penggunaId_tipe_entitasKey_key" ON "Notifikasi"("penggunaId", "tipe", "entitasKey");
