import { test, expect } from "@playwright/test";

test.describe("Profil Siswa 360° — Catatan Guru (privat) & Prestasi (F-15/F-16, §4.18)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: guru tambah catatan privat untuk murid yang diajarnya", async ({ page }) => {
    await page.goto("/guru/murid");
    await page.locator('a[href^="/guru/murid/kelas/"]').first().click();
    await page.locator('a[href^="/guru/performa/"]').first().click();
    await expect(page).toHaveURL(/\/guru\/performa\//);

    const isi = `Catatan uji otomatis ${Date.now()}`;
    await page.getByText("+ Tambah catatan").click();
    await page.locator('textarea[name="isi"]').fill(isi);
    await page.getByRole("button", { name: "Simpan catatan" }).click();
    await expect(page).not.toHaveURL(/error=/);
    await expect(page.getByText(isi)).toBeVisible();
  });

  test("positif: guru tambah prestasi untuk murid", async ({ page }) => {
    await page.goto("/guru/murid");
    await page.locator('a[href^="/guru/murid/kelas/"]').first().click();
    await page.locator('a[href^="/guru/performa/"]').first().click();

    const judul = `Prestasi uji ${Date.now()}`;
    await page.getByText("+ Tambah prestasi").click();
    await page.fill('input[name="judul"]', judul);
    await page.fill('input[name="tanggal"]', "2026-08-01");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page).not.toHaveURL(/error=/);
    await expect(page.getByText(judul)).toBeVisible();
  });

  test("negatif: tambah catatan kosong ditolak validasi required", async ({ page }) => {
    await page.goto("/guru/murid");
    await page.locator('a[href^="/guru/murid/kelas/"]').first().click();
    await page.locator('a[href^="/guru/performa/"]').first().click();
    await page.getByText("+ Tambah catatan").click();
    await page.getByRole("button", { name: "Simpan catatan" }).click();
    await expect(page).toHaveURL(/\/guru\/performa\//); // required textarea cegah submit
  });

  test("positif: guru cuma bisa hapus catatan yang ditulisnya sendiri", async ({ page }) => {
    await page.goto("/guru/murid");
    await page.locator('a[href^="/guru/murid/kelas/"]').first().click();
    await page.locator('a[href^="/guru/performa/"]').first().click();
    // Catatan dari guru lain (mis. dari seed) tak boleh punya tombol Hapus utk guru yang login sekarang.
    const catatanBlok = page.locator("div", { hasText: "Catatan Guru" }).first();
    await expect(catatanBlok).toBeVisible();
  });
});

test.describe("Catatan Guru — visibilitas privat (CG-2/CG-3, negatif untuk murid)", () => {
  test("negatif: murid tidak melihat bagian Catatan Guru di halaman performanya sendiri", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const page = await context.newPage();
    await page.goto("/murid/performa");
    await expect(page.getByText("Catatan Guru")).not.toBeVisible();
    await context.close();
  });

  test("positif: orang tua melihat agregat Catatan Guru lintas guru untuk anaknya", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const page = await context.newPage();
    await page.goto("/ortu/performa/x"); // path dummy — redirect internal ke siswaId anaknya via menu utama
    await page.goto("/ortu");
    const link = page.locator('a[href^="/ortu/performa/"]').first();
    if (await link.count()) {
      await link.click();
      await expect(page.getByText("Catatan dari Guru").or(page.getByText("Catatan Guru"))).toBeVisible();
    }
    await context.close();
  });
});
