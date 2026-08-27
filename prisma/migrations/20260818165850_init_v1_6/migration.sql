-- CreateTable
CREATE TABLE "Sekolah" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "jenjang" TEXT NOT NULL,
    "satuanPeriode" TEXT NOT NULL DEFAULT 'BULANAN',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Pengguna" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "peran" TEXT NOT NULL,
    "telepon" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pengguna_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuruProfil" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "penggunaId" TEXT NOT NULL,
    "nip" TEXT,
    "mapelUtama" TEXT,
    CONSTRAINT "GuruProfil_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PenugasanGuru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guruId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    CONSTRAINT "PenugasanGuru_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "GuruProfil" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PenugasanGuru_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PenugasanGuru_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TahunAjaran" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "mulai" DATETIME NOT NULL,
    "selesai" DATETIME NOT NULL,
    CONSTRAINT "TahunAjaran_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kelas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tingkat" INTEGER NOT NULL,
    "waliKelasId" TEXT,
    CONSTRAINT "Kelas_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Kelas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Kelas_waliKelasId_fkey" FOREIGN KEY ("waliKelasId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MataPelajaran" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kkm" INTEGER NOT NULL DEFAULT 70,
    CONSTRAINT "MataPelajaran_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BobotKomponen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mapelId" TEXT NOT NULL,
    "komponen" TEXT NOT NULL,
    "persentase" INTEGER NOT NULL,
    CONSTRAINT "BobotKomponen_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Siswa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "nisn" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggalLahir" DATETIME,
    "alamat" TEXT,
    "jenisKelamin" TEXT NOT NULL,
    "akunId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Siswa_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Siswa_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Siswa_akunId_fkey" FOREIGN KEY ("akunId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WaliSiswa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "hubungan" TEXT NOT NULL,
    CONSTRAINT "WaliSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WaliSiswa_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Absensi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Absensi_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Absensi_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Nilai" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "komponen" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "skor" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Nilai_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Nilai_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Nilai_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MateriBelajar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "bab" TEXT,
    "rppId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MateriBelajar_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MateriBelajar_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MateriBelajar_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MateriBelajar_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tugas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "instruksi" TEXT NOT NULL,
    "lampiranUrl" TEXT,
    "tautanUrl" TEXT,
    "rppId" TEXT,
    "tenggat" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tugas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tugas_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tugas_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tugas_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PengumpulanTugas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tugasId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "isiJawaban" TEXT,
    "lampiranUrl" TEXT,
    "tautanUrl" TEXT,
    "terlambat" BOOLEAN NOT NULL DEFAULT false,
    "nilai" REAL,
    "catatanGuru" TEXT,
    "submitAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PengumpulanTugas_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "Tugas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengumpulanTugas_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TagihanTipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    CONSTRAINT "TagihanTipe_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tagihan" (
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
    CONSTRAINT "Tagihan_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tagihan_tipeId_fkey" FOREIGN KEY ("tipeId") REFERENCES "TagihanTipe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pesan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pengirimId" TEXT NOT NULL,
    "penerimaId" TEXT,
    "kelasIdTarget" TEXT,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pesan_pengirimId_fkey" FOREIGN KEY ("pengirimId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pesan_penerimaId_fkey" FOREIGN KEY ("penerimaId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pesan_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Pesan" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "Soal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "opsi" TEXT,
    "kunciJawaban" TEXT,
    "topik" TEXT,
    "tingkatKesulitan" TEXT,
    "poinDefault" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Soal_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soal_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soal_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ujian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mapelId" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'UJIAN',
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

-- CreateTable
CREATE TABLE "UjianKelas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ujianId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "jamMulai" DATETIME,
    "jamSelesai" DATETIME,
    CONSTRAINT "UjianKelas_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianKelas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UjianSoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ujianId" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "poin" INTEGER NOT NULL,
    CONSTRAINT "UjianSoal_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianSoal_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "Soal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UjianPengerjaan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ujianId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BELUM_MULAI',
    "soalUrutan" TEXT NOT NULL,
    "waktuMulai" DATETIME,
    "waktuSelesai" DATETIME,
    "nilaiTotal" REAL,
    "komentarGuru" TEXT,
    "koreksiDikonfirmasi" BOOLEAN NOT NULL DEFAULT false,
    "dikonfirmasiPada" DATETIME,
    CONSTRAINT "UjianPengerjaan_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianPengerjaan_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UjianJawaban" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pengerjaanId" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "opsiUrutan" TEXT,
    "jawabanPG" INTEGER,
    "jawabanTeks" TEXT,
    "benar" BOOLEAN,
    "skor" REAL,
    "dinilaiOlehId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UjianJawaban_pengerjaanId_fkey" FOREIGN KEY ("pengerjaanId") REFERENCES "UjianPengerjaan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianJawaban_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "Soal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UjianJawaban_dinilaiOlehId_fkey" FOREIGN KEY ("dinilaiOlehId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeScale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "minSkor" INTEGER NOT NULL,
    "maxSkor" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GradeScale_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PengajuanIzin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "diajukanOlehId" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "jenis" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU',
    "disetujuiOlehId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PengajuanIzin_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengajuanIzin_diajukanOlehId_fkey" FOREIGN KEY ("diajukanOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengajuanIzin_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "Pengguna" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentPDP" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "penggunaId" TEXT NOT NULL,
    "disetujui" BOOLEAN NOT NULL DEFAULT false,
    "waktuPersetujuan" DATETIME,
    "versiKebijakan" TEXT NOT NULL DEFAULT '1.0',
    CONSTRAINT "ConsentPDP_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatatanSupervisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guruId" TEXT NOT NULL,
    "kepsekId" TEXT NOT NULL,
    "catatan" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatatanSupervisi_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatatanSupervisi_kepsekId_fkey" FOREIGN KEY ("kepsekId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PPDBPendaftar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "namaCalon" TEXT NOT NULL,
    "jenjangDaftar" TEXT NOT NULL,
    "namaOrtu" TEXT NOT NULL,
    "kontak" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BARU',
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PPDBPendaftar_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgendaAkademik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "jenis" TEXT NOT NULL,
    "keterangan" TEXT,
    CONSTRAINT "AgendaAkademik_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatatanSiswa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "mapelKonteks" TEXT,
    "isi" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatatanSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatatanSiswa_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrestasiSiswa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "keterangan" TEXT,
    "tanggal" DATETIME NOT NULL,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrestasiSiswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrestasiSiswa_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JadwalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "hari" INTEGER NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JadwalEntry_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JadwalEntry_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JadwalEntry_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "GuruProfil" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JadwalEntry_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PresensiGuru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jadwalEntryId" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "hadir" BOOLEAN NOT NULL,
    "sumber" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresensiGuru_jadwalEntryId_fkey" FOREIGN KEY ("jadwalEntryId") REFERENCES "JadwalEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CapaianPembelajaran" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "kode" TEXT,
    "deskripsi" TEXT NOT NULL,
    "tingkat" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CapaianPembelajaran_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CapaianPembelajaran_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RPP" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "penggunaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "lampiranUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RPP_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RPP_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RPP_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RPP_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RPPCapaian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rppId" TEXT NOT NULL,
    "capaianId" TEXT NOT NULL,
    CONSTRAINT "RPPCapaian_rppId_fkey" FOREIGN KEY ("rppId") REFERENCES "RPP" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RPPCapaian_capaianId_fkey" FOREIGN KEY ("capaianId") REFERENCES "CapaianPembelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KomentarKonten" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "penggunaId" TEXT NOT NULL,
    "materiId" TEXT,
    "tugasId" TEXT,
    "isi" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KomentarKonten_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KomentarKonten_materiId_fkey" FOREIGN KEY ("materiId") REFERENCES "MateriBelajar" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KomentarKonten_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "Tugas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KomentarKonten_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KomentarKonten" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "CatatanAsesmen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatatanAsesmen_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatatanAsesmen_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatatanAsesmen_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Projek" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolahId" TEXT NOT NULL,
    "tahunAjaranId" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "dimensiP5" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Projek_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Projek_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Projek_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "Pengguna" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjekPenilaian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projekId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "dimensi" TEXT NOT NULL,
    "capaian" TEXT NOT NULL,
    "catatan" TEXT,
    CONSTRAINT "ProjekPenilaian_projekId_fkey" FOREIGN KEY ("projekId") REFERENCES "Projek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjekPenilaian_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_email_key" ON "Pengguna"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GuruProfil_penggunaId_key" ON "GuruProfil"("penggunaId");

-- CreateIndex
CREATE UNIQUE INDEX "PenugasanGuru_guruId_kelasId_mapelId_key" ON "PenugasanGuru"("guruId", "kelasId", "mapelId");

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
