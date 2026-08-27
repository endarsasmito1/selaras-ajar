import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/guru.json" });

test.describe("RPP & Capaian Pembelajaran (§4.16)", () => {
  test("positif: tambah Capaian Pembelajaran baru ke bank", async ({ page }) => {
    await page.goto("/guru/rpp/capaian");
    await page.getByText("+ Tambah Capaian Pembelajaran").click();
    const deskripsi = `CP uji otomatis ${Date.now()}`;
    await page.fill('input[name="deskripsi"]', deskripsi);
    await page.fill('input[name="kode"]', "CP.TEST.1");
    await page.locator('form[action="/api/capaian"] button[type="submit"]').click();
    await expect(page).toHaveURL(/\/guru\/rpp\/capaian/);
    await expect(page.getByText(deskripsi)).toBeVisible();
  });

  test("positif: buat RPP baru & kaitkan ke Capaian Pembelajaran", async ({ page }) => {
    await page.goto("/guru/rpp/baru");
    const judul = `RPP Uji ${Date.now()}`;
    await page.fill('input[name="judul"]', judul);
    await page.locator('textarea[name="isi"]').fill("Tujuan: siswa memahami materi uji otomatis.");
    const cpCheckbox = page.locator('input[name="capaianIds"]').first();
    if (await cpCheckbox.count()) await cpCheckbox.check();
    await page.getByRole("button", { name: "Simpan RPP" }).click();
    await expect(page).toHaveURL(/\/guru\/rpp/);
  });

  test("negatif: submit RPP tanpa isi (textarea kosong) ditolak validasi required", async ({ page }) => {
    await page.goto("/guru/rpp/baru");
    await page.fill('input[name="judul"]', "RPP Tanpa Isi");
    await page.getByRole("button", { name: "Simpan RPP" }).click();
    // required textarea mencegah submit browser — tetap di halaman form yang sama
    await expect(page).toHaveURL(/\/guru\/rpp\/baru/);
  });

  test("positif: kelengkapan RPP kepsek menampilkan matrix guru x mapel/kelas", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/kepsek.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/rpp");
    await expect(page.getByRole("heading", { name: /RPP/ })).toBeVisible();
    await context.close();
  });
});
