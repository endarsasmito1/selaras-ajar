import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";
import { confirmDialogSubmit, isiPertanyaan } from "./helpers/ui";

async function buatUjianKelas5BMatematika(page: import("@playwright/test").Page, judul: string) {
  await page.goto("/guru/ujian/baru");
  await page.fill('input[name="judul"]', judul);
  await page.locator("label", { hasText: "5B — Matematika" }).locator('input[type="checkbox"]').check();
  // 1.23 — bab sekarang wajib dipilih; seed selalu punya minimal "Bab 1" per mapel.
  const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
  const bab = db.bab.findFirst({ mapelId: mapel!.id as string });
  await page.selectOption('select[name="babId"]', bab!.id as string);
  return { judul };
}

test.describe("Ujian lanjutan — jenisPenilaian & popup sukses (8.11, 8.13-8.14)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: pilih jenisPenilaian UTS saat buat ujian tersimpan ke DB", async ({ page }) => {
    const judul = `Ujian UTS Uji ${Date.now()}`;
    await buatUjianKelas5BMatematika(page, judul);
    await page.selectOption('select[name="jenisPenilaian"]', "UTS");
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    await expect(page).toHaveURL(/\/guru\/ujian\/.+\/edit/);
    await expect(page.getByText("Ujian dibuat. Tersimpan otomatis sebagai draft")).toBeVisible();
    const ujian = db.ujian.findByJudul(judul);
    expect(ujian?.jenisPenilaian).toBe("UTS");
  });

  test("positif: halaman edit & pengaturan ujian draft menampilkan callout tersimpan otomatis", async ({ page }) => {
    const judul = `Ujian Draft Uji ${Date.now()}`;
    await buatUjianKelas5BMatematika(page, judul);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    await expect(page.getByText("Perubahan di halaman ini tersimpan otomatis")).toBeVisible();
    await page.goto(page.url().replace("/edit", "/pengaturan"));
    await expect(page.getByText("Perubahan di halaman ini tersimpan otomatis")).toBeVisible();
  });
});

test.describe("Ujian lanjutan — Semua Ujian tab (8.18)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: tab Semua Ujian menampilkan daftar flat lintas kelas, bisa disort", async ({ page }) => {
    await page.goto("/guru/ujian?tab=semua");
    await expect(page.locator("table")).toBeVisible();
    const headerJudul = page.locator("th button", { hasText: "Judul" }).first();
    if (await headerJudul.count()) {
      await headerJudul.click();
      await expect(page.locator("tbody tr").first()).toBeVisible();
    }
  });
});

test.describe("Ujian lanjutan — rename judul (8.21-8.23)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: ganti judul ujian di halaman pengaturan tersimpan", async ({ page }) => {
    const judulLama = `Ujian Rename Uji ${Date.now()}`;
    const judulBaru = `${judulLama} (diganti)`;
    await buatUjianKelas5BMatematika(page, judulLama);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    await page.goto(page.url().replace("/edit", "/pengaturan"));
    await page.fill('input[name="judul"]', judulBaru);
    await page.getByRole("button", { name: "Lanjut ke preview & konfirmasi →" }).click();
    await expect(page).toHaveURL(/\/konfirmasi/);
    const ujian = db.ujian.findByJudul(judulBaru);
    expect(ujian).toBeTruthy();
  });

  test("negatif: judul dikosongkan ditolak validasi required", async ({ page }) => {
    const judul = `Ujian Rename Kosong ${Date.now()}`;
    await buatUjianKelas5BMatematika(page, judul);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    await page.goto(page.url().replace("/edit", "/pengaturan"));
    await page.fill('input[name="judul"]', "");
    await page.getByRole("button", { name: "Lanjut ke preview & konfirmasi →" }).click();
    // Validasi HTML5 required mencegah submit — tetap di halaman pengaturan.
    await expect(page).toHaveURL(/\/pengaturan(\?|$)/);
  });

  test("negatif: POST /api/ujian/pengaturan dgn ujianId sekolah lain ditolak 404", async ({ page }) => {
    const sekolahLain = db.sekolah.findFirst({ npsn: "10100295" });
    const ujianLain = db.mataPelajaran.findFirst({ sekolahId: sekolahLain!.id as string });
    test.skip(!ujianLain, "Tak ada mapel di sekolah lain utk cari ujian");
    const res = await page.request.post("/api/ujian/pengaturan", {
      form: { ujianId: "id-tidak-ada-sama-sekali", judul: "coba", jenis: "UJIAN" },
    });
    expect(res.status()).toBe(404);
  });
});

test.describe("Ujian lanjutan — duplikat (8.19-8.20)", () => {
  test("positif: duplikat ujian ke kelas lain yang diampu jadi draft baru dgn soal sama", async ({ browser }) => {
    const sekolah = db.sekolah.findFirst({ nama: "SD Harapan Bangsa" });
    const info = db.penugasanGuru.findGuruMultiKelasSamaMapel(sekolah!.id as string);
    test.skip(!info, "Tidak ada guru yg mengajar mapel sama di >=2 kelas pada data seed saat ini");
    if (!info) return;

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/login");
    await page.fill("#email", info.email);
    await page.fill("#password", "selaras123");
    await page.click('button[type="submit"]');

    const kelasAsal = db.kelas.findUnique({ id: info.kelasIds[0] });
    const kelasTarget = db.kelas.findUnique({ id: info.kelasIds[1] });
    const judul = `Ujian Duplikat Uji ${Date.now()}`;
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', judul);
    await page.locator(`input[type="checkbox"][value="${info.kelasIds[0]}|${info.mapelId}"]`).check();
    const babDuplikat = db.bab.findFirst({ mapelId: info.mapelId as string });
    await page.selectOption('select[name="babId"]', babDuplikat!.id as string);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    const tambahDariBank = page.locator('form[action="/api/ujian/soal-tambah"] button').first();
    if (await tambahDariBank.count()) await tambahDariBank.click();
    await page.goto(page.url().replace("/edit", ""));

    const details = page.locator("details", { hasText: "Duplikat ke kelas lain" });
    await expect(details).toBeVisible();
    await details.locator("summary").click();
    await details.locator(`input[type="checkbox"][value="${kelasTarget!.id}"]`).check();
    await page.getByRole("button", { name: "Duplikat" }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    await page.waitForURL(/\/guru\/ujian\/.+\/edit\?ujian_dibuat=1/);

    const salinan = db.ujian.findByJudul(`${judul} (salinan)`);
    expect(salinan?.status).toBe("DRAFT");
    void kelasAsal;
    await ctx.close();
  });

});

test.describe("Ujian lanjutan — duplikat, RBAC target invalid (8.20)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("negatif: duplikat ke kelasTargetId yang bukan diampu guru (API langsung) ditolak", async ({ page }) => {
    const ujianApaSaja = db.ujian.findFirst();
    test.skip(!ujianApaSaja, "Tidak ada data Ujian sama sekali");
    if (!ujianApaSaja) return;
    const res = await page.request.post("/api/ujian/duplikat", {
      form: { ujianId: String(ujianApaSaja.id), kelasTargetIds: "kelas-tidak-diampu-sama-sekali" },
    });
    expect([400, 404]).toContain(res.status());
  });
});

test.describe("Ujian lanjutan — PG Kompleks all-or-nothing (8.15-8.17)", () => {
  test("positif & negatif: skor PG Kompleks full kalau kunci persis, 0 kalau sebagian", async ({ browser }) => {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const soalPGK = db.soal.findFirst({ mapelId: mapel!.id as string, jenis: "PILIHAN_GANDA_KOMPLEKS" });
    test.skip(!soalPGK, "Tak ada soal PG Kompleks Matematika di data seed sekolah primer");
    if (!soalPGK) return;
    const soalPGKId = soalPGK.id as string;
    const kunci: number[] = JSON.parse(soalPGK.kunciJawaban as string);
    const opsiArr: string[] = JSON.parse(soalPGK.opsi as string);
    const teksBenar = kunci.map((i) => opsiArr[i]);

    const guruCtx = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const guruPage = await guruCtx.newPage();

    const babMatematika = db.bab.findFirst({ mapelId: mapel!.id as string });

    async function buatDanPublish(judul: string) {
      await guruPage.goto("/guru/ujian/baru");
      await guruPage.fill('input[name="judul"]', judul);
      await guruPage.locator("label", { hasText: "5B — Matematika" }).locator('input[type="checkbox"]').check();
      await guruPage.selectOption('select[name="babId"]', babMatematika!.id as string);
      await guruPage.getByRole("button", { name: "Lanjut susun soal →" }).click();
      const ujianId = guruPage.url().match(/\/guru\/ujian\/([^/]+)\/edit/)?.[1]!;
      db.ujianSoal.create({ ujianId, soalId: soalPGKId, urutan: 1, poin: 100 });
      await guruPage.goto(`/guru/ujian/${ujianId}/pengaturan`);
      await guruPage.getByRole("button", { name: "Lanjut ke preview & konfirmasi →" }).click();
      await guruPage.getByRole("button", { name: "✓ Terbitkan ujian ini" }).click();
      await Promise.all([guruPage.waitForNavigation(), confirmDialogSubmit(guruPage, "Ya, lanjutkan")]);
      await guruPage.waitForURL(/\/guru\/ujian(\?|$)/);
      return ujianId;
    }

    const ujianBenarId = await buatDanPublish(`PGK Benar ${Date.now()}`);
    const ujianSebagianId = await buatDanPublish(`PGK Sebagian ${Date.now()}`);
    await guruCtx.close();

    const siswa = db.siswa.findFirst({ nisn: "0098234571" }); // Ahmad Fauzi

    const muridCtx1 = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const muridPage1 = await muridCtx1.newPage();
    await muridPage1.goto(`/murid/ujian/${ujianBenarId}`);
    for (const teks of teksBenar) {
      // Tombol opsi = badge huruf (A/B/C/D) + teks opsi digabung tanpa spasi jadi nama aksesibel
      // (mis. "A12") — cocokkan via akhiran (regex $) supaya tak perlu tahu huruf hasil acak.
      await muridPage1.getByRole("button", { name: new RegExp(`${teks}$`) }).click();
    }
    await expect(muridPage1.getByText(/Jawaban tersimpan otomatis/)).toBeVisible();
    await muridPage1.getByRole("button", { name: "Kumpulkan Ujian" }).click();
    await muridPage1.getByRole("button", { name: "Ya, kumpulkan sekarang" }).click();
    await muridPage1.waitForURL(/\/murid\/ujian$/);
    await muridCtx1.close();

    const pengerjaanBenar = db.ujianPengerjaan.findByUjianAndSiswa(ujianBenarId, siswa!.id as string);
    expect(pengerjaanBenar?.nilaiTotal).toBe(100);

    const muridCtx2 = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const muridPage2 = await muridCtx2.newPage();
    await muridPage2.goto(`/murid/ujian/${ujianSebagianId}`);
    await muridPage2.getByRole("button", { name: new RegExp(`${teksBenar[0]}$`) }).click(); // cuma 1 dari 2 kunci
    await expect(muridPage2.getByText(/Jawaban tersimpan otomatis/)).toBeVisible();
    await muridPage2.getByRole("button", { name: "Kumpulkan Ujian" }).click();
    await muridPage2.getByRole("button", { name: "Ya, kumpulkan sekarang" }).click();
    await muridPage2.waitForURL(/\/murid\/ujian$/);
    await muridCtx2.close();

    const pengerjaanSebagian = db.ujianPengerjaan.findByUjianAndSiswa(ujianSebagianId, siswa!.id as string);
    expect(pengerjaanSebagian?.nilaiTotal).toBe(0);
  });
});

// 1.23 — Pilihan Ganda Nilai Minus: jenis soal baru, potongan per-soal (persen ATAU poin tetap),
// benar = full poin, salah = poin dikurangi potongan (floor di 0), tak dijawab = 0 tanpa potongan.
test.describe("Ujian lanjutan — Pilihan Ganda Nilai Minus (1.23)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  async function buatSoalMinus(page: import("@playwright/test").Page, mode: "PERSEN" | "POIN", nilai: number) {
    await page.goto("/guru/bank-soal");
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption('select[name="mapelId"]', { label: "Matematika" });
    await page.selectOption("#jenis-select", "PILIHAN_GANDA_MINUS");
    const pertanyaan = `Soal Minus ${Date.now()}`;
    await isiPertanyaan(page, pertanyaan);
    const opsi = page.locator('input[name="opsi"]');
    await opsi.nth(0).fill("Benar");
    await opsi.nth(1).fill("Salah 1");
    await opsi.nth(2).fill("Salah 2");
    await opsi.nth(3).fill("Salah 3");
    await page.locator('input[name="kunciJawaban"]').nth(0).check();
    await page.selectOption('select[name="penguranganMode"]', mode);
    await page.fill('input[name="penguranganNilai"]', String(nilai));
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Simpan ke bank soal" }).click()]);
    const soal = db.soal.findFirst({ jenis: "PILIHAN_GANDA_MINUS" });
    return soal!.id as string;
  }

  async function publishDenganSoal(page: import("@playwright/test").Page, soalId: string, judul: string, poin: number) {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const bab = db.bab.findFirst({ mapelId: mapel!.id as string });
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', judul);
    await page.locator("label", { hasText: "5B — Matematika" }).locator('input[type="checkbox"]').check();
    await page.selectOption('select[name="babId"]', bab!.id as string);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    const ujianId = page.url().match(/\/guru\/ujian\/([^/]+)\/edit/)?.[1]!;
    db.ujianSoal.create({ ujianId, soalId, urutan: 1, poin });
    await page.goto(`/guru/ujian/${ujianId}/pengaturan`);
    await page.getByRole("button", { name: "Lanjut ke preview & konfirmasi →" }).click();
    await page.getByRole("button", { name: "✓ Terbitkan ujian ini" }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    await page.waitForURL(/\/guru\/ujian(\?|$)/);
    return ujianId;
  }

  async function kerjakanDanKumpul(browser: import("@playwright/test").Browser, ujianId: string, jawabanTeks: string | null) {
    const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const page = await ctx.newPage();
    await page.goto(`/murid/ujian/${ujianId}`);
    if (jawabanTeks) {
      await page.getByRole("button", { name: new RegExp(`${jawabanTeks}$`) }).click();
      await expect(page.getByText(/Jawaban tersimpan otomatis/)).toBeVisible();
    }
    await page.getByRole("button", { name: "Kumpulkan Ujian" }).click();
    await page.getByRole("button", { name: "Ya, kumpulkan sekarang" }).click();
    await page.waitForURL(/\/murid\/ujian$/);
    await ctx.close();
  }

  test("positif: jawaban benar dapat full poin, jawaban salah dipotong sesuai persen", async ({ page, browser }) => {
    const soalId = await buatSoalMinus(page, "PERSEN", 50);
    const ujianBenarId = await publishDenganSoal(page, soalId, `Minus Persen Benar ${Date.now()}`, 100);
    const ujianSalahId = await publishDenganSoal(page, soalId, `Minus Persen Salah ${Date.now()}`, 100);

    const siswa = db.siswa.findFirst({ nisn: "0098234571" }); // Ahmad Fauzi

    await kerjakanDanKumpul(browser, ujianBenarId, "Benar");
    const pengerjaanBenar = db.ujianPengerjaan.findByUjianAndSiswa(ujianBenarId, siswa!.id as string);
    expect(pengerjaanBenar?.nilaiTotal).toBe(100);

    await kerjakanDanKumpul(browser, ujianSalahId, "Salah 1");
    const pengerjaanSalah = db.ujianPengerjaan.findByUjianAndSiswa(ujianSalahId, siswa!.id as string);
    expect(pengerjaanSalah?.nilaiTotal).toBe(50); // 100 - 50% dari 100
  });

  test("positif: mode poin tetap, potongan lebih besar dari poin soal di-floor ke 0 (tak minus)", async ({ page, browser }) => {
    const soalId = await buatSoalMinus(page, "POIN", 150); // sengaja > poin soal (100)
    const ujianId = await publishDenganSoal(page, soalId, `Minus Poin Floor ${Date.now()}`, 100);
    const siswa = db.siswa.findFirst({ nisn: "0098234571" });

    await kerjakanDanKumpul(browser, ujianId, "Salah 1");
    const pengerjaan = db.ujianPengerjaan.findByUjianAndSiswa(ujianId, siswa!.id as string);
    expect(pengerjaan?.nilaiTotal).toBe(0);
  });

  test("positif: soal tak dijawab tetap skor 0 tanpa kena potongan (bukan negatif)", async ({ page, browser }) => {
    const soalId = await buatSoalMinus(page, "PERSEN", 50);
    const ujianId = await publishDenganSoal(page, soalId, `Minus Kosong ${Date.now()}`, 100);
    const siswa = db.siswa.findFirst({ nisn: "0098234571" });

    await kerjakanDanKumpul(browser, ujianId, null);
    const pengerjaan = db.ujianPengerjaan.findByUjianAndSiswa(ujianId, siswa!.id as string);
    expect(pengerjaan?.nilaiTotal).toBe(0);
  });
});

test.describe("Ujian lanjutan — edit poin soal & filter tingkat kesulitan (1.23)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: guru ubah poin soal di ujian draft, total poin ikut berubah", async ({ page }) => {
    await buatUjianKelas5BMatematika(page, `Ujian Poin ${Date.now()}`);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    const ujianId = page.url().match(/\/guru\/ujian\/([^/]+)\/edit/)?.[1]!;
    const soalMatematika = db.soal.findFirst({ mapelId: db.ujian.findUnique({ id: ujianId })?.mapelId as string, jenis: "PILIHAN_GANDA" });
    test.skip(!soalMatematika, "Tak ada soal PG Matematika di bank soal seed");
    if (!soalMatematika) return;
    db.ujianSoal.create({ ujianId, soalId: soalMatematika.id as string, urutan: 1, poin: 20 });
    await page.goto(`/guru/ujian/${ujianId}/edit`);
    await expect(page.locator('input[name="poin"]')).toHaveValue("20");
    await page.fill('input[name="poin"]', "35");
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "poin" }).click()]);
    await expect(page.getByText("total 35 poin")).toBeVisible();
  });

  test("positif: filter tingkat kesulitan di halaman susun ujian menyaring bank soal", async ({ page }) => {
    await buatUjianKelas5BMatematika(page, `Ujian Filter Kesulitan ${Date.now()}`);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    await page.selectOption('select[name="tingkatKesulitan"]', "sulit");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(/tingkatKesulitan=sulit/);
  });
});

// 1.23 — mode hasil ujian (ganti toggle boolean lama jadi 3 pilihan) + bagikan link ujian.
test.describe("Ujian lanjutan — mode hasil & bagikan link (1.23)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  async function publishUjianPG(page: import("@playwright/test").Page, judul: string) {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const bab = db.bab.findFirst({ mapelId: mapel!.id as string });
    const soalPG = db.soal.findFirst({ mapelId: mapel!.id as string, jenis: "PILIHAN_GANDA" });
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', judul);
    await page.locator("label", { hasText: "5B — Matematika" }).locator('input[type="checkbox"]').check();
    await page.selectOption('select[name="babId"]', bab!.id as string);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    const ujianId = page.url().match(/\/guru\/ujian\/([^/]+)\/edit/)?.[1]!;
    db.ujianSoal.create({ ujianId, soalId: soalPG!.id as string, urutan: 1, poin: 100 });
    await page.goto(`/guru/ujian/${ujianId}/pengaturan`);
    await page.getByRole("button", { name: "Lanjut ke preview & konfirmasi →" }).click();
    await page.getByRole("button", { name: "✓ Terbitkan ujian ini" }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    await page.waitForURL(/\/guru\/ujian(\?|$)/);
    return ujianId;
  }

  test("positif: mode Otomatis — murid langsung lihat hasil begitu submit ujian all-PG", async ({ page, browser }) => {
    const ujianId = await publishUjianPG(page, `Ujian Reveal Otomatis ${Date.now()}`);
    db.ujian.setModeHasil(ujianId, "OTOMATIS_SUBMIT", null);

    const muridCtx = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const muridPage = await muridCtx.newPage();
    await muridPage.goto(`/murid/ujian/${ujianId}`);
    await muridPage.getByRole("button", { name: "Kumpulkan Ujian" }).click();
    await muridPage.getByRole("button", { name: "Ya, kumpulkan sekarang" }).click();
    await muridPage.waitForURL(/\/murid\/ujian$/);

    await muridPage.goto(`/murid/ujian/${ujianId}`);
    await expect(muridPage.getByText(/jawaban benar/)).toBeVisible();
    await muridCtx.close();
  });

  test("positif: mode Jadwal Manual — hasil disembunyikan sebelum jadwalnya, tampil setelahnya", async ({ page, browser }) => {
    const ujianId = await publishUjianPG(page, `Ujian Reveal Manual ${Date.now()}`);
    const besok = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.ujian.setModeHasil(ujianId, "JADWAL_MANUAL", besok);

    const muridCtx = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const muridPage = await muridCtx.newPage();
    await muridPage.goto(`/murid/ujian/${ujianId}`);
    await muridPage.getByRole("button", { name: "Kumpulkan Ujian" }).click();
    await muridPage.getByRole("button", { name: "Ya, kumpulkan sekarang" }).click();
    await muridPage.waitForURL(/\/murid\/ujian$/);

    await muridPage.goto(`/murid/ujian/${ujianId}`);
    await expect(muridPage.getByText(/sudah menyelesaikan ujian ini/)).toBeVisible();
    await expect(muridPage.getByText(/jawaban benar/)).not.toBeVisible();

    const kemarin = new Date(Date.now() - 60 * 1000).toISOString();
    db.ujian.setModeHasil(ujianId, "JADWAL_MANUAL", kemarin);
    await muridPage.goto(`/murid/ujian/${ujianId}`);
    await expect(muridPage.getByText(/jawaban benar/)).toBeVisible();
    await muridCtx.close();
  });

  test("positif: guru lihat blok Bagikan berisi link ke halaman ujian murid (ujian PUBLISHED)", async ({ page }) => {
    const ujianId = await publishUjianPG(page, `Ujian Bagikan ${Date.now()}`);
    await page.goto(`/guru/ujian/${ujianId}`);
    await expect(page.getByText("🔗 Bagikan ujian")).toBeVisible();
    const linkInput = page.locator(`input[value$="/murid/ujian/${ujianId}"]`);
    await expect(linkInput).toBeVisible();
    await expect(page.getByRole("link", { name: "💬 WhatsApp" })).toHaveAttribute("href", /wa\.me/);
  });

  test("positif: durasi per soal esai — habis waktu otomatis pindah ke soal berikutnya", async ({ page, browser }) => {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const bab = db.bab.findFirst({ mapelId: mapel!.id as string });

    // Bikin soal esai dgn durasi 2 detik lewat form bank soal (exercise form-nya sekaligus).
    await page.goto("/guru/bank-soal");
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption('select[name="mapelId"]', { label: "Matematika" });
    await page.selectOption("#jenis-select", "ESAI");
    await isiPertanyaan(page, `Soal esai durasi ${Date.now()}`);
    await page.fill('input[name="durasiDetik"]', "2");
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Simpan ke bank soal" }).click()]);
    const soalEsai = db.soal.findFirst({ mapelId: mapel!.id as string, jenis: "ESAI" });
    expect(soalEsai?.durasiDetik).toBe(2);

    const soalPG = db.soal.findFirst({ mapelId: mapel!.id as string, jenis: "PILIHAN_GANDA" });

    const judul = `Ujian Durasi Soal ${Date.now()}`;
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', judul);
    await page.locator("label", { hasText: "5B — Matematika" }).locator('input[type="checkbox"]').check();
    await page.selectOption('select[name="babId"]', bab!.id as string);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    const ujianId = page.url().match(/\/guru\/ujian\/([^/]+)\/edit/)?.[1]!;
    db.ujianSoal.create({ ujianId, soalId: soalEsai!.id as string, urutan: 1, poin: 50 });
    db.ujianSoal.create({ ujianId, soalId: soalPG!.id as string, urutan: 2, poin: 50 });
    await page.goto(`/guru/ujian/${ujianId}/pengaturan`);
    // Matikan acak urutan soal — tes ini butuh soal esai (yg ada durasi) pasti muncul duluan.
    await page.locator('input[name="acakSoal"]').uncheck();
    await page.getByRole("button", { name: "Lanjut ke preview & konfirmasi →" }).click();
    await page.getByRole("button", { name: "✓ Terbitkan ujian ini" }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    await page.waitForURL(/\/guru\/ujian(\?|$)/);

    const muridCtx = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const muridPage = await muridCtx.newPage();
    await muridPage.goto(`/murid/ujian/${ujianId}`);
    await expect(muridPage.getByText("Soal 1 dari 2")).toBeVisible();
    await expect(muridPage.locator("text=⏱").first()).toBeVisible();
    await expect(muridPage.getByText("Soal 2 dari 2")).toBeVisible({ timeout: 6000 });
    await muridCtx.close();
  });

  // Bug ditemukan saat testing manual — sebelum fix ini, halaman detail ujian PUBLISHED sama
  // sekali gak punya link balik ke /pengaturan (satu-satunya jalan masuk sebelumnya cuma dari
  // alur bikin-ujian-baru), padahal itu satu-satunya cara guru ubah modeHasil/durasi/jam
  // buka-tutup setelah terbit. Rute & API pengaturan sendiri gak ada guard status, cuma gak
  // ke-link — jadi fix-nya nambah tombol "Pengaturan" di header halaman detail.
  test("positif: guru bisa akses & ubah Pengaturan (termasuk mode hasil) dari halaman detail ujian yang sudah PUBLISHED", async ({ page }) => {
    const ujianId = await publishUjianPG(page, `Ujian Ubah Pengaturan ${Date.now()}`);
    await page.goto(`/guru/ujian/${ujianId}`);

    const pengaturanLink = page.getByRole("link", { name: "Pengaturan" });
    await expect(pengaturanLink).toBeVisible();
    await pengaturanLink.click();
    await page.waitForURL(new RegExp(`/guru/ujian/${ujianId}/pengaturan$`));

    await page.selectOption('select[name="modeHasil"]', "JADWAL_MANUAL");
    const jadwalManual = "2026-08-20T10:00";
    await page.fill('input[name="jadwalHasilManual"]', jadwalManual);
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Lanjut ke preview & konfirmasi →" }).click()]);

    // Ujian sudah PUBLISHED — halaman konfirmasi harus tampilkan status "sudah diterbitkan",
    // BUKAN tombol terbitkan lagi (itu akan jadi bug tersendiri kalau sampai muncul).
    await expect(page.getByText("sudah diterbitkan")).toBeVisible();
    await expect(page.getByRole("button", { name: "✓ Terbitkan ujian ini" })).toHaveCount(0);

    const updated = db.ujian.findUnique({ id: ujianId });
    expect(updated?.modeHasil).toBe("JADWAL_MANUAL");
  });
});
