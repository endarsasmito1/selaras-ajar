-- CreateEnum
CREATE TYPE "SatuanPeriode" AS ENUM ('BULANAN', 'SEMESTER');

-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('SUPERADMIN', 'KEPALA_SEKOLAH', 'BENDAHARA', 'TU', 'GURU', 'ORANG_TUA', 'MURID');

-- CreateEnum
CREATE TYPE "StatusKeluarSiswa" AS ENUM ('LULUS', 'PINDAH_SEKOLAH', 'MUTASI_KELUAR');

-- CreateEnum
CREATE TYPE "StatusAbsensi" AS ENUM ('HADIR', 'SAKIT', 'IZIN', 'ALPA');

-- CreateEnum
CREATE TYPE "StatusTagihan" AS ENUM ('BELUM_BAYAR', 'LUNAS', 'CICILAN');

-- CreateEnum
CREATE TYPE "JenisSoal" AS ENUM ('PILIHAN_GANDA', 'PILIHAN_GANDA_KOMPLEKS', 'PILIHAN_GANDA_MINUS', 'JAWABAN_SINGKAT', 'ESAI');

-- CreateEnum
CREATE TYPE "ModePengurangan" AS ENUM ('PERSEN', 'POIN');

-- CreateEnum
CREATE TYPE "JenisUjian" AS ENUM ('UJIAN', 'LATIHAN');

-- CreateEnum
CREATE TYPE "StatusUjian" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ModeHasilUjian" AS ENUM ('OTOMATIS_SUBMIT', 'SETELAH_JADWAL_BERAKHIR', 'JADWAL_MANUAL');

-- CreateEnum
CREATE TYPE "JenisPenilaian" AS ENUM ('HARIAN', 'UTS', 'UAS');

-- CreateEnum
CREATE TYPE "StatusPengerjaan" AS ENUM ('BELUM_MULAI', 'MENGERJAKAN', 'SELESAI', 'AUTO_SUBMIT');

-- CreateEnum
CREATE TYPE "JenisPengajuanIzin" AS ENUM ('SAKIT', 'IZIN');

-- CreateEnum
CREATE TYPE "StatusPengajuan" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusPPDB" AS ENUM ('BARU', 'DITERIMA', 'DITOLAK');

-- CreateEnum
CREATE TYPE "SumberPresensi" AS ENUM ('OTOMATIS_ABSENSI', 'MANUAL');

-- CreateEnum
CREATE TYPE "CapaianP5" AS ENUM ('BB', 'MB', 'BSH', 'SB');

-- CreateEnum
CREATE TYPE "PaketLangganan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "StatusLangganan" AS ENUM ('TRIAL', 'AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusPembayaranLangganan" AS ENUM ('LUNAS', 'BELUM_BAYAR', 'TELAT');

-- CreateEnum
CREATE TYPE "PrioritasNotif" AS ENUM ('TINGGI', 'SEDANG', 'RENDAH');

-- CreateTable
CREATE TABLE "Sekolah" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "npsn" TEXT,
    "kecamatan" TEXT,
    "kabupatenKota" TEXT,
    "provinsi" TEXT,
    "kodePos" TEXT,
    "jenjang" TEXT NOT NULL,
    "satuanPeriode" "SatuanPeriode" NOT NULL DEFAULT 'BULANAN',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "kurikulumId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sekolah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengguna" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "peran" "Peran" NOT NULL,
    "telepon" TEXT,
    "fotoUrl" TEXT,
    "jenisKelamin" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenggunaPeran" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "peran" "Peran" NOT NULL,

    CONSTRAINT "PenggunaPeran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuruProfil" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "nip" TEXT,
    "mapelUtama" TEXT,
    "mapelDiampu" TEXT,

    CONSTRAINT "GuruProfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenugasanGuru" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,

    CONSTRAINT "PenugasanGuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TahunAjaran" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "mulai" TIMESTAMP(3) NOT NULL,
    "selesai" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TahunAjaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelas" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tingkat" INTEGER NOT NULL,
    "waliKelasId" TEXT,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MataPelajaran" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kkm" INTEGER NOT NULL DEFAULT 70,
    "kkmUTS" INTEGER,
    "kkmUAS" INTEGER,
    "silabusUrl" TEXT,

    CONSTRAINT "MataPelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kurikulum" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenjang" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kurikulum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KurikulumMapel" (
    "id" TEXT NOT NULL,
    "kurikulumId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kkm" INTEGER NOT NULL DEFAULT 70,

    CONSTRAINT "KurikulumMapel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BobotKomponen" (
    "id" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "komponen" TEXT NOT NULL,
    "persentase" INTEGER NOT NULL,

    CONSTRAINT "BobotKomponen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siswa" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "nisn" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggalLahir" TIMESTAMP(3),
    "alamat" TEXT,
    "jenisKelamin" TEXT NOT NULL,
    "akunId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "statusKeluar" "StatusKeluarSiswa",
    "tanggalKeluar" TIMESTAMP(3),
    "keteranganKeluar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaliSiswa" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "hubungan" TEXT NOT NULL,

    CONSTRAINT "WaliSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absensi" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "status" "StatusAbsensi" NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nilai" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "komponen" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "skor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nilai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MateriBelajar" (
    "id" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "babId" TEXT,
    "rppId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MateriBelajar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bab" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tugas" (
    "id" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "instruksi" TEXT NOT NULL,
    "lampiranUrl" TEXT,
    "tautanUrl" TEXT,
    "rppId" TEXT,
    "tenggat" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengumpulanTugas" (
    "id" TEXT NOT NULL,
    "tugasId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "isiJawaban" TEXT,
    "lampiranUrl" TEXT,
    "tautanUrl" TEXT,
    "terlambat" BOOLEAN NOT NULL DEFAULT false,
    "nilai" DOUBLE PRECISION,
    "catatanGuru" TEXT,
    "submitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PengumpulanTugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagihanTipe" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "TagihanTipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tagihan" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tipeId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "status" "StatusTagihan" NOT NULL DEFAULT 'BELUM_BAYAR',
    "jatuhTempo" TIMESTAMP(3) NOT NULL,
    "dibayarPada" TIMESTAMP(3),
    "metodeBayar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tahunAjaranId" TEXT,

    CONSTRAINT "Tagihan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pesan" (
    "id" TEXT NOT NULL,
    "pengirimId" TEXT NOT NULL,
    "penerimaId" TEXT,
    "kelasIdTarget" TEXT,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pesan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengumumanSekolah" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PengumumanSekolah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Soal" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT,
    "mapelId" TEXT,
    "mapelNama" TEXT,
    "dibuatOlehId" TEXT NOT NULL,
    "jenis" "JenisSoal" NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "opsi" TEXT,
    "kunciJawaban" TEXT,
    "topik" TEXT,
    "tingkatKesulitan" TEXT,
    "poinDefault" INTEGER NOT NULL DEFAULT 10,
    "penguranganMode" "ModePengurangan",
    "penguranganNilai" DOUBLE PRECISION,
    "durasiDetik" INTEGER,
    "rekomendasiKelas" TEXT,
    "jenjang" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Soal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ujian" (
    "id" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "jenis" "JenisUjian" NOT NULL DEFAULT 'UJIAN',
    "jenisPenilaian" "JenisPenilaian" NOT NULL DEFAULT 'HARIAN',
    "status" "StatusUjian" NOT NULL DEFAULT 'DRAFT',
    "durasiMenit" INTEGER,
    "acakSoal" BOOLEAN NOT NULL DEFAULT true,
    "acakJawaban" BOOLEAN NOT NULL DEFAULT true,
    "sekaliAkses" BOOLEAN NOT NULL DEFAULT true,
    "modeHasil" "ModeHasilUjian" NOT NULL DEFAULT 'SETELAH_JADWAL_BERAKHIR',
    "jadwalHasilManual" TIMESTAMP(3),
    "rppId" TEXT,
    "babId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ujian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UjianKelas" (
    "id" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "jamMulai" TIMESTAMP(3),
    "jamSelesai" TIMESTAMP(3),

    CONSTRAINT "UjianKelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UjianSoal" (
    "id" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "poin" INTEGER NOT NULL,

    CONSTRAINT "UjianSoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UjianPengerjaan" (
    "id" TEXT NOT NULL,
    "ujianId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "status" "StatusPengerjaan" NOT NULL DEFAULT 'BELUM_MULAI',
    "soalUrutan" TEXT NOT NULL,
    "waktuMulai" TIMESTAMP(3),
    "waktuSelesai" TIMESTAMP(3),
    "nilaiTotal" DOUBLE PRECISION,
    "komentarGuru" TEXT,
    "koreksiDikonfirmasi" BOOLEAN NOT NULL DEFAULT false,
    "dikonfirmasiPada" TIMESTAMP(3),

    CONSTRAINT "UjianPengerjaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UjianJawaban" (
    "id" TEXT NOT NULL,
    "pengerjaanId" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "opsiUrutan" TEXT,
    "jawabanPG" INTEGER,
    "jawabanPGMulti" TEXT,
    "jawabanTeks" TEXT,
    "benar" BOOLEAN,
    "skor" DOUBLE PRECISION,
    "dinilaiOlehId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UjianJawaban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeScale" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "minSkor" INTEGER NOT NULL,
    "maxSkor" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GradeScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengajuanIzin" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "diajukanOlehId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jenis" "JenisPengajuanIzin" NOT NULL,
    "keterangan" TEXT NOT NULL,
    "status" "StatusPengajuan" NOT NULL DEFAULT 'MENUNGGU',
    "disetujuiOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lampiranUrl" TEXT,

    CONSTRAINT "PengajuanIzin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentPDP" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "disetujui" BOOLEAN NOT NULL DEFAULT false,
    "waktuPersetujuan" TIMESTAMP(3),
    "versiKebijakan" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "ConsentPDP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatatanSupervisi" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "kepsekId" TEXT NOT NULL,
    "catatan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatatanSupervisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PPDBPendaftar" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "namaCalon" TEXT NOT NULL,
    "jenjangDaftar" TEXT NOT NULL,
    "namaOrtu" TEXT NOT NULL,
    "kontak" TEXT NOT NULL,
    "status" "StatusPPDB" NOT NULL DEFAULT 'BARU',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PPDBPendaftar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaAkademik" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jenis" TEXT NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "AgendaAkademik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatatanSiswa" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "mapelKonteks" TEXT,
    "isi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatatanSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestasiSiswa" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "keterangan" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrestasiSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JadwalEntry" (
    "id" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "hari" INTEGER NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JadwalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresensiGuru" (
    "id" TEXT NOT NULL,
    "jadwalEntryId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "hadir" BOOLEAN NOT NULL,
    "sumber" "SumberPresensi" NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresensiGuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapaianPembelajaran" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "kode" TEXT,
    "deskripsi" TEXT NOT NULL,
    "tingkat" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapaianPembelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPP" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "lampiranUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RPP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPPCapaian" (
    "id" TEXT NOT NULL,
    "rppId" TEXT NOT NULL,
    "capaianId" TEXT NOT NULL,

    CONSTRAINT "RPPCapaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KomentarKonten" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "materiId" TEXT,
    "tugasId" TEXT,
    "isi" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KomentarKonten_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TanyaJawabKelas" (
    "id" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "anonim" BOOLEAN NOT NULL DEFAULT false,
    "isi" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TanyaJawabKelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatatanAsesmen" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatatanAsesmen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projek" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "dimensiP5" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Projek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjekPenilaian" (
    "id" TEXT NOT NULL,
    "projekId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "dimensi" TEXT NOT NULL,
    "capaian" "CapaianP5" NOT NULL,
    "catatan" TEXT,

    CONSTRAINT "ProjekPenilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Langganan" (
    "id" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "paket" "PaketLangganan" NOT NULL,
    "hargaPerBulan" INTEGER NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL,
    "status" "StatusLangganan" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "Langganan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PembayaranLangganan" (
    "id" TEXT NOT NULL,
    "langgananId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "dibayarPada" TIMESTAMP(3),
    "status" "StatusPembayaranLangganan" NOT NULL DEFAULT 'BELUM_BAYAR',

    CONSTRAINT "PembayaranLangganan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "entitasKey" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "href" TEXT,
    "prioritas" "PrioritasNotif" NOT NULL DEFAULT 'SEDANG',
    "dibacaPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_email_key" ON "Pengguna"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PenggunaPeran_penggunaId_sekolahId_peran_key" ON "PenggunaPeran"("penggunaId", "sekolahId", "peran");

-- CreateIndex
CREATE UNIQUE INDEX "GuruProfil_penggunaId_key" ON "GuruProfil"("penggunaId");

-- CreateIndex
CREATE UNIQUE INDEX "PenugasanGuru_guruId_kelasId_mapelId_key" ON "PenugasanGuru"("guruId", "kelasId", "mapelId");

-- CreateIndex
CREATE UNIQUE INDEX "Kelas_sekolahId_tahunAjaranId_nama_key" ON "Kelas"("sekolahId", "tahunAjaranId", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "BobotKomponen_mapelId_komponen_key" ON "BobotKomponen"("mapelId", "komponen");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_nisn_key" ON "Siswa"("nisn");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_akunId_key" ON "Siswa"("akunId");

-- CreateIndex
CREATE UNIQUE INDEX "WaliSiswa_siswaId_penggunaId_key" ON "WaliSiswa"("siswaId", "penggunaId");

-- CreateIndex
CREATE UNIQUE INDEX "Absensi_siswaId_tanggal_key" ON "Absensi"("siswaId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "Nilai_siswaId_kelasId_mapelId_komponen_judul_key" ON "Nilai"("siswaId", "kelasId", "mapelId", "komponen", "judul");

-- CreateIndex
CREATE UNIQUE INDEX "Bab_mapelId_nama_key" ON "Bab"("mapelId", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "PengumpulanTugas_tugasId_siswaId_key" ON "PengumpulanTugas"("tugasId", "siswaId");

-- CreateIndex
CREATE UNIQUE INDEX "UjianKelas_ujianId_kelasId_key" ON "UjianKelas"("ujianId", "kelasId");

-- CreateIndex
CREATE UNIQUE INDEX "UjianSoal_ujianId_soalId_key" ON "UjianSoal"("ujianId", "soalId");

-- CreateIndex
CREATE UNIQUE INDEX "UjianPengerjaan_ujianId_siswaId_key" ON "UjianPengerjaan"("ujianId", "siswaId");

-- CreateIndex
CREATE UNIQUE INDEX "UjianJawaban_pengerjaanId_soalId_key" ON "UjianJawaban"("pengerjaanId", "soalId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentPDP_penggunaId_key" ON "ConsentPDP"("penggunaId");

-- CreateIndex
CREATE INDEX "JadwalEntry_kelasId_hari_idx" ON "JadwalEntry"("kelasId", "hari");

-- CreateIndex
CREATE INDEX "JadwalEntry_guruId_hari_tahunAjaranId_idx" ON "JadwalEntry"("guruId", "hari", "tahunAjaranId");

-- CreateIndex
CREATE UNIQUE INDEX "PresensiGuru_jadwalEntryId_tanggal_key" ON "PresensiGuru"("jadwalEntryId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "RPPCapaian_rppId_capaianId_key" ON "RPPCapaian"("rppId", "capaianId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjekPenilaian_projekId_siswaId_dimensi_key" ON "ProjekPenilaian"("projekId", "siswaId", "dimensi");

-- CreateIndex
CREATE UNIQUE INDEX "Langganan_sekolahId_key" ON "Langganan"("sekolahId");

-- CreateIndex
CREATE UNIQUE INDEX "PembayaranLangganan_langgananId_periode_key" ON "PembayaranLangganan"("langgananId", "periode");

-- CreateIndex
CREATE INDEX "Notifikasi_penggunaId_dibacaPada_idx" ON "Notifikasi"("penggunaId", "dibacaPada");

-- CreateIndex
CREATE UNIQUE INDEX "Notifikasi_penggunaId_tipe_entitasKey_key" ON "Notifikasi"("penggunaId", "tipe", "entitasKey");

-- AddForeignKey
ALTER TABLE "Sekolah" ADD CONSTRAINT "Sekolah_kurikulumId_fkey" FOREIGN KEY ("kurikulumId") REFERENCES "Kurikulum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengguna" ADD CONSTRAINT "Pengguna_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenggunaPeran" ADD CONSTRAINT "PenggunaPeran_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenggunaPeran" ADD CONSTRAINT "PenggunaPeran_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruProfil" ADD CONSTRAINT "GuruProfil_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenugasanGuru" ADD CONSTRAINT "PenugasanGuru_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "GuruProfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenugasanGuru" ADD CONSTRAINT "PenugasanGuru_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenugasanGuru" ADD CONSTRAINT "PenugasanGuru_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TahunAjaran" ADD CONSTRAINT "TahunAjaran_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_waliKelasId_fkey" FOREIGN KEY ("waliKelasId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MataPelajaran" ADD CONSTRAINT "MataPelajaran_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kurikulum" ADD CONSTRAINT "Kurikulum_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KurikulumMapel" ADD CONSTRAINT "KurikulumMapel_kurikulumId_fkey" FOREIGN KEY ("kurikulumId") REFERENCES "Kurikulum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobotKomponen" ADD CONSTRAINT "BobotKomponen_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_akunId_fkey" FOREIGN KEY ("akunId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaliSiswa" ADD CONSTRAINT "WaliSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaliSiswa" ADD CONSTRAINT "WaliSiswa_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriBelajar" ADD CONSTRAINT "MateriBelajar_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriBelajar" ADD CONSTRAINT "MateriBelajar_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriBelajar" ADD CONSTRAINT "MateriBelajar_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriBelajar" ADD CONSTRAINT "MateriBelajar_babId_fkey" FOREIGN KEY ("babId") REFERENCES "Bab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriBelajar" ADD CONSTRAINT "MateriBelajar_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bab" ADD CONSTRAINT "Bab_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bab" ADD CONSTRAINT "Bab_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tugas" ADD CONSTRAINT "Tugas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tugas" ADD CONSTRAINT "Tugas_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tugas" ADD CONSTRAINT "Tugas_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tugas" ADD CONSTRAINT "Tugas_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengumpulanTugas" ADD CONSTRAINT "PengumpulanTugas_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "Tugas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengumpulanTugas" ADD CONSTRAINT "PengumpulanTugas_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagihanTipe" ADD CONSTRAINT "TagihanTipe_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagihan" ADD CONSTRAINT "Tagihan_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagihan" ADD CONSTRAINT "Tagihan_tipeId_fkey" FOREIGN KEY ("tipeId") REFERENCES "TagihanTipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagihan" ADD CONSTRAINT "Tagihan_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesan" ADD CONSTRAINT "Pesan_pengirimId_fkey" FOREIGN KEY ("pengirimId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesan" ADD CONSTRAINT "Pesan_penerimaId_fkey" FOREIGN KEY ("penerimaId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesan" ADD CONSTRAINT "Pesan_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Pesan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PengumumanSekolah" ADD CONSTRAINT "PengumumanSekolah_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengumumanSekolah" ADD CONSTRAINT "PengumumanSekolah_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soal" ADD CONSTRAINT "Soal_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soal" ADD CONSTRAINT "Soal_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soal" ADD CONSTRAINT "Soal_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ujian" ADD CONSTRAINT "Ujian_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ujian" ADD CONSTRAINT "Ujian_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ujian" ADD CONSTRAINT "Ujian_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ujian" ADD CONSTRAINT "Ujian_babId_fkey" FOREIGN KEY ("babId") REFERENCES "Bab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianKelas" ADD CONSTRAINT "UjianKelas_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianKelas" ADD CONSTRAINT "UjianKelas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianSoal" ADD CONSTRAINT "UjianSoal_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianSoal" ADD CONSTRAINT "UjianSoal_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "Soal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianPengerjaan" ADD CONSTRAINT "UjianPengerjaan_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianPengerjaan" ADD CONSTRAINT "UjianPengerjaan_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianJawaban" ADD CONSTRAINT "UjianJawaban_pengerjaanId_fkey" FOREIGN KEY ("pengerjaanId") REFERENCES "UjianPengerjaan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianJawaban" ADD CONSTRAINT "UjianJawaban_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "Soal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UjianJawaban" ADD CONSTRAINT "UjianJawaban_dinilaiOlehId_fkey" FOREIGN KEY ("dinilaiOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeScale" ADD CONSTRAINT "GradeScale_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanIzin" ADD CONSTRAINT "PengajuanIzin_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanIzin" ADD CONSTRAINT "PengajuanIzin_diajukanOlehId_fkey" FOREIGN KEY ("diajukanOlehId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanIzin" ADD CONSTRAINT "PengajuanIzin_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentPDP" ADD CONSTRAINT "ConsentPDP_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanSupervisi" ADD CONSTRAINT "CatatanSupervisi_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanSupervisi" ADD CONSTRAINT "CatatanSupervisi_kepsekId_fkey" FOREIGN KEY ("kepsekId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPDBPendaftar" ADD CONSTRAINT "PPDBPendaftar_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaAkademik" ADD CONSTRAINT "AgendaAkademik_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanSiswa" ADD CONSTRAINT "CatatanSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanSiswa" ADD CONSTRAINT "CatatanSiswa_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestasiSiswa" ADD CONSTRAINT "PrestasiSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestasiSiswa" ADD CONSTRAINT "PrestasiSiswa_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalEntry" ADD CONSTRAINT "JadwalEntry_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalEntry" ADD CONSTRAINT "JadwalEntry_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalEntry" ADD CONSTRAINT "JadwalEntry_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "GuruProfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalEntry" ADD CONSTRAINT "JadwalEntry_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresensiGuru" ADD CONSTRAINT "PresensiGuru_jadwalEntryId_fkey" FOREIGN KEY ("jadwalEntryId") REFERENCES "JadwalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaianPembelajaran" ADD CONSTRAINT "CapaianPembelajaran_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaianPembelajaran" ADD CONSTRAINT "CapaianPembelajaran_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPP" ADD CONSTRAINT "RPP_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPP" ADD CONSTRAINT "RPP_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPP" ADD CONSTRAINT "RPP_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPP" ADD CONSTRAINT "RPP_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPPCapaian" ADD CONSTRAINT "RPPCapaian_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPPCapaian" ADD CONSTRAINT "RPPCapaian_capaianId_fkey" FOREIGN KEY ("capaianId") REFERENCES "CapaianPembelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomentarKonten" ADD CONSTRAINT "KomentarKonten_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomentarKonten" ADD CONSTRAINT "KomentarKonten_materiId_fkey" FOREIGN KEY ("materiId") REFERENCES "MateriBelajar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomentarKonten" ADD CONSTRAINT "KomentarKonten_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "Tugas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KomentarKonten" ADD CONSTRAINT "KomentarKonten_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KomentarKonten"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TanyaJawabKelas" ADD CONSTRAINT "TanyaJawabKelas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TanyaJawabKelas" ADD CONSTRAINT "TanyaJawabKelas_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TanyaJawabKelas" ADD CONSTRAINT "TanyaJawabKelas_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TanyaJawabKelas" ADD CONSTRAINT "TanyaJawabKelas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TanyaJawabKelas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CatatanAsesmen" ADD CONSTRAINT "CatatanAsesmen_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanAsesmen" ADD CONSTRAINT "CatatanAsesmen_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanAsesmen" ADD CONSTRAINT "CatatanAsesmen_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projek" ADD CONSTRAINT "Projek_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projek" ADD CONSTRAINT "Projek_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projek" ADD CONSTRAINT "Projek_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjekPenilaian" ADD CONSTRAINT "ProjekPenilaian_projekId_fkey" FOREIGN KEY ("projekId") REFERENCES "Projek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjekPenilaian" ADD CONSTRAINT "ProjekPenilaian_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Langganan" ADD CONSTRAINT "Langganan_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PembayaranLangganan" ADD CONSTRAINT "PembayaranLangganan_langgananId_fkey" FOREIGN KEY ("langgananId") REFERENCES "Langganan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
