-- AlterTable
ALTER TABLE "Pengguna" ADD COLUMN "fotoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Kelas_sekolahId_tahunAjaranId_nama_key" ON "Kelas"("sekolahId", "tahunAjaranId", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "Nilai_siswaId_kelasId_mapelId_komponen_judul_key" ON "Nilai"("siswaId", "kelasId", "mapelId", "komponen", "judul");

