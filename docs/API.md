# Dokumentasi API — Selaras Ajar

Dokumen ini mencakup **dua lapis API** yang beda tujuan & bentuknya:

1. **API Eksternal `/api/v1/*`** — diautentikasi via API key (`X-API-Key`), dipakai integrator pihak ketiga. Ini yang dimaksud "API" dalam arti standar (kontrak stabil, buat dikonsumsi di luar aplikasi ini).
2. **API Internal `/api/*`** — dipakai halaman Next.js aplikasi ini sendiri (form POST dari Server Component, atau `fetch()` dari komponen interaktif). Bukan didesain untuk dipanggil pihak luar, tapi didokumentasikan di sini sebagai referensi tim dev.

Base URL:
- Produksi: `https://dashboard.selaras-ajar.id`
- Lokal: `http://localhost:3000`

---

## 1. API Eksternal — `/api/v1` (API Key)

### Autentikasi

Semua endpoint `/api/v1/*` diautentikasi lewat header `X-API-Key`, **terpisah total** dari session cookie yang dipakai UI. Tidak ada login/password di jalur ini.

```
X-API-Key: sla_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Membuat API key:** hanya **Kepala Sekolah** atau **TU** yang login ke UI bisa membuat key untuk sekolahnya sendiri, dari halaman **Ekspor Data** (`/kepsek/ekspor`) → tombol "Buat API Key". Key ditampilkan **satu kali saja** saat dibuat (one-time reveal) — tidak pernah disimpan plaintext di database (yang disimpan cuma hash + prefix untuk identifikasi di UI), jadi kalau hilang harus bikin key baru.

Key dicabut lewat `POST /api/api-keys/revoke` (dari UI, session-based — lihat §2.1) dan langsung berhenti berfungsi begitu dicabut.

Setiap key terikat ke **satu sekolah** (`sekolahId`) — tidak bisa dipakai lintas sekolah, dan tidak ada scope/permission granular per key (satu key = akses penuh ke endpoint publik apa pun yang tersedia untuk sekolah itu).

### Format Response

Semua response `application/json`. Error konsisten:

```json
{ "error": "pesan error dalam Bahasa Indonesia" }
```

| Status | Arti |
|---|---|
| `200` | Sukses |
| `401` | Header `X-API-Key` tidak ada, key tidak valid, atau sudah dicabut |
| `404` | Resource tidak ditemukan (mis. sekolah sudah dihapus) |

### Endpoint

#### `GET /api/v1/sekolah`

Profil ringkas sekolah pemilik API key (identitas sekolah ditentukan dari key itu sendiri — **bukan** dari parameter di URL, jadi tidak mungkin salah minta data sekolah lain selama key yang dipakai benar).

**Request**
```bash
curl https://dashboard.selaras-ajar.id/api/v1/sekolah \
  -H "X-API-Key: sla_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response `200`**
```json
{
  "id": "cme...",
  "nama": "SD Harapan Bangsa",
  "alamat": "Jl. Merdeka No. 1, Jakarta",
  "jenjang": "SD",
  "jumlahSiswaAktif": 17,
  "jumlahGuru": 4,
  "jumlahKelas": 3
}
```

**Response `401`**
```json
{ "error": "API key tidak valid atau sudah dicabut. Sertakan header X-API-Key." }
```

### Status & rencana ke depan

Ini **satu-satunya endpoint publik** yang ada saat ini — dibangun sebagai contoh/pembuktian pola (autentikasi API key independen dari session), bukan katalog API eksternal yang lengkap. Pola ini (`lib/apikey.ts` → `verifyApiKey(req)`) dirancang supaya gampang direplikasi kalau ke depan dibutuhkan endpoint publik lain (mis. ekspor nilai/siswa ke sistem sekolah lain, integrasi Dapodik pihak ketiga) — tinggal panggil `verifyApiKey` di awal handler baru di bawah `src/app/api/v1/`, ikuti pola scoping `auth.sekolahId` seperti di atas.

---

## 2. API Internal — `/api/*` (Session Cookie)

### Autentikasi & Otorisasi

- Sesi login berupa **JWT di cookie httpOnly** (bukan header) — dibaca lewat `getSession()` di tiap route handler, berisi `{ userId, sekolahId, peran, nama, perans? }`.
- Hampir semua route memvalidasi `session.peran` terhadap satu atau lebih role yang diizinkan; kalau tidak cocok → `403 { error: "Tidak diizinkan" }`.
- **Multi-tenant**: hampir semua data discope ke `session.sekolahId` — request yang menyentuh ID milik sekolah lain harus ditolak di level query (`findFirst({ ..., sekolahId })`), bukan cuma dicek role-nya. Ini invarian keamanan inti aplikasi (lihat §4 di bawah).
- Beberapa endpoint dipakai lintas-peran dengan syarat kepemilikan tambahan (bukan cuma role) — misalnya guru cuma boleh menilai ujian/kelas yang benar-benar diampunya (`PenugasanGuru`), bukan asal ber-role GURU. Endpoint seperti ini ditandai di kolom "Catatan" pada tabel di bawah.

### Format Request & Response

Internal API **bukan** REST/JSON API yang seragam — dua pola dipakai tergantung asal pemanggilan:

| Pola | Dipakai untuk | Request | Response sukses | Response gagal |
|---|---|---|---|---|
| **Form POST + redirect** (mayoritas) | Form submission dari halaman (Server Component + `<form action="...">`) | `multipart/form-data` atau `application/x-www-form-urlencoded` | `303 See Other` redirect ke halaman asal, sukses ditandai lewat query string `?toast=...&tone=success` | `303` redirect ke halaman asal dgn `?error=...`, atau `403`/`404` JSON kalau gagal di tahap otorisasi/lookup sebelum redirect URL sempat disiapkan |
| **fetch + JSON** (interaksi realtime) | Komponen client yang butuh respons cepat tanpa reload — pengerjaan ujian murid (autosave per-soal), notifikasi "tandai dibaca", upload media editor soal | `application/json` atau `multipart/form-data` (upload file) | `200 { ok: true }` atau payload JSON lain | `4xx/5xx { error: "..." }` |

Kolom **Method** & **Body/Params** di tabel bawah mencantumkan field yang benar-benar dibaca route handler (dari `formData.get(...)` / `req.json()` / `searchParams.get(...)`), bukan skema Prisma — jadi field opsional yang gak dikirim biasanya fallback ke default/`null`, cek source per-route kalau butuh detail validasi persis.

### Konvensi error 500 & mutasi ID

Per audit keamanan (Sep 2026), semua endpoint yang menerima ID lewat body/form lalu langsung `.update()`/`.create()` **wajib**: (1) validasi record ada, (2) validasi record itu milik `session.sekolahId`/milik guru yang login (bukan cuma exist), (3) pakai objek hasil validasi — bukan ID mentah dari request — untuk mutasi aslinya. Kalau ketemu route yang tidak ikuti pola ini, itu bug (P2025 crash 500 dan/atau celah lintas-tenant), bukan desain yang disengaja.

---

### 2.1 Autentikasi & Sesi

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/auth/login` | – (publik) | `email, password` | Set cookie sesi kalau kredensial cocok |
| POST | `/api/auth/logout` | – (publik) | – | Hapus cookie sesi |
| POST | `/api/auth/switch-role` | siapa saja yang login | `peran, sekolahId` | Untuk akun dengan >1 peran (`session.perans`), pindah konteks peran/sekolah aktif tanpa login ulang |

### 2.2 Akun & API Key

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/akun/foto` | siapa saja | `foto` (file) | Ganti foto profil sendiri |
| POST | `/api/akun/password` | siapa saja | `passwordLama, passwordBaru, konfirmasiPasswordBaru` | Ganti password sendiri, verifikasi password lama dulu |
| POST | `/api/api-keys` | KEPALA_SEKOLAH, TU | `label` | Bikin API key baru (lihat §1) — plaintext lewat sekali di redirect |
| POST | `/api/api-keys/revoke` | KEPALA_SEKOLAH, TU | `apiKeyId` | Cabut key, langsung berhenti berfungsi di `/api/v1/*` |

### 2.3 Sekolah, Master Data & Tahun Ajaran

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/sekolah/profil` | KEPALA_SEKOLAH | `alamat` | Update alamat sekolah sendiri |
| POST | `/api/master-data/kelas` | KEPALA_SEKOLAH, TU | `nama, tingkat` | Tambah kelas baru |
| POST | `/api/master-data/kelas/update` | KEPALA_SEKOLAH, TU | `kelasId, nama, tingkat` | Ubah kelas |
| POST | `/api/master-data/kelas/impor` | KEPALA_SEKOLAH, TU | `file` (CSV) | Impor massal kelas |
| POST | `/api/master-data/mapel` | KEPALA_SEKOLAH, TU | `nama, kkm` | Tambah mapel |
| POST | `/api/master-data/mapel/update` | KEPALA_SEKOLAH, TU | `mapelId, nama, kkm` | Ubah mapel |
| POST | `/api/master-data/mapel/impor` | KEPALA_SEKOLAH, TU | `file` (CSV) | Impor massal mapel |
| POST | `/api/master-data/mapel/kurikulum` | KEPALA_SEKOLAH, TU | – | Isi mapel otomatis dari preset kurikulum sekolah (kurikulum global superadmin, atau fallback preset Kurikulum Merdeka per jenjang) |
| POST | `/api/master-data/kurikulum` | KEPALA_SEKOLAH, TU | `kurikulumId` | Pilih kurikulum global (dikelola superadmin) untuk sekolah ini |
| POST | `/api/nilai-config/kkm` | KEPALA_SEKOLAH, TU | `mapelId, kkm, kkmUTS, kkmUAS` | KKM per mapel (+ opsional KKM UTS/UAS terpisah) |
| POST | `/api/nilai-config/bobot` | KEPALA_SEKOLAH, TU | `mapelId, bobot_<Komponen>` per komponen (Ulangan Harian/Tugas/UTS/UAS) | Total bobot wajib tepat 100% |
| POST | `/api/nilai-config/predikat` | KEPALA_SEKOLAH, TU | `scaleId[], min_<id>, max_<id>, label_<id>`, opsional `labelBaru, minBaru, maxBaru` | Ubah/tambah band predikat nilai (grade scale), per-baris pakai id dinamis |
| POST | `/api/tahun-ajaran/kenaikan-kelas/mulai` | KEPALA_SEKOLAH | `label, semester, mulai, selesai, tingkatMaks` | Langkah 1 kenaikan kelas: bikin tahun ajaran baru (belum aktif) + kelas tujuan default 1:1 |
| POST | `/api/tahun-ajaran/kenaikan-kelas/tambah-kelas` | KEPALA_SEKOLAH | `tahunBaruId, nama, tingkat` | Tambah rombel tujuan tambahan saat meninjau (mis. pecah 1 kelas jadi 2) |
| POST | `/api/tahun-ajaran/kenaikan-kelas/jalankan` | KEPALA_SEKOLAH | `tahunBaruId, keteranganPindah`, `target_<siswaId>` per siswa (`LULUS`/`PINDAH`/id kelas tujuan) | Langkah 2 (final, destruktif): eksekusi promosi/lulus/pindah per siswa & aktifkan tahun ajaran baru |

### 2.4 Guru & Penugasan

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/guru` | KEPALA_SEKOLAH, TU | `nama, email, telepon, jenisKelamin, nip, mapelUtama` | Tambah guru manual (selain impor CSV) |
| POST | `/api/guru/update` | KEPALA_SEKOLAH | `penggunaId, nama, telepon, jenisKelamin, nip, mapelDiampu, aktif` | Ubah data guru |
| POST | `/api/guru/tambah-peran` | KEPALA_SEKOLAH | `penggunaId, peran` | Beri peran tambahan ke akun (mis. guru juga jadi bendahara) |
| POST | `/api/guru/hapus-peran` | KEPALA_SEKOLAH | `penggunaPeranId` | Cabut satu peran tambahan |
| POST | `/api/guru/wali-kelas` | KEPALA_SEKOLAH | `penggunaId, kelasId` | Tetapkan wali kelas |
| POST | `/api/penugasan-guru` | KEPALA_SEKOLAH | `penggunaId, kelasId, mapelId` | Assign guru ke kelas+mapel (dasar dari semua cek kepemilikan guru di modul lain) |
| POST | `/api/penugasan-guru/hapus` | KEPALA_SEKOLAH | `penugasanId` | Cabut penugasan |
| POST | `/api/impor/guru` | KEPALA_SEKOLAH, TU | `file` (CSV) | Impor massal guru |

### 2.5 Siswa

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/siswa/update` | KEPALA_SEKOLAH | `siswaId, nama, kelasId, jenisKelamin, tanggalLahir, alamat, aktif` | Ubah data siswa |
| POST | `/api/siswa/mutasi-masuk` | KEPALA_SEKOLAH, TU | `nisn, nama, kelasId, jenisKelamin` | Terima siswa pindahan dari sekolah lain |
| POST | `/api/siswa/mutasi-keluar` | KEPALA_SEKOLAH, TU | `siswaId, tanggalKeluar, keterangan` | Nonaktifkan siswa krn pindah sekolah |
| POST | `/api/siswa/tambah-wali` | KEPALA_SEKOLAH, TU | `siswaId, nama, hubungan, email, telepon, jenisKelamin` | Bikin akun ORANG_TUA baru + kaitkan ke siswa (siswa yg belum punya wali sama sekali) |
| POST | `/api/siswa/catatan` | GURU | `siswaId, mapelKonteks, isi` | Catatan perkembangan siswa dari guru |
| POST | `/api/siswa/catatan/hapus` | GURU | `catatanId, siswaId` | Hapus catatan (guru pembuat saja) |
| POST | `/api/siswa/prestasi` | GURU, KEPALA_SEKOLAH | `siswaId, judul, keterangan, tanggal, kembaliKe` | Catat prestasi siswa |
| POST | `/api/impor/siswa/preview` | KEPALA_SEKOLAH | `file` (CSV) | Validasi CSV impor siswa, hasil belum disimpan (return preview + `batchId`) |
| POST | `/api/impor/siswa/commit` | KEPALA_SEKOLAH | `batchId` | Simpan hasil preview yg sudah divalidasi |
| GET | `/api/impor/siswa/template` | – (publik) | – | Download CSV contoh format impor siswa |

### 2.6 Jadwal & Presensi Guru

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/jadwal` | KEPALA_SEKOLAH, TU, GURU | `entryId?, kelasId, hari, jamMulai, jamSelesai, tahunAjaranId, penugasan` (`penugasan` = `"guruId\|mapelId"`) | Create/update satu slot jadwal; GURU cuma boleh untuk kelas+mapel yg diampunya, ada cek bentrok jadwal |
| POST | `/api/jadwal/hapus` | KEPALA_SEKOLAH, TU, GURU | `jadwalEntryId, kelasId` | Hapus slot jadwal |
| POST | `/api/presensi-guru/manual` | GURU | `jadwalEntryId` | Guru tandai diri hadir mengajar utk satu slot jadwal |
| POST | `/api/presensi-guru/berhalangan` | GURU, KEPALA_SEKOLAH | `jadwalEntryId, keterangan` | Tandai guru berhalangan utk satu slot jadwal |

### 2.7 Absensi Siswa & Izin

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/absensi` | GURU | `kelasId, tanggal, siswaId[]`, + `status_<siswaId>` (`HADIR`/`SAKIT`/`IZIN`/`ALPA`) & `catatan_<siswaId>` per siswa | Simpan absensi harian satu kelas (upsert per siswa+tanggal); non-HADIR memicu notifikasi ke murid & wali, dibatalkan otomatis kalau dikoreksi balik jadi HADIR |
| POST | `/api/izin` | ORANG_TUA | `siswaId, tanggal, jenis, keterangan` | Ajukan izin (sakit/izin) untuk anak |
| POST | `/api/izin/putuskan` | GURU | `pengajuanId, keputusan` | Wali kelas terima/tolak pengajuan izin |

### 2.8 Materi, RPP, Capaian & Diskusi

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/materi` | GURU | `kelasId, mapelId, judul, tipe, babId, babBaru, sumberVideo, isi`(+ file) | Upload materi belajar; wajib `PenugasanGuru` yg cocok utk kelas+mapel |
| POST | `/api/rpp` | GURU | `kelasId, mapelId, judul, isi, lampiranUrl, capaianIds[]` | Bikin RPP; wajib `PenugasanGuru` yg cocok |
| POST | `/api/rpp/update` | GURU | `rppId, judul, isi, lampiranUrl, capaianIds[]` | Ubah RPP milik sendiri |
| POST | `/api/capaian` | GURU, KEPALA_SEKOLAH | `mapelId, kode, deskripsi` | Capaian Pembelajaran (CP) per mapel, dirujuk RPP |
| POST | `/api/diskusi` | GURU, MURID | `materiId`/`tugasId`, `parentId?, isi` | Komentar di bawah materi/tugas (thread 1 level) |
| POST | `/api/diskusi/hapus` | GURU | `komentarId` | Hapus komentar (moderasi guru) |
| POST | `/api/tanya-jawab` | GURU, MURID | `kelasId, mapelId, parentId?, isi, anonim` | Forum tanya-jawab per kelas+mapel; scoping ketat ke kelas siswa sendiri / penugasan guru |
| POST | `/api/tanya-jawab/hapus` | GURU | `tanyaJawabId` | Hapus post (guru pengampu kelas+mapel terkait) |
| POST | `/api/pesan` | GURU, ORANG_TUA | `penerimaId, judul, isi, parentId?` | Pesan pribadi guru↔ortu |

### 2.9 Tugas & Proyek (P5)

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/tugas` | GURU | `kelasId, mapelId, judul, instruksi, tenggat, tautanUrl` | Buat tugas |
| POST | `/api/tugas/kumpul` | MURID | `tugasId, isiJawaban, tautanUrl` | Murid kumpulkan tugas |
| POST | `/api/tugas/nilai` | GURU | `tugasId, pengumpulanId` (+ skor per pengumpulan) | Nilai tugas yg dikumpulkan |
| POST | `/api/projek` | GURU | `tema, dimensi` | Buat proyek P5 |
| POST | `/api/projek/nilai` | GURU | `projekId, siswaId, dimensiList` | Nilai per-dimensi proyek per siswa |

### 2.10 Nilai

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/nilai` | GURU | `kelasId, mapelId, sumberTipe, sumberId, siswaId` (+ skor) | Input nilai per komponen (Ulangan Harian/UTS/UAS dsb) |
| POST | `/api/nilai/asesmen` | GURU | `siswaId, mapelId, kelasId, periode, isi` | Asesmen naratif (rapor deskriptif, non-angka) |

### 2.11 Ujian / CBT

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/ujian` | GURU | `judul, jenis, jenisPenilaian, penugasan[]` (tiap item `"kelasId\|mapelId"`), `babId, babBaru` | Buat ujian baru (status DRAFT), bisa langsung ditugaskan ke >1 kelas sekaligus |
| POST | `/api/ujian/pengaturan` | GURU | `ujianId, judul, jenis, durasiMenit, acakSoal, acakJawaban, sekaliAkses, modeHasil, jadwalHasilManual`, + `jamMulai_<ujianKelasId>`/`jamSelesai_<ujianKelasId>` per kelas | Ubah pengaturan ujian & jadwal akses per kelas |
| POST | `/api/ujian/soal-tambah` | GURU | `ujianId, soalId` | Tambah soal dari bank soal ke ujian (poin awal = `poinDefault` soal) |
| POST | `/api/ujian/soal-hapus` | GURU | `ujianId, soalId` | Hapus soal dari ujian |
| POST | `/api/ujian/soal-poin` | GURU | `ujianId, soalId, poin` | Ubah poin soal — hanya selagi ujian masih DRAFT |
| POST | `/api/ujian/publish` | GURU | `ujianId` | Terbitkan ujian (DRAFT → PUBLISHED), murid bisa mulai mengerjakan sesuai jadwal |
| POST | `/api/ujian/duplikat` | GURU | `ujianId, kelasTargetIds[], judulBaru` | Klon ujian (referensi soal yang sama) jadi draft baru utk kelas lain; hasil ujian asal tak tersentuh |
| POST | `/api/ujian/konfirmasi-koreksi` | GURU | `pengerjaanId, ujianId` | Konfirmasi koreksi esai selesai → nilai final terbuka ke murid/ortu |
| POST | `/api/ujian/nilai-esai` | GURU | `ujianId, jawabanId[]` (+ `skor_<jawabanId>` per jawaban) | Beri skor manual jawaban esai/isian |
| POST | `/api/ujian/komentar` | GURU | `pengerjaanId, ujianId, komentarGuru` | Komentar guru di hasil pengerjaan seorang murid |
| POST *(fetch, JSON)* | `/api/ujian/jawab` | MURID | `{ pengerjaanId, soalId, jawabanPG?, jawabanPGMulti?, jawabanTeks? }` | Autosave satu jawaban selagi ujian berjalan |
| POST *(fetch, JSON)* | `/api/ujian/submit` | MURID | `{ pengerjaanId, auto? }` | Submit ujian (manual atau auto-submit krn waktu habis); idempotent |

### 2.12 Bank Soal (Guru & Impor)

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/soal` | GURU | `mapelId, jenis, pertanyaan, topik, tingkatKesulitan, poinDefault, durasiDetik` + field sesuai jenis (`opsi[], kunciJawaban` / `kunciJawabanMulti[]` / `kunciSingkat`, `penguranganMode, penguranganNilai`), opsional `ujianId` (langsung tambah ke ujian) | Bank soal 5 jenis: PG, PG kompleks, PG minus, jawaban singkat, esai |
| POST | `/api/soal/update` | GURU | sama seperti create + `soalId` | Ubah soal milik sekolah sendiri |
| POST | `/api/soal/impor/preview` | GURU | `mapelId, file` (CSV) | Validasi CSV impor soal, belum disimpan |
| POST | `/api/soal/impor/commit` | GURU | `batchId` | Simpan hasil preview impor soal |
| GET | `/api/soal/impor/template` | GURU | – | Download CSV contoh format impor soal |
| POST *(fetch, JSON resp.)* | `/api/soal/media-upload` | GURU, KEPALA_SEKOLAH, SUPERADMIN | `file, tipe` (gambar/video) | Upload media dari editor rich-text soal (dipanggil langsung dari `SoalEditor`, bukan lewat form submit) |

### 2.13 Notifikasi

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST *(fetch, JSON)* | `/api/notifikasi/baca` | siapa saja | `{ id }` | Tandai satu notifikasi dibaca, tanpa reload panel |
| POST | `/api/notifikasi/baca-semua` | siapa saja | – | Tandai semua notifikasi milik sendiri dibaca |

### 2.14 Agenda, Pengumuman & Supervisi

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/agenda` | KEPALA_SEKOLAH | `judul, tanggal, jenis, keterangan` | Tambah agenda sekolah |
| POST | `/api/agenda/update` | KEPALA_SEKOLAH | `id, judul, tanggal, jenis, keterangan` | Ubah agenda |
| POST | `/api/agenda/hapus` | KEPALA_SEKOLAH | `id` | Hapus agenda |
| POST | `/api/pengumuman` | KEPALA_SEKOLAH, TU | `judul, isi` | Buat pengumuman sekolah |
| POST | `/api/pengumuman/hapus` | KEPALA_SEKOLAH, TU | `pengumumanId` | Hapus pengumuman |
| POST | `/api/supervisi` | KEPALA_SEKOLAH | `guruId, catatan` | Catatan supervisi kepsek terhadap guru |

### 2.15 Keuangan / Tagihan

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/tagihan-tipe` | BENDAHARA, KEPALA_SEKOLAH | `nama` | Jenis tagihan (mis. SPP, uang gedung) |
| POST | `/api/tagihan/buat` | BENDAHARA, KEPALA_SEKOLAH | `tipeId, nominal, jatuhTempo, periode, targetMode` (`SEMUA`/lainnya) + `jenjangTargets[]`/`kelasTargets[]`/`muridTargets[]` sesuai mode | Terbitkan tagihan massal sesuai target (semua siswa, per jenjang, per kelas, atau murid spesifik) |
| POST | `/api/tagihan/lunas` | BENDAHARA, KEPALA_SEKOLAH | `tagihanId, metode, catatan, tanggalBayar, nominal` | Tandai satu tagihan lunas manual (pembayaran offline) |
| POST | `/api/tagihan/bayar` | ORANG_TUA | `tagihanId[]` (bisa lebih dari satu — "Bayar Semua Tagihan") | Ortu bayar 1 atau banyak tagihan anaknya sekaligus |

### 2.16 PPDB & Consent

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/ppdb` | – (publik) | `namaCalon, jenjangDaftar, namaOrtu, kontak` | Form pendaftaran murid baru dari halaman publik `/ppdb` |
| POST | `/api/ppdb/putuskan` | KEPALA_SEKOLAH | `id, status` | Terima/tolak pendaftar PPDB |
| POST | `/api/consent` | ORANG_TUA | `disetujui` | Persetujuan pemrosesan data anak (UU PDP) |

### 2.17 Ekspor & Backup Data

| Method | Endpoint | Role | Response | Catatan |
|---|---|---|---|---|
| GET | `/api/ekspor/siswa` | KEPALA_SEKOLAH, BENDAHARA | CSV attachment | Data induk siswa, kolom mengikuti format Dapodik/e-Rapor |
| GET | `/api/ekspor/nilai` | KEPALA_SEKOLAH, BENDAHARA | CSV attachment | Nilai semua siswa + predikat terhitung |
| GET | `/api/ekspor/backup` | KEPALA_SEKOLAH, BENDAHARA | JSON attachment | Backup penuh data sekolah |

### 2.18 Superadmin — Sekolah, Kurikulum Global & Bank Soal Global

| Method | Endpoint | Role | Body | Catatan |
|---|---|---|---|---|
| POST | `/api/superadmin/sekolah` | SUPERADMIN | `nama, jenjang, npsn, alamat, kecamatan, kabupatenKota, provinsi, kodePos, latitude, longitude` | Daftarkan sekolah baru ke platform |
| POST | `/api/superadmin/sekolah/kepsek` | SUPERADMIN | `sekolahId, kepsekNama, kepsekEmail, jenisKelamin` | Buat akun kepala sekolah untuk sekolah (terpisah dari alur tambah sekolah) |
| POST | `/api/superadmin/sekolah/lokasi` | SUPERADMIN | `sekolahId, latitude, longitude` | Update koordinat lokasi sekolah |
| POST | `/api/superadmin/sekolah/toggle-aktif` | SUPERADMIN | `sekolahId` | Aktifkan/nonaktifkan akses sekolah ke platform |
| GET | `/api/superadmin/sekolah-search` | SUPERADMIN | Query: `q, halaman` | Proxy pencarian nama sekolah (api.co.id) utk form tambah sekolah |
| GET | `/api/superadmin/sekolah-kodepos` | SUPERADMIN | Query: `kecamatanCode` | Ambil kode pos dari kecamatan terpilih |
| POST | `/api/superadmin/kurikulum` | SUPERADMIN | `nama, jenjang, mapelNama[], mapelKkm[]` | Buat kurikulum global (preset dipakai semua sekolah yg pilih kurikulum itu) |
| POST | `/api/superadmin/kurikulum/update` | SUPERADMIN | `kurikulumId, nama, jenjang` | Ubah kurikulum global |
| POST | `/api/superadmin/kurikulum-mapel` | SUPERADMIN | `kurikulumId, nama, kkm` | Tambah mapel ke kurikulum global |
| POST | `/api/superadmin/kurikulum-mapel/hapus` | SUPERADMIN | `kurikulumMapelId, kurikulumId` | Hapus mapel dari kurikulum global |
| POST | `/api/superadmin/bank-soal` | SUPERADMIN | `mapelNama, jenjang, rekomendasiKelas, jenis, pertanyaan, ...` (sama struktur dgn `/api/soal`) | Bank soal **global** (`sekolahId: null`) — tersedia sbg referensi lintas semua sekolah |
| POST | `/api/superadmin/bank-soal/update` | SUPERADMIN | `soalId, ...` | Ubah soal bank global |
| POST | `/api/superadmin/bank-soal/hapus` | SUPERADMIN | `soalId` | Hapus soal bank global |

---

## 3. Ringkasan Peran (Enum `Peran`)

| Peran | Cakupan umum |
|---|---|
| `SUPERADMIN` | Kelola platform lintas-sekolah: daftar sekolah, kurikulum global, bank soal global |
| `KEPALA_SEKOLAH` | Kelola penuh satu sekolah: master data, guru, siswa, keuangan (bersama Bendahara), kenaikan kelas, akses hampir semua modul |
| `BENDAHARA` | Keuangan/tagihan; sering di-grant bersama role lain lewat `penggunaPeran` |
| `TU` | Administrasi (master data, impor data, API key) — banyak endpoint di-share dgn KEPALA_SEKOLAH |
| `GURU` | Modul mengajar: absensi, nilai, materi, RPP, ujian/CBT, tugas, tanya-jawab — dibatasi ketat ke kelas+mapel yg diampu via `PenugasanGuru` |
| `ORANG_TUA` | Ajukan izin anak, bayar tagihan, consent data, pesan ke guru |
| `MURID` | Kerjakan ujian/tugas, kumpul tugas, tanya-jawab, diskusi materi |

Satu akun (`Pengguna`) bisa punya **lebih dari satu peran** (`session.perans`) — mis. guru yang juga Bendahara — dan pindah konteks lewat `POST /api/auth/switch-role` (§2.1) tanpa logout.

---

*Dihasilkan dari pembacaan langsung 113 route handler di `src/app/api/` (per 8 September 2026). Kalau ada perilaku endpoint yang berubah, dokumen ini perlu disinkron manual — tidak ada mekanisme generate-otomatis (mis. OpenAPI/Swagger) di codebase ini saat ini.*
