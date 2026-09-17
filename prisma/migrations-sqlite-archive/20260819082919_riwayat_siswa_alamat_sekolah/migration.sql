-- AlterTable
ALTER TABLE "Sekolah" ADD COLUMN "alamat" TEXT;

-- AlterTable
ALTER TABLE "Siswa" ADD COLUMN "keteranganKeluar" TEXT;
ALTER TABLE "Siswa" ADD COLUMN "statusKeluar" TEXT;
ALTER TABLE "Siswa" ADD COLUMN "tanggalKeluar" DATETIME;
