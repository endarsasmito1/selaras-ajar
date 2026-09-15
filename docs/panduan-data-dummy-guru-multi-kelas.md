# Panduan Data Dummy — Skenario Guru Multi-Kelas (Kurikulum Merdeka)

Panduan ini nyusun 1 skenario dummy **tambahan** (bukan restrukturisasi seed yang sudah ada) sesuai permintaan:

- 1 guru mengampu 10 kelas, termasuk jadi wali kelas di salah satunya.
- Tiap kelas berisi 40 murid.
- Tiap murid punya nilai lengkap di **semua** mapel inti Kurikulum Merdeka, 10 nilai/hasil ujian per mapel — campuran nilai manual (`Nilai`) dan hasil ujian online (`Ujian`/`UjianPengerjaan`).

## 1. Kenapa ini skenario tambahan, bukan ubah seed yang ada

`prisma/seed.ts` sekarang sudah punya 24 kelas tetap (tingkat 1–6 × rombel A–D, ±13–16 murid/kelas) dengan guru & wali kelas yang sudah dipasang rapi, dan **264 test Playwright + snapshot visual-regression** sensitif terhadap jumlah/isi data itu persis. Menambah 40 murid ke kelas yang sudah ada atau menggeser wali kelas yang sudah ada akan merusak banyak test yang mengasumsikan angka lama.

Jadi skenario ini dibuat sebagai **blok baru, terisolasi**, ditambahkan di akhir `seed.ts` (atau script terpisah): guru baru, 10 kelas baru dengan nama yang jelas beda dari 24 kelas asli, murid baru. Tidak menyentuh entity lama sama sekali.

## 2. Guru contoh

Ikuti konvensi akun demo yang sudah ada (`nama`, `email @selarasajar.demo`, `nip` 18 digit, `peran: "GURU"`).

| Field | Nilai contoh |
|---|---|
| Nama | Bu Nadia Kurniasari |
| Email | `nadia@selarasajar.demo` |
| NIP | `198808142013012099` |
| Mapel spesialisasi | Bahasa Inggris (lintas 10 kelas) |

Model yang dipakai: `GuruProfil` ([schema.prisma:159](../prisma/schema.prisma#L159)) terhubung ke `Pengguna` (akun login), dan `PenugasanGuru` ([schema.prisma:173](../prisma/schema.prisma#L173)) untuk tiap (guru, kelas, mapel) yang benar-benar diajar.

## 3. 10 kelas & pola wali kelas

Buat **10 kelas baru** (bukan pakai 24 kelas lama), disebar rata ke tingkat 4–6 (SD atas) supaya masuk akal, misal `4E, 4F, 5E, 5F, 6E, 6F, 4G, 5G, 6G, 4H` — nama bebas asal unik per (`sekolahId`, `tahunAjaranId`) karena `Kelas` punya constraint `@@unique([sekolahId, tahunAjaranId, nama])` ([schema.prisma:227](../prisma/schema.prisma#L227)).

Pola penugasan per kelas (total 10 kelas):

- **1 kelas** → Bu Nadia jadi **wali kelas** (`Kelas.waliKelasId` diisi akunnya) **dan** dapat penugasan mengajar 1 mapel inti di kelas itu (mengikuti pola yang sudah dipakai wali kelas tinggi lain di seed — wali kelas SD tetap pegang minimal satu mapel di kelasnya sendiri, lihat [seed.ts:346-348](../prisma/seed.ts#L346)).
- **10 kelas** (termasuk kelas walinya) → Bu Nadia dapat penugasan **Bahasa Inggris** di semuanya. Ini yang bikin totalnya "mengampu 10 kelas".
- **7 mapel lain** di tiap kelas diajar guru spesialis yang **sudah ada** di seed (dipakai ulang, tidak bikin akun baru): Matematika (Rina), Bahasa Indonesia (Solihin), IPAS (Yuni), PPKn (Wulan), Seni Budaya (Wulan), Pendidikan Agama (Zainal), PJOK (Fikri) — persis pola "spesialis lintas kelas" yang sudah dipakai untuk 24 kelas asli ([seed.ts:298-302](../prisma/seed.ts#L298), [seed.ts:366-369](../prisma/seed.ts#L366)).

Hasilnya: tiap murid di 10 kelas ini otomatis punya guru untuk **semua 8 mapel inti**, bukan cuma mapel yang diajar Bu Nadia — sesuai syarat "nilai dalam tiap mapel".

## 4. 40 murid per kelas

10 kelas × 40 murid = **400 siswa baru**. Pakai helper generator nama yang sudah ada di seed (`NAMA_DEPAN_L/P`, `NAMA_BELAKANG`, pola NISN berurutan — lihat [seed.ts:382-396](../prisma/seed.ts#L382)) supaya gaya datanya konsisten, tinggal lanjutkan counter NISN dari angka terakhir yang dipakai seed utama supaya tidak tabrakan (`Siswa.nisn` unik, [schema.prisma:305](../prisma/schema.prisma#L305)).

Tiap siswa: `kelasId` salah satu dari 10 kelas baru, `akunId` opsional (boleh dibuatkan akun login ORANG_TUA/MURID kalau mau, tapi tidak wajib untuk skenario ini — fokusnya di beban guru & volume nilai).

## 5. 10 nilai/hasil per mapel per murid (campuran)

Per (murid, mapel) — dikali 8 mapel × 400 murid = 3.200 kombinasi — isi **10 entri**, campuran 2 model:

**A. 7 entri dari model `Nilai`** ([schema.prisma:367](../prisma/schema.prisma#L367)), mengikuti 4 komponen yang sudah dipakai `BobotKomponen` (UH 30%, Tugas 20%, UTS 20%, UAS 30%, lihat [seed.ts:249-256](../prisma/seed.ts#L249)):

| Komponen | Judul | Jumlah |
|---|---|---|
| Ulangan Harian | "UH 1", "UH 2", "UH 3" | 3 |
| Tugas | "Tugas 1", "Tugas 2" | 2 |
| UTS | "UTS Semester Ganjil" | 1 |
| UAS | "UAS Semester Ganjil" | 1 |

Ingat constraint `@@unique([siswaId, kelasId, mapelId, komponen, judul])` ([schema.prisma:381](../prisma/schema.prisma#L381)) — judul di atas harus persis begitu supaya tiap baris unik, jangan generate judul acak per murid.

**B. 3 entri dari `Ujian` + `UjianPengerjaan`** (ujian online beneran, model di [schema.prisma:622](../prisma/schema.prisma#L622) dst) — **catatan penting: `Nilai` dan `Ujian` adalah 2 tabel yang sepenuhnya terpisah, tidak ada sinkronisasi otomatis antar keduanya** (dicek di `src/app/api/nilai/route.ts` — nilai ujian online tidak pernah ditulis ke tabel `Nilai`). Jadi 3 entri ini murni nambah riwayat "hasil ujian" murid, terpisah dari rapor manual di atas.

Per mapel, buat **1 `Ujian`** yang diterapkan ke ke-10 kelas sekaligus lewat `UjianKelas` ([schema.prisma:655](../prisma/schema.prisma#L655), fitur ini memang untuk 1 ujian dipakai banyak kelas) — jadi total **8 `Ujian`** (bukan 8×10), masing-masing dengan 40×10 = 400 baris `UjianPengerjaan`, 3 "attempt" per murid disimulasikan dengan 3 `Ujian` per mapel:

- 2× `jenisPenilaian: HARIAN`, `jenis: LATIHAN`
- 1× `jenisPenilaian` gantian `UTS`/`UAS` per mapel (variasi)

Jadi sebenarnya **8 mapel × 3 = 24 `Ujian`**, tiap satu punya 400 `UjianPengerjaan` (1 per murid di 10 kelas) → total 9.600 baris `UjianPengerjaan`.

Dua opsi kedalaman implementasi untuk `UjianPengerjaan`:

- **Cara ringkas (disarankan untuk volume sebesar ini)**: skip `UjianSoal`/`UjianJawaban` asli, langsung isi `status: "SELESAI"`, `waktuMulai`/`waktuSelesai`, `koreksiDikonfirmasi: true`, dan `nilaiTotal` pakai angka random realistis (lihat §6). Cukup untuk tujuan "murid punya riwayat nilai", tidak untuk test alur pengerjaan soal.
- **Cara penuh**: generate beberapa `Soal` + `UjianSoal` + `UjianJawaban` asli per `Ujian` supaya `nilaiTotal` dihitung dari jawaban beneran — jauh lebih berat (soal × 400 murid × 24 ujian), cuma perlu kalau memang mau test end-to-end alur ujian online, bukan sekadar isi rapor.

## 6. Distribusi skor

Supaya realistis (bukan semua 100 atau seragam), generate skor per entri dengan rentang acak per KKM mapel (`MataPelajaran.kkm`, default 70–75, Matematika punya `kkmUTS`/`kkmUAS` beda — lihat [schema.prisma:236-239](../prisma/schema.prisma#L236)):

- ~80% skor di rentang KKM+0 s/d KKM+25 (lulus wajar)
- ~15% skor tepat di sekitar KKM±3 (pas-pasan)
- ~5% skor di bawah KKM (remedial-worthy, biar halaman rapor/predikat ada variasi kondisi)

## 7. Rekap volume total

| Entity | Jumlah |
|---|---|
| Guru baru | 1 |
| Kelas baru | 10 |
| Siswa baru | 400 (10 × 40) |
| `PenugasanGuru` baru | 10 (Nadia–B.Inggris) + 10 (mapel Nadia di kelas walinya sudah termasuk) + 70 (7 mapel lain × 10 kelas) = ±80 |
| `Nilai` baru | 400 × 8 mapel × 7 = **22.400 baris** |
| `Ujian` baru | 8 mapel × 3 = **24 baris** |
| `UjianKelas` baru | 24 × 10 kelas = **240 baris** |
| `UjianPengerjaan` baru | 24 × 400 = **9.600 baris** |

## 8. Jadwal pelajaran, materi belajar, tanya jawab kelas (feedback Sep 2026)

Skenario di atas (§1–§7) awalnya cuma mengisi Kelas/Guru/Murid/Nilai — begitu dicek langsung di
app, 3 halaman ini masih kosong utk 10 kelas baru: **jadwal pelajaran**, **materi belajar**, **tanya
jawab kelas**. Sudah diisi lewat `scripts/inject-dummy-jadwal-materi-tanya.ts` (dijalankan SETELAH
`inject-dummy-guru-multi-kelas.ts`), non-destruktif spt skrip sebelumnya. Detail:

**Jadwal pelajaran** — guru yang dipakai ulang di skenario ini (Rina/Solihin/Yuni/Wulan/Zainal/
Fikri) SUDAH punya jadwal padat di 24 kelas asli (Zainal & Fikri mengajar lintas 24 kelas, nyaris
penuh di grid 5 hari × 5 sesi pagi = 25 slot/minggu). Nambah 10 kelas lagi ke guru yang sama gak
akan muat di grid lama, jadi kapasitas digenapin ke **6 hari (Senin–Sabtu) × 9 sesi (pagi + siang)
= 54 slot/minggu/guru** (`hari` di schema memang mendukung 1–6), dan skrip cek jadwal yang SUDAH
ADA lebih dulu (query `JadwalEntry` existing) supaya gak ada guru ke-double-booking di jam yang
sama. Hasil: 80 entri jadwal (8 mapel × 10 kelas).

**Materi belajar** — 2 catatan asli per mapel (bukan template kosong), reuse `Bab` "Bab 1" yang
sudah ada per mapel dari seed utama (bukan bikin Bab baru, krn `Bab` unik per `(mapelId, nama)`).
**Catatan penting yang ditemukan sekalian**: materi seed ASLI (24 kelas) ternyata punya bug serupa
kasus soal dummy — barisnya `tipe: "dokumen"` tapi `isi` diisi KALIMAT DESKRIPSI ("Ringkasan materi
X untuk kelas Y."), bukan path berkas beneran, jadi tombol "Unduh berkas" hrefnya jadi kalimat itu
sendiri (lihat `prisma/seed.ts` sekitar baris 625–640). Materi baru di skrip ini sengaja pakai
`tipe: "catatan"` dengan isi teks asli supaya tidak mengulang bug yang sama; perbaikan utk materi
LAMA di 24 kelas belum dikerjakan (di luar scope skenario ini, tapi dicatat sbg temuan terpisah).

**Tanya jawab kelas** — `TanyaJawabKelas.penggunaId` mengacu ke `Pengguna`, BUKAN ke `Siswa`
langsung — sementara 400 murid dummy di skenario ini sengaja tanpa akun login (§4, fokusnya beban
guru bukan akun murid). Skrip ini menambah **1 akun murid per kelas** (10 akun baru, murid pertama
tiap kelas, pola sama seperti seed utama linking `Siswa.akunId`) khusus supaya bisa jadi "penanya"
yang valid. Per (kelas, mapel): 1 pertanyaan dari murid wakil tsb + 1 balasan dari guru mapel
bersangkutan → 80 thread, 160 baris.

## 9. Catatan implementasi teknis

- **Batching**: 22.400 + 9.600 ≈ 32.000 baris insert — jangan `await` satu-satu dalam loop. Pakai `createMany` per chunk (mis. 500 baris/batch, SQLite punya batas jumlah bound parameter per statement) di dalam `prisma.$transaction(...)`.
- **Urutan pembuatan**: Guru & akunnya → 10 kelas → `PenugasanGuru` → 400 siswa → baru generate `Nilai`/`Ujian` (butuh semua `id` di atas).
- **Reuse guru existing**: ambil `id` `GuruProfil` Rina/Solihin/Yuni/Wulan/Zainal/Fikri dari variabel yang sudah ada di `seed.ts` (jangan query ulang by email — variabelnya sudah ada di scope yang sama kalau blok ini ditambahkan di akhir file yang sama).
- **Idempotensi**: kalau seed dijalankan ulang (`npm run db:reset`), blok ini ikut ke-reset bareng `deleteMany` yang sudah ada di awal `seed.ts` (Kelas/Siswa/Nilai/Ujian semua kena cascade dari situ) — tidak perlu logic upsert terpisah.
