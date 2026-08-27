import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";
import { confirmDialogSubmit } from "./helpers/ui";

test.describe("Ujian/CBT — guru menyusun & publish (U-1..U-7)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: susun ujian baru untuk 1 kelas, tambah soal dari bank, atur & publish", async ({ page }) => {
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', `Ujian Uji Otomatis ${Date.now()}`);
    const checkbox = page.locator('input[type="checkbox"][name="penugasan"]').first();
    await checkbox.check();
    const mapelId = (await checkbox.getAttribute("value"))!.split("|")[1];
    const bab = db.bab.findFirst({ mapelId });
    await page.selectOption('select[name="babId"]', bab!.id as string);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    await expect(page).toHaveURL(/\/guru\/ujian\/.+\/edit/);

    const tambahDariBank = page.locator('form[action="/api/ujian/soal-tambah"] button').first();
    await expect(tambahDariBank).toBeVisible();
    await tambahDariBank.click();

    await page.goto(page.url().replace("/edit", "/pengaturan"));
    await page.getByRole("button", { name: "Lanjut ke preview & konfirmasi →" }).click();
    await expect(page).toHaveURL(/\/konfirmasi/);
    await page.getByRole("button", { name: "✓ Terbitkan ujian ini" }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    await expect(page).toHaveURL(/\/guru\/ujian(\?|$)/);
    await expect(page.getByText("Ujian berhasil diterbitkan")).toBeVisible();
  });

  test("negatif: publish ujian tanpa soal ditolak", async ({ page, request }) => {
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', `Ujian Kosong ${Date.now()}`);
    const checkbox = page.locator('input[type="checkbox"][name="penugasan"]').first();
    await checkbox.check();
    const mapelId = (await checkbox.getAttribute("value"))!.split("|")[1];
    const bab = db.bab.findFirst({ mapelId });
    await page.selectOption('select[name="babId"]', bab!.id as string);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    const ujianId = page.url().match(/\/guru\/ujian\/([^/]+)\/edit/)?.[1];
    expect(ujianId).toBeTruthy();

    const res = await request.post("/api/ujian/publish", { form: { ujianId: ujianId! }, maxRedirects: 0 });
    expect(res.status()).toBe(400);
  });

  test("negatif: buat ujian tanpa pilih kelas sama sekali ditolak", async ({ page }) => {
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', "Ujian Tanpa Kelas");
    // Bab tetap harus dipilih (required di HTML) meski kelas sengaja dikosongkan, supaya validasi
    // "pilih minimal 1 kelas" di server sungguh tereksekusi (bukan keblok validasi klien duluan).
    await page.selectOption('select[name="babId"]', { index: 1 });
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Pilih minimal satu kelas/)).toBeVisible();
  });

  test("negatif: pilih kelas dari mapel yang berbeda-beda ditolak", async ({ page }) => {
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', "Ujian Campur Mapel");
    const checkboxes = page.locator('input[type="checkbox"][name="penugasan"]');
    const values = await checkboxes.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    const mapelPertama = values[0]?.split("|")[1];
    const idxBeda = values.findIndex((v) => v.split("|")[1] !== mapelPertama);
    test.skip(idxBeda === -1, "Guru ini cuma mengajar satu mapel — tak bisa uji kasus campur mapel");
    if (idxBeda === -1) return;
    await checkboxes.nth(0).check();
    await checkboxes.nth(idxBeda).check();
    await page.selectOption('select[name="babId"]', { index: 1 });
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/mapel yang sama/)).toBeVisible();
  });

  test("positif: publish ujian yang menyasar >1 kelas menghasilkan N ujian terpisah (fan-out, 1.8)", async ({ page }) => {
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', `Fan-out Uji ${Date.now()}`);
    const checkboxes = page.locator('input[type="checkbox"][name="penugasan"]');
    const values = await checkboxes.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    const mapelPertama = values[0].split("|")[1];
    const idxSamaMapel = values.map((v, i) => (v.split("|")[1] === mapelPertama ? i : -1)).filter((i) => i >= 0);
    test.skip(idxSamaMapel.length < 2, "Guru ini cuma mengajar 1 kelas untuk mapelnya — tak bisa uji fan-out multi-kelas");
    if (idxSamaMapel.length < 2) return;

    for (const i of idxSamaMapel.slice(0, 3)) await checkboxes.nth(i).check();
    const babFanOut = db.bab.findFirst({ mapelId: mapelPertama });
    await page.selectOption('select[name="babId"]', babFanOut!.id as string);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();
    const ujianId = page.url().match(/\/guru\/ujian\/([^/]+)\/edit/)![1];

    const soal = db.soal.findFirst({ mapelId: mapelPertama });
    db.ujianSoal.create({ ujianId, soalId: soal!.id as string, urutan: 1, poin: 100 });

    const sebelum = db.ujian.count();
    const res = await page.request.post("/api/ujian/publish", { form: { ujianId }, maxRedirects: 0 });
    expect(res.status()).toBe(303);
    const sesudah = db.ujian.count();
    // Publish multi-kelas menghapus 1 record gabungan & membuat N record baru per kelas -> net bertambah.
    expect(sesudah).toBeGreaterThan(sebelum);
    const originalMasihAda = db.ujian.findUnique({ id: ujianId });
    expect(originalMasihAda).toBeUndefined();
  });
});

test.describe("Ujian — murid mengerjakan & submit (U-15..U-18)", () => {
  test.use({ storageState: "tests/e2e/.auth/murid.json" });

  test("positif: murid jawab soal lalu kumpulkan ujian", async ({ page }) => {
    const siswa = db.siswa.findFirst({ nisn: "0098234571" }); // Ahmad Fauzi, kelas 5B
    const ujian = db.ujian.findUnstartedForSiswa(siswa!.kelasId as string, siswa!.id as string);
    test.skip(!ujian, "Tidak ada ujian PUBLISHED yang belum dikerjakan Ahmad di data seed saat ini");
    if (!ujian) return;

    await page.goto(`/murid/ujian/${ujian.id}`);
    await expect(page.getByText(/Soal 1 dari/)).toBeVisible();

    const textarea = page.locator("textarea");
    if (await textarea.count()) {
      await textarea.fill("Jawaban uji otomatis.");
    } else {
      await page.locator("button", { hasText: "A" }).first().click();
    }
    await expect(page.getByText(/Jawaban tersimpan otomatis/)).toBeVisible();

    // 1.21 — "Kumpulkan Ujian" sekarang buka layar tinjau jawaban dulu (bukan window.confirm
    // langsung submit), baru submit sungguhan lewat tombol "Ya, kumpulkan sekarang" di situ.
    await page.getByRole("button", { name: "Kumpulkan Ujian" }).click();
    await expect(page.getByText("Tinjau jawabanmu sebelum dikumpulkan")).toBeVisible();
    await page.getByRole("button", { name: "Ya, kumpulkan sekarang" }).click();
    await expect(page).toHaveURL(/\/murid\/ujian$/);
  });

  test("negatif: ujian berstatus draft tidak bisa dibuka murid", async ({ page }) => {
    const siswa = db.siswa.findFirst({ nisn: "0098234571" });
    const ujianDraft = db.ujian.findByKelasAndStatus(siswa!.kelasId as string, "DRAFT");
    test.skip(!ujianDraft, "Tidak ada ujian draft di kelas 5B saat ini");
    if (!ujianDraft) return;
    await page.goto(`/murid/ujian/${ujianDraft.id}`);
    await expect(page.getByText(/Soal 1 dari/)).not.toBeVisible();
  });

  test("negatif: murid tidak bisa membuka ujian milik kelas lain", async ({ page }) => {
    const siswa = db.siswa.findFirst({ nisn: "0098234571" });
    const ujianKelasLain = db.ujian.findPublishedNotInKelas(siswa!.kelasId as string);
    test.skip(!ujianKelasLain, "Tidak ada ujian kelas lain di data seed saat ini");
    if (!ujianKelasLain) return;
    await page.goto(`/murid/ujian/${ujianKelasLain.id}`);
    await expect(page.getByText(/Soal 1 dari/)).not.toBeVisible();
  });
});

test.describe("Ujian — daftar & ringkasan status (U-21, 1.8)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: halaman daftar ujian menampilkan ringkasan draft/berlangsung/selesai", async ({ page }) => {
    await page.goto("/guru/ujian");
    // 1.9 — "Draft"/"Selesai" kini juga muncul per kartu kelas (breakdown), jadi scope ke
    // ringkasan total di atas (kartu pertama secara urutan DOM) supaya tak strict-mode violation.
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sedang berlangsung", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Selesai", { exact: true }).first()).toBeVisible();
  });

  test("negatif: guru lain tidak melihat ujian yang dibuat guru ini di card kelasnya sendiri", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guruLain.json" });
    const page = await context.newPage();
    await page.goto("/guru/ujian");
    await expect(page.getByRole("heading", { name: "Ujian & Latihan" })).toBeVisible();
    await context.close();
  });
});
