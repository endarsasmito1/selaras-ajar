import "dotenv/config"; // node biasa gak auto-load .env spt Next.js/Prisma CLI — worker process Playwright terpisah dari proses globalSetup
import pg from "pg";

// Test suite butuh akses DB langsung — data seed pakai cuid yang berubah tiap reseed, jadi test
// perlu query ID nyata (kelas/mapel/siswa/dst) alih-alih hardcode, sekaligus dipakai utk assert
// state di DB (bukan cuma isi halaman) pada beberapa test negatif/positif yang butuh kepastian.
//
// Pakai `pg` langsung (bukan Prisma Client) karena Prisma-generated client ini pakai
// `import.meta` (ESM-only) yang tak bisa di-require lewat transform CJS milik Playwright test
// runner — raw SQL di sini cukup utk kebutuhan lookup/assert test, tak perlu ORM penuh.
//
// Migrasi PostgreSQL (Sep 2026) — sebelumnya `better-sqlite3` sinkron, sekarang `pg` (async).
// SEMUA method di bawah jadi Promise — pemanggil WAJIB `await`. Identifier tabel/kolom WAJIB
// diapit tanda kutip ganda (mis. "Bab", "mapelId") karena Postgres men-lowercase identifier
// tanpa kutip secara default, sementara Prisma bikin tabel dgn nama PascalCase asli dari skema
// (unquoted "FROM Bab" akan dicari sebagai tabel "bab" yang tidak ada). Boolean juga native
// true/false di Postgres, bukan lagi integer 0/1 seperti SQLite.
//
// WAJIB baca dari process.env.DATABASE_URL — persis bug yang sama kayak prisma/seed.ts
// sebelumnya: hardcode diam-diam nunjuk ke DB yang salah/gak dimigrasi di CI vs lokal.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL tidak di-set — cek .env (connection string PostgreSQL/Supabase)");
}
const pool = new pg.Pool({ connectionString: databaseUrl });

function testId() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const db = {
  bab: {
    /** 1.23 — cari Bab existing utk suatu mapel (dipakai test yang perlu isi form ujian/materi). */
    async findFirst(where: { mapelId: string }) {
      const { rows } = await pool.query(
        `SELECT * FROM "Bab" WHERE "mapelId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        [where.mapelId],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
    /** Hitung berapa row Bab dgn nama tsb di SATU mapel — dipakai assert dedupe/reuse tak duplikat. */
    async countByNamaMapel(where: { mapelId: string; nama: string }) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int as c FROM "Bab" WHERE "mapelId" = $1 AND "nama" = $2`,
        [where.mapelId, where.nama],
      );
      return (rows[0] as { c: number }).c;
    },
  },
  soal: {
    async findFirst(where: { mapelId?: string; jenis?: string } = {}) {
      const clauses: string[] = [];
      const params: string[] = [];
      if (where.mapelId) { params.push(where.mapelId); clauses.push(`"mapelId" = $${params.length}`); }
      if (where.jenis) { params.push(where.jenis); clauses.push(`"jenis" = $${params.length}`); }
      const sql = `SELECT * FROM "Soal" ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} ORDER BY "createdAt" DESC LIMIT 1`;
      const { rows } = await pool.query(sql, params);
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  siswa: {
    async findFirst(where: { nisn?: string; kelasId?: string }) {
      if (where.kelasId) {
        const { rows } = await pool.query(
          `SELECT * FROM "Siswa" WHERE "kelasId" = $1 AND "aktif" = true LIMIT 1`,
          [where.kelasId],
        );
        return rows[0] as Record<string, unknown> | undefined;
      }
      const { rows } = await pool.query(`SELECT * FROM "Siswa" WHERE "nisn" = $1`, [where.nisn]);
      return rows[0] as Record<string, unknown> | undefined;
    },
    async findFirstTanpaWali(where: { sekolahId: string }) {
      const { rows } = await pool.query(
        `SELECT * FROM "Siswa" WHERE "sekolahId" = $1 AND "aktif" = true
         AND "id" NOT IN (SELECT "siswaId" FROM "WaliSiswa") LIMIT 1`,
        [where.sekolahId],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  ujian: {
    async count() {
      const { rows } = await pool.query(`SELECT COUNT(*)::int as c FROM "Ujian"`);
      return (rows[0] as { c: number }).c;
    },
    async findUnique(where: { id: string }) {
      const { rows } = await pool.query(`SELECT * FROM "Ujian" WHERE "id" = $1`, [where.id]);
      return rows[0] as Record<string, unknown> | undefined;
    },
    async findByJudul(judul: string) {
      const { rows } = await pool.query(
        `SELECT * FROM "Ujian" WHERE "judul" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        [judul],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
    /** 1.23 — set modeHasil/jadwalHasilManual langsung (skip nunggu real-time di test reveal-hasil). */
    async setModeHasil(id: string, modeHasil: string, jadwalHasilManualIso: string | null) {
      await pool.query(
        `UPDATE "Ujian" SET "modeHasil" = $1, "jadwalHasilManual" = $2 WHERE "id" = $3`,
        [modeHasil, jadwalHasilManualIso, id],
      );
    },
    async findFirst() {
      const { rows } = await pool.query(`SELECT * FROM "Ujian" LIMIT 1`);
      return rows[0] as Record<string, unknown> | undefined;
    },
    /** Cari 1 ujian yang statusnya cocok & terkait ke kelasId tertentu (via tabel UjianKelas). */
    async findByKelasAndStatus(kelasId: string, status: "DRAFT" | "PUBLISHED") {
      const { rows } = await pool.query(
        `SELECT u.* FROM "Ujian" u JOIN "UjianKelas" uk ON uk."ujianId" = u."id"
         WHERE uk."kelasId" = $1 AND u."status" = $2 LIMIT 1`,
        [kelasId, status],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
    /** Ujian PUBLISHED di kelasId tertentu yang BELUM punya baris UjianPengerjaan utk siswaId. */
    async findUnstartedForSiswa(kelasId: string, siswaId: string) {
      const { rows } = await pool.query(
        `SELECT u.* FROM "Ujian" u
         JOIN "UjianKelas" uk ON uk."ujianId" = u."id"
         WHERE uk."kelasId" = $1 AND u."status" = 'PUBLISHED'
           AND u."id" NOT IN (SELECT "ujianId" FROM "UjianPengerjaan" WHERE "siswaId" = $2)
         LIMIT 1`,
        [kelasId, siswaId],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
    /** Ujian PUBLISHED yang TIDAK terkait ke kelasId tertentu — utk uji akses lintas kelas. */
    async findPublishedNotInKelas(kelasId: string) {
      const { rows } = await pool.query(
        `SELECT * FROM "Ujian" WHERE "status" = 'PUBLISHED' AND "id" NOT IN
         (SELECT "ujianId" FROM "UjianKelas" WHERE "kelasId" = $1) LIMIT 1`,
        [kelasId],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
    async findWithPendingKoreksi() {
      const { rows } = await pool.query(
        `SELECT u.* FROM "Ujian" u
         JOIN "UjianPengerjaan" p ON p."ujianId" = u."id"
         WHERE p."status" = 'SELESAI' AND p."koreksiDikonfirmasi" = false
         LIMIT 1`,
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  ujianPengerjaan: {
    /** 1.10 — cari 1 pengerjaan SELESAI beserta guru/kelas/mapel-nya, dipakai utk uji sinkronisasi nilai. */
    async findSelesaiDenganGuru() {
      const { rows } = await pool.query(
        `SELECT p."id" as "pengerjaanId", p."ujianId", p."siswaId", p."nilaiTotal", u."judul", u."mapelId", s."nama" as "siswaNama"
         FROM "UjianPengerjaan" p JOIN "Ujian" u ON u."id" = p."ujianId" JOIN "Siswa" s ON s."id" = p."siswaId"
         WHERE p."status" = 'SELESAI' AND u."dibuatOlehId" = (SELECT "id" FROM "Pengguna" WHERE "email" = 'rina@selarasajar.demo')
         LIMIT 1`,
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
    async findById(id: string) {
      const { rows } = await pool.query(`SELECT * FROM "UjianPengerjaan" WHERE "id" = $1`, [id]);
      return rows[0] as Record<string, unknown> | undefined;
    },
    async findByUjianAndSiswa(ujianId: string, siswaId: string) {
      const { rows } = await pool.query(
        `SELECT * FROM "UjianPengerjaan" WHERE "ujianId" = $1 AND "siswaId" = $2`,
        [ujianId, siswaId],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  ujianKelas: {
    async findKelasIdByUjian(ujianId: string) {
      const { rows } = await pool.query(
        `SELECT "kelasId" FROM "UjianKelas" WHERE "ujianId" = $1 LIMIT 1`,
        [ujianId],
      );
      return (rows[0] as { kelasId: string } | undefined)?.kelasId;
    },
  },
  ujianSoal: {
    async create(data: { ujianId: string; soalId: string; urutan: number; poin: number }) {
      await pool.query(
        `INSERT INTO "UjianSoal" ("id", "ujianId", "soalId", "urutan", "poin") VALUES ($1, $2, $3, $4, $5)`,
        [testId(), data.ujianId, data.soalId, data.urutan, data.poin],
      );
    },
  },
  // ---- Ditambahkan (1.20) utk test skenario baru: multi-role, pengumuman, kurikulum, peta sekolah, KKM UTS/UAS ----
  pengguna: {
    async findFirst(where: { email?: string; nama?: string; sekolahId?: string; peran?: string } = {}) {
      const clauses: string[] = [];
      const params: string[] = [];
      if (where.email) { params.push(where.email); clauses.push(`"email" = $${params.length}`); }
      if (where.nama) { params.push(`%${where.nama}%`); clauses.push(`"nama" ILIKE $${params.length}`); }
      if (where.sekolahId) { params.push(where.sekolahId); clauses.push(`"sekolahId" = $${params.length}`); }
      if (where.peran) { params.push(where.peran); clauses.push(`"peran" = $${params.length}`); }
      const sql = `SELECT * FROM "Pengguna" ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} LIMIT 1`;
      const { rows } = await pool.query(sql, params);
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  guruProfil: {
    /** GuruProfil.id dari email akun login-nya (Pengguna.email) — GuruProfil sendiri gak py kolom
     * email, harus lewat join ke Pengguna. */
    async findByPenggunaEmail(email: string) {
      const { rows } = await pool.query(
        `SELECT g."id" FROM "GuruProfil" g JOIN "Pengguna" p ON p."id" = g."penggunaId" WHERE p."email" = $1`,
        [email],
      );
      return rows[0] as { id: string } | undefined;
    },
    /** 1.23 — guru (peran GURU beneran, bukan TU yg jg punya baris GuruProfil) yg belum punya
     * JadwalEntry sama sekali di sekolah ini, dipakai test indikator "Data belum memadai". */
    async findFirstTanpaJadwal(sekolahId: string) {
      const { rows } = await pool.query(
        `SELECT g."id" FROM "GuruProfil" g
         JOIN "Pengguna" p ON p."id" = g."penggunaId"
         WHERE p."sekolahId" = $1 AND p."peran" = 'GURU'
           AND NOT EXISTS (SELECT 1 FROM "JadwalEntry" j WHERE j."guruId" = g."id")
         LIMIT 1`,
        [sekolahId],
      );
      return rows[0] as { id: string } | undefined;
    },
  },
  penggunaPeran: {
    async findMany(where: { penggunaId: string }) {
      const { rows } = await pool.query(
        `SELECT * FROM "PenggunaPeran" WHERE "penggunaId" = $1`,
        [where.penggunaId],
      );
      return rows as Record<string, unknown>[];
    },
  },
  pengumumanSekolah: {
    async count(where: { sekolahId: string }) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int as c FROM "PengumumanSekolah" WHERE "sekolahId" = $1`,
        [where.sekolahId],
      );
      return (rows[0] as { c: number }).c;
    },
  },
  kurikulum: {
    async findFirst(where: { jenjang: string }) {
      const { rows } = await pool.query(
        `SELECT * FROM "Kurikulum" WHERE "jenjang" = $1 LIMIT 1`,
        [where.jenjang],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  sekolah: {
    async findFirst(where: { npsn?: string; nama?: string } = {}) {
      const clauses: string[] = [];
      const params: string[] = [];
      if (where.npsn) { params.push(where.npsn); clauses.push(`"npsn" = $${params.length}`); }
      if (where.nama) { params.push(`%${where.nama}%`); clauses.push(`"nama" ILIKE $${params.length}`); }
      const sql = `SELECT * FROM "Sekolah" ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} LIMIT 1`;
      const { rows } = await pool.query(sql, params);
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  mataPelajaran: {
    async findFirst(where: { nama?: string; sekolahId?: string } = {}) {
      const clauses: string[] = [];
      const params: string[] = [];
      if (where.nama) { params.push(where.nama); clauses.push(`"nama" = $${params.length}`); }
      if (where.sekolahId) { params.push(where.sekolahId); clauses.push(`"sekolahId" = $${params.length}`); }
      const sql = `SELECT * FROM "MataPelajaran" ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} LIMIT 1`;
      const { rows } = await pool.query(sql, params);
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  kelas: {
    async findUnique(where: { id: string }) {
      const { rows } = await pool.query(`SELECT * FROM "Kelas" WHERE "id" = $1`, [where.id]);
      return rows[0] as Record<string, unknown> | undefined;
    },
    async findFirst(where: { nama?: string; sekolahId?: string } = {}) {
      const clauses: string[] = [];
      const params: string[] = [];
      if (where.nama) { params.push(where.nama); clauses.push(`"nama" = $${params.length}`); }
      if (where.sekolahId) { params.push(where.sekolahId); clauses.push(`"sekolahId" = $${params.length}`); }
      const sql = `SELECT * FROM "Kelas" ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} LIMIT 1`;
      const { rows } = await pool.query(sql, params);
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  absensi: {
    /** Cari 1 tanggal (YYYY-MM-DD) yg baris absensinya di kelas itu punya >=2 status berbeda —
     * dipakai test riwayat absensi supaya tak menebak "kemarin" (bisa kebetulan weekend/tak ada data). */
    async findTanggalDenganStatusBeragam(kelasId: string) {
      const { rows } = await pool.query(
        `SELECT to_char("tanggal", 'YYYY-MM-DD') as tgl, COUNT(DISTINCT "status")::int as "jumlahStatus"
         FROM "Absensi" WHERE "kelasId" = $1 GROUP BY tgl HAVING COUNT(DISTINCT "status") >= 2 ORDER BY tgl DESC LIMIT 1`,
        [kelasId],
      );
      const row = rows[0] as { tgl: string; jumlahStatus: number } | undefined;
      return row?.tgl;
    },
  },
  waliSiswa: {
    /** 1.23 — cari 1 wali (dgn akun login) utk siswa tsb, dipakai test yg perlu diajukanOlehId valid. */
    async findFirst(where: { siswaId: string }) {
      const { rows } = await pool.query(
        `SELECT * FROM "WaliSiswa" WHERE "siswaId" = $1 LIMIT 1`,
        [where.siswaId],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  pengajuanIzin: {
    /** 1.23 — insert PengajuanIzin MENUNGGU langsung, dipakai test indikator izin-pending di absensi. */
    async createMenunggu(data: { siswaId: string; diajukanOlehId: string; tanggalIso: string; jenis: "SAKIT" | "IZIN"; keterangan: string }) {
      const id = testId();
      await pool.query(
        `INSERT INTO "PengajuanIzin" ("id", "siswaId", "diajukanOlehId", "tanggal", "jenis", "keterangan", "status")
         VALUES ($1, $2, $3, $4, $5, $6, 'MENUNGGU')`,
        [id, data.siswaId, data.diajukanOlehId, data.tanggalIso, data.jenis, data.keterangan],
      );
      return id;
    },
    async findById(id: string) {
      const { rows } = await pool.query(`SELECT * FROM "PengajuanIzin" WHERE "id" = $1`, [id]);
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  penugasanGuru: {
    /** Cari guru (dgn akun login) yg mengajar mapel yg sama di >=2 kelas — dipakai utk uji "duplikat ujian ke kelas lain". */
    async findGuruMultiKelasSamaMapel(sekolahId: string) {
      const { rows } = await pool.query(
        `SELECT pg."guruId", pg."mapelId", p."email", p."id" as "penggunaId",
                STRING_AGG(pg."kelasId", ',') as "kelasIds", COUNT(*)::int as "jumlahKelas"
         FROM "PenugasanGuru" pg
         JOIN "GuruProfil" gp ON gp."id" = pg."guruId"
         JOIN "Pengguna" p ON p."id" = gp."penggunaId"
         JOIN "Kelas" k ON k."id" = pg."kelasId"
         WHERE k."sekolahId" = $1
         GROUP BY pg."guruId", pg."mapelId", p."email", p."id"
         HAVING COUNT(*) >= 2
         LIMIT 1`,
        [sekolahId],
      );
      const row = rows[0] as { guruId: string; mapelId: string; email: string; penggunaId: string; kelasIds: string; jumlahKelas: number } | undefined;
      if (!row) return undefined;
      return { ...row, kelasIds: row.kelasIds.split(",") };
    },
    /** Assign guru ke kelas+mapel langsung (ON CONFLICT DO NOTHING — aman dipanggil ulang, unique
     * constraint guruId+kelasId+mapelId) — dipakai test yg butuh guru py penugasan legit ke
     * kombinasi tertentu yg gak natural ada di seed (mis. uji scoping per-mapel lintas mapel). */
    async ensure(data: { guruId: string; kelasId: string; mapelId: string }) {
      await pool.query(
        `INSERT INTO "PenugasanGuru" ("id", "guruId", "kelasId", "mapelId") VALUES ($1, $2, $3, $4)
         ON CONFLICT ("guruId", "kelasId", "mapelId") DO NOTHING`,
        [testId(), data.guruId, data.kelasId, data.mapelId],
      );
    },
  },
  tanyaJawabKelas: {
    /** 1.23 — insert langsung (dipakai test cascade-delete: bikin parent+balasan tanpa lewat UI). */
    async create(data: { kelasId: string; mapelId: string; penggunaId: string; isi: string; anonim?: boolean; parentId?: string | null }) {
      const id = testId();
      await pool.query(
        `INSERT INTO "TanyaJawabKelas" ("id", "kelasId", "mapelId", "penggunaId", "anonim", "isi", "parentId")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, data.kelasId, data.mapelId, data.penggunaId, data.anonim ?? false, data.isi, data.parentId ?? null],
      );
      return id;
    },
    async findById(id: string) {
      const { rows } = await pool.query(`SELECT * FROM "TanyaJawabKelas" WHERE "id" = $1`, [id]);
      return rows[0] as Record<string, unknown> | undefined;
    },
    async countByParent(parentId: string) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int as c FROM "TanyaJawabKelas" WHERE "parentId" = $1`,
        [parentId],
      );
      return (rows[0] as { c: number }).c;
    },
  },
  tagihanTipe: {
    async count(where: { sekolahId: string; nama?: string }) {
      const clauses = [`"sekolahId" = $1`];
      const params: string[] = [where.sekolahId];
      if (where.nama) { params.push(where.nama); clauses.push(`"nama" = $${params.length}`); }
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int as c FROM "TagihanTipe" WHERE ${clauses.join(" AND ")}`,
        params,
      );
      return (rows[0] as { c: number }).c;
    },
    async findFirst(where: { sekolahId: string; nama: string }) {
      const { rows } = await pool.query(
        `SELECT * FROM "TagihanTipe" WHERE "sekolahId" = $1 AND "nama" = $2 LIMIT 1`,
        [where.sekolahId, where.nama],
      );
      return rows[0] as Record<string, unknown> | undefined;
    },
  },
  tagihan: {
    async count(where: { tipeId: string }) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int as c FROM "Tagihan" WHERE "tipeId" = $1`,
        [where.tipeId],
      );
      return (rows[0] as { c: number }).c;
    },
  },
};
