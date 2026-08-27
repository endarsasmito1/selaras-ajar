import Database from "better-sqlite3";
import path from "path";

// Test suite butuh akses DB langsung — data seed pakai cuid yang berubah tiap reseed, jadi test
// perlu query ID nyata (kelas/mapel/siswa/dst) alih-alih hardcode, sekaligus dipakai utk assert
// state di DB (bukan cuma isi halaman) pada beberapa test negatif/positif yang butuh kepastian.
//
// Pakai better-sqlite3 langsung (bukan Prisma Client) karena Prisma-generated client ini pakai
// `import.meta` (ESM-only) yang tak bisa di-require lewat transform CJS milik Playwright test
// runner — raw SQL di sini cukup utk kebutuhan lookup/assert test, tak perlu ORM penuh.
const sqlite = new Database(path.resolve(__dirname, "../../../dev.db"), { readonly: false });

export const db = {
  bab: {
    /** 1.23 — cari Bab existing utk suatu mapel (dipakai test yang perlu isi form ujian/materi). */
    findFirst(where: { mapelId: string }) {
      return sqlite.prepare("SELECT * FROM Bab WHERE mapelId = ? ORDER BY createdAt DESC LIMIT 1").get(where.mapelId) as Record<string, unknown> | undefined;
    },
    /** Hitung berapa row Bab dgn nama tsb di SATU mapel — dipakai assert dedupe/reuse tak duplikat. */
    countByNamaMapel(where: { mapelId: string; nama: string }) {
      return (sqlite.prepare("SELECT COUNT(*) as c FROM Bab WHERE mapelId = ? AND nama = ?").get(where.mapelId, where.nama) as { c: number }).c;
    },
  },
  soal: {
    findFirst(where: { mapelId?: string; jenis?: string } = {}) {
      const clauses: string[] = [];
      const params: Record<string, string> = {};
      if (where.mapelId) { clauses.push("mapelId = @mapelId"); params.mapelId = where.mapelId; }
      if (where.jenis) { clauses.push("jenis = @jenis"); params.jenis = where.jenis; }
      const sql = `SELECT * FROM Soal ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} ORDER BY createdAt DESC LIMIT 1`;
      return sqlite.prepare(sql).get(params) as Record<string, unknown> | undefined;
    },
  },
  siswa: {
    findFirst(where: { nisn?: string; kelasId?: string }) {
      if (where.kelasId) {
        return sqlite.prepare("SELECT * FROM Siswa WHERE kelasId = ? AND aktif = 1 LIMIT 1").get(where.kelasId) as Record<string, unknown> | undefined;
      }
      return sqlite.prepare("SELECT * FROM Siswa WHERE nisn = ?").get(where.nisn) as Record<string, unknown> | undefined;
    },
    findFirstTanpaWali(where: { sekolahId: string }) {
      return sqlite
        .prepare(
          `SELECT * FROM Siswa WHERE sekolahId = ? AND aktif = 1 AND id NOT IN (SELECT siswaId FROM WaliSiswa) LIMIT 1`
        )
        .get(where.sekolahId) as Record<string, unknown> | undefined;
    },
  },
  ujian: {
    count() {
      return (sqlite.prepare("SELECT COUNT(*) as c FROM Ujian").get() as { c: number }).c;
    },
    findUnique(where: { id: string }) {
      return sqlite.prepare("SELECT * FROM Ujian WHERE id = ?").get(where.id) as Record<string, unknown> | undefined;
    },
    findByJudul(judul: string) {
      return sqlite.prepare("SELECT * FROM Ujian WHERE judul = ? ORDER BY createdAt DESC LIMIT 1").get(judul) as Record<string, unknown> | undefined;
    },
    /** 1.23 — set modeHasil/jadwalHasilManual langsung (skip nunggu real-time di test reveal-hasil). */
    setModeHasil(id: string, modeHasil: string, jadwalHasilManualIso: string | null) {
      sqlite.prepare("UPDATE Ujian SET modeHasil = ?, jadwalHasilManual = ? WHERE id = ?").run(modeHasil, jadwalHasilManualIso, id);
    },
    findFirst() {
      return sqlite.prepare("SELECT * FROM Ujian LIMIT 1").get() as Record<string, unknown> | undefined;
    },
    /** Cari 1 ujian yang statusnya cocok & terkait ke kelasId tertentu (via tabel UjianKelas). */
    findByKelasAndStatus(kelasId: string, status: "DRAFT" | "PUBLISHED") {
      return sqlite
        .prepare(
          `SELECT u.* FROM Ujian u JOIN UjianKelas uk ON uk.ujianId = u.id WHERE uk.kelasId = ? AND u.status = ? LIMIT 1`
        )
        .get(kelasId, status) as Record<string, unknown> | undefined;
    },
    /** Ujian PUBLISHED di kelasId tertentu yang BELUM punya baris UjianPengerjaan utk siswaId. */
    findUnstartedForSiswa(kelasId: string, siswaId: string) {
      return sqlite
        .prepare(
          `SELECT u.* FROM Ujian u
           JOIN UjianKelas uk ON uk.ujianId = u.id
           WHERE uk.kelasId = ? AND u.status = 'PUBLISHED'
             AND u.id NOT IN (SELECT ujianId FROM UjianPengerjaan WHERE siswaId = ?)
           LIMIT 1`
        )
        .get(kelasId, siswaId) as Record<string, unknown> | undefined;
    },
    /** Ujian PUBLISHED yang TIDAK terkait ke kelasId tertentu — utk uji akses lintas kelas. */
    findPublishedNotInKelas(kelasId: string) {
      return sqlite
        .prepare(
          `SELECT * FROM Ujian WHERE status = 'PUBLISHED' AND id NOT IN
           (SELECT ujianId FROM UjianKelas WHERE kelasId = ?) LIMIT 1`
        )
        .get(kelasId) as Record<string, unknown> | undefined;
    },
    findWithPendingKoreksi() {
      return sqlite
        .prepare(
          `SELECT u.* FROM Ujian u
           JOIN UjianPengerjaan p ON p.ujianId = u.id
           WHERE p.status = 'SELESAI' AND p.koreksiDikonfirmasi = 0
           LIMIT 1`
        )
        .get() as Record<string, unknown> | undefined;
    },
  },
  ujianPengerjaan: {
    /** 1.10 — cari 1 pengerjaan SELESAI beserta guru/kelas/mapel-nya, dipakai utk uji sinkronisasi nilai. */
    findSelesaiDenganGuru() {
      return sqlite
        .prepare(
          `SELECT p.id as pengerjaanId, p.ujianId, p.siswaId, p.nilaiTotal, u.judul, u.mapelId, s.nama as siswaNama
           FROM UjianPengerjaan p JOIN Ujian u ON u.id = p.ujianId JOIN Siswa s ON s.id = p.siswaId
           WHERE p.status = 'SELESAI' AND u.dibuatOlehId = (SELECT id FROM Pengguna WHERE email = 'rina@selarasajar.demo')
           LIMIT 1`
        )
        .get() as Record<string, unknown> | undefined;
    },
    findById(id: string) {
      return sqlite.prepare("SELECT * FROM UjianPengerjaan WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    },
    findByUjianAndSiswa(ujianId: string, siswaId: string) {
      return sqlite.prepare("SELECT * FROM UjianPengerjaan WHERE ujianId = ? AND siswaId = ?").get(ujianId, siswaId) as Record<string, unknown> | undefined;
    },
  },
  ujianKelas: {
    findKelasIdByUjian(ujianId: string) {
      return (sqlite.prepare("SELECT kelasId FROM UjianKelas WHERE ujianId = ? LIMIT 1").get(ujianId) as { kelasId: string } | undefined)?.kelasId;
    },
  },
  ujianSoal: {
    create(data: { ujianId: string; soalId: string; urutan: number; poin: number }) {
      sqlite
        .prepare(`INSERT INTO UjianSoal (id, ujianId, soalId, urutan, poin) VALUES (@id, @ujianId, @soalId, @urutan, @poin)`)
        .run({ id: `test_${Date.now()}_${Math.random().toString(36).slice(2)}`, ...data });
    },
  },
  // ---- Ditambahkan (1.20) utk test skenario baru: multi-role, pengumuman, kurikulum, peta sekolah, KKM UTS/UAS ----
  pengguna: {
    findFirst(where: { email?: string; nama?: string; sekolahId?: string; peran?: string } = {}) {
      const clauses: string[] = [];
      const params: Record<string, string> = {};
      if (where.email) { clauses.push("email = @email"); params.email = where.email; }
      if (where.nama) { clauses.push("nama LIKE @nama"); params.nama = `%${where.nama}%`; }
      if (where.sekolahId) { clauses.push("sekolahId = @sekolahId"); params.sekolahId = where.sekolahId; }
      if (where.peran) { clauses.push("peran = @peran"); params.peran = where.peran; }
      const sql = `SELECT * FROM Pengguna ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} LIMIT 1`;
      return sqlite.prepare(sql).get(params) as Record<string, unknown> | undefined;
    },
  },
  penggunaPeran: {
    findMany(where: { penggunaId: string }) {
      return sqlite.prepare("SELECT * FROM PenggunaPeran WHERE penggunaId = ?").all(where.penggunaId) as Record<string, unknown>[];
    },
  },
  pengumumanSekolah: {
    count(where: { sekolahId: string }) {
      return (sqlite.prepare("SELECT COUNT(*) as c FROM PengumumanSekolah WHERE sekolahId = ?").get(where.sekolahId) as { c: number }).c;
    },
  },
  kurikulum: {
    findFirst(where: { jenjang: string }) {
      return sqlite.prepare("SELECT * FROM Kurikulum WHERE jenjang = ? LIMIT 1").get(where.jenjang) as Record<string, unknown> | undefined;
    },
  },
  sekolah: {
    findFirst(where: { npsn?: string; nama?: string } = {}) {
      const clauses: string[] = [];
      const params: Record<string, string> = {};
      if (where.npsn) { clauses.push("npsn = @npsn"); params.npsn = where.npsn; }
      if (where.nama) { clauses.push("nama LIKE @nama"); params.nama = `%${where.nama}%`; }
      const sql = `SELECT * FROM Sekolah ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} LIMIT 1`;
      return sqlite.prepare(sql).get(params) as Record<string, unknown> | undefined;
    },
  },
  mataPelajaran: {
    findFirst(where: { nama?: string; sekolahId?: string } = {}) {
      const clauses: string[] = [];
      const params: Record<string, string> = {};
      if (where.nama) { clauses.push("nama = @nama"); params.nama = where.nama; }
      if (where.sekolahId) { clauses.push("sekolahId = @sekolahId"); params.sekolahId = where.sekolahId; }
      const sql = `SELECT * FROM MataPelajaran ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} LIMIT 1`;
      return sqlite.prepare(sql).get(params) as Record<string, unknown> | undefined;
    },
  },
  kelas: {
    findUnique(where: { id: string }) {
      return sqlite.prepare("SELECT * FROM Kelas WHERE id = ?").get(where.id) as Record<string, unknown> | undefined;
    },
    findFirst(where: { nama?: string; sekolahId?: string } = {}) {
      const clauses: string[] = [];
      const params: Record<string, string> = {};
      if (where.nama) { clauses.push("nama = @nama"); params.nama = where.nama; }
      if (where.sekolahId) { clauses.push("sekolahId = @sekolahId"); params.sekolahId = where.sekolahId; }
      const sql = `SELECT * FROM Kelas ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} LIMIT 1`;
      return sqlite.prepare(sql).get(params) as Record<string, unknown> | undefined;
    },
  },
  absensi: {
    /** Cari 1 tanggal (YYYY-MM-DD) yg baris absensinya di kelas itu punya >=2 status berbeda —
     * dipakai test riwayat absensi supaya tak menebak "kemarin" (bisa kebetulan weekend/tak ada data). */
    findTanggalDenganStatusBeragam(kelasId: string) {
      const row = sqlite
        .prepare(
          `SELECT substr(tanggal, 1, 10) as tgl, COUNT(DISTINCT status) as jumlahStatus
           FROM Absensi WHERE kelasId = ? GROUP BY tgl HAVING jumlahStatus >= 2 ORDER BY tgl DESC LIMIT 1`
        )
        .get(kelasId) as { tgl: string; jumlahStatus: number } | undefined;
      return row?.tgl;
    },
  },
  waliSiswa: {
    /** 1.23 — cari 1 wali (dgn akun login) utk siswa tsb, dipakai test yg perlu diajukanOlehId valid. */
    findFirst(where: { siswaId: string }) {
      return sqlite.prepare("SELECT * FROM WaliSiswa WHERE siswaId = ? LIMIT 1").get(where.siswaId) as Record<string, unknown> | undefined;
    },
  },
  pengajuanIzin: {
    /** 1.23 — insert PengajuanIzin MENUNGGU langsung, dipakai test indikator izin-pending di absensi. */
    createMenunggu(data: { siswaId: string; diajukanOlehId: string; tanggalIso: string; jenis: "SAKIT" | "IZIN"; keterangan: string }) {
      const id = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sqlite
        .prepare(
          `INSERT INTO PengajuanIzin (id, siswaId, diajukanOlehId, tanggal, jenis, keterangan, status)
           VALUES (@id, @siswaId, @diajukanOlehId, @tanggalIso, @jenis, @keterangan, 'MENUNGGU')`
        )
        .run({ id, ...data });
      return id;
    },
    findById(id: string) {
      return sqlite.prepare("SELECT * FROM PengajuanIzin WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    },
  },
  penugasanGuru: {
    /** Cari guru (dgn akun login) yg mengajar mapel yg sama di >=2 kelas — dipakai utk uji "duplikat ujian ke kelas lain". */
    findGuruMultiKelasSamaMapel(sekolahId: string) {
      const rows = sqlite
        .prepare(
          `SELECT pg.guruId, pg.mapelId, p.email, p.id as penggunaId, GROUP_CONCAT(pg.kelasId) as kelasIds, COUNT(*) as jumlahKelas
           FROM PenugasanGuru pg
           JOIN GuruProfil gp ON gp.id = pg.guruId
           JOIN Pengguna p ON p.id = gp.penggunaId
           JOIN Kelas k ON k.id = pg.kelasId
           WHERE k.sekolahId = ?
           GROUP BY pg.guruId, pg.mapelId
           HAVING jumlahKelas >= 2
           LIMIT 1`
        )
        .get(sekolahId) as { guruId: string; mapelId: string; email: string; penggunaId: string; kelasIds: string; jumlahKelas: number } | undefined;
      if (!rows) return undefined;
      return { ...rows, kelasIds: rows.kelasIds.split(",") };
    },
  },
  tanyaJawabKelas: {
    /** 1.23 — insert langsung (dipakai test cascade-delete: bikin parent+balasan tanpa lewat UI). */
    create(data: { kelasId: string; mapelId: string; penggunaId: string; isi: string; anonim?: boolean; parentId?: string | null }) {
      const id = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sqlite
        .prepare(
          `INSERT INTO TanyaJawabKelas (id, kelasId, mapelId, penggunaId, anonim, isi, parentId)
           VALUES (@id, @kelasId, @mapelId, @penggunaId, @anonim, @isi, @parentId)`
        )
        .run({
          id,
          kelasId: data.kelasId,
          mapelId: data.mapelId,
          penggunaId: data.penggunaId,
          anonim: data.anonim ? 1 : 0,
          isi: data.isi,
          parentId: data.parentId ?? null,
        });
      return id;
    },
    findById(id: string) {
      return sqlite.prepare("SELECT * FROM TanyaJawabKelas WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    },
    countByParent(parentId: string) {
      return (sqlite.prepare("SELECT COUNT(*) as c FROM TanyaJawabKelas WHERE parentId = ?").get(parentId) as { c: number }).c;
    },
  },
  tagihanTipe: {
    count(where: { sekolahId: string; nama?: string }) {
      const clauses = ["sekolahId = @sekolahId"];
      const params: Record<string, string> = { sekolahId: where.sekolahId };
      if (where.nama) { clauses.push("nama = @nama"); params.nama = where.nama; }
      return (sqlite.prepare(`SELECT COUNT(*) as c FROM TagihanTipe WHERE ${clauses.join(" AND ")}`).get(params) as { c: number }).c;
    },
    findFirst(where: { sekolahId: string; nama: string }) {
      return sqlite.prepare("SELECT * FROM TagihanTipe WHERE sekolahId = ? AND nama = ? LIMIT 1").get(where.sekolahId, where.nama) as Record<string, unknown> | undefined;
    },
  },
  tagihan: {
    count(where: { tipeId: string }) {
      return (sqlite.prepare("SELECT COUNT(*) as c FROM Tagihan WHERE tipeId = ?").get(where.tipeId) as { c: number }).c;
    },
  },
};
