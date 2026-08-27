import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/guru.json" });

test.describe("Asesmen Deskriptif (N-5)", () => {
  test("positif: guru tulis asesmen naratif untuk satu murid via popup", async ({ page }) => {
    await page.goto("/guru/nilai/asesmen");
    const isi = `Asesmen uji otomatis ${Date.now()}`;
    await page.getByRole("button", { name: "+ Nilai/Masukan" }).first().click();
    await page.locator('dialog[open] textarea[name="isi"]').fill(isi);
    await page.locator('dialog[open] button[type="submit"]').click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: submit asesmen dengan isi kosong ditolak validasi required", async ({ page }) => {
    await page.goto("/guru/nilai/asesmen");
    await page.getByRole("button", { name: "+ Nilai/Masukan" }).first().click();
    await page.locator('dialog[open] button[type="submit"]').click();
    await expect(page.locator("dialog[open]")).toBeVisible(); // required textarea cegah submit, dialog tetap terbuka
  });
});

test.describe("Projek Profil Pelajar Pancasila / P5 (N-6)", () => {
  test("positif: buat projek P5 baru dengan minimal satu dimensi", async ({ page }) => {
    await page.goto("/guru/projek/baru");
    const tema = `Projek Uji Otomatis ${Date.now()}`;
    await page.fill('input[name="tema"]', tema);
    await page.locator('input[name="dimensi"]').first().check();
    await page.getByRole("button", { name: "Simpan projek" }).click();
    await expect(page).not.toHaveURL(/error=/);
    await expect(page.getByText(tema)).toBeVisible();
  });

  test("negatif: buat projek tanpa pilih dimensi apa pun ditolak", async ({ page }) => {
    await page.goto("/guru/projek/baru");
    await page.fill('input[name="tema"]', "Projek Tanpa Dimensi");
    await page.getByRole("button", { name: "Simpan projek" }).click();
    await expect(page).toHaveURL(/error=/);
  });

  test("positif: nilai capaian P5 per dimensi per siswa (skala BB/MB/BSH/SB)", async ({ page }) => {
    await page.goto("/guru/projek");
    const link = page.locator('a[href^="/guru/projek/"]').first();
    test.skip((await link.count()) === 0, "Belum ada projek P5 di data seed");
    if ((await link.count()) === 0) return;
    await link.click();
    const select = page.locator('select[name^="capaian_"]').first();
    if (await select.count()) {
      await select.selectOption("SB");
      await page.getByRole("button", { name: "Simpan penilaian" }).click();
      await expect(page).not.toHaveURL(/error=/);
    }
  });
});
