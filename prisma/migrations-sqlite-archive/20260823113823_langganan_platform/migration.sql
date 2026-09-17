-- CreateTable
CREATE TABLE "Langganan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "paket" TEXT NOT NULL,
    "hargaPerBulan" INTEGER NOT NULL,
    "mulai" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    CONSTRAINT "Langganan_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PembayaranLangganan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "langgananId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "dibayarPada" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'BELUM_BAYAR',
    CONSTRAINT "PembayaranLangganan_langgananId_fkey" FOREIGN KEY ("langgananId") REFERENCES "Langganan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Langganan_sekolahId_key" ON "Langganan"("sekolahId");

-- CreateIndex
CREATE UNIQUE INDEX "PembayaranLangganan_langgananId_periode_key" ON "PembayaranLangganan"("langgananId", "periode");
