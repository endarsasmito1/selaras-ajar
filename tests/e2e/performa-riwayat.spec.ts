import { test, expect } from "@playwright/test";

test.describe("Performa Siswa — kartu ringkasan bisa diklik (D-2, 1.9)", () => {
  test.use({ storageState: "tests/e2e/.auth/murid.json" });

  test("positif: klik kartu Kehadiran membuka riwayat kehadiran", async ({ page }) => {
    await page.goto("/murid/performa");
    await page.getByText("Kehadiran", { exact: true }).first().click();
    await expect(page).toHaveURL(/\/murid\/kehadiran/);
    await expect(page.getByText("Persen hadir")).toBeVisible();
  });

  test("positif: klik kartu Tugas selesai membuka daftar tugas", async ({ page }) => {
    await page.goto("/murid/performa");
    await page.getByText("Tugas selesai", { exact: true }).click();
    await expect(page).toHaveURL(/\/murid\/tugas$/);
  });

  test("positif: klik kartu Ujian diikuti membuka daftar ujian", async ({ page }) => {
    await page.goto("/murid/performa");
    await page.getByText("Ujian diikuti", { exact: true }).click();
    await expect(page).toHaveURL(/\/murid\/ujian$/);
  });
});

test.describe("Riwayat Kehadiran — akses lintas peran (1.9)", () => {
  test("negatif: ortu tidak bisa lihat riwayat kehadiran anak orang lain", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const page = await context.newPage();
    await page.goto("/ortu/performa/id-siswa-acak-bukan-anak-sendiri/kehadiran");
    await expect(page.getByText(/bukan milik anak Anda/)).toBeVisible();
    await context.close();
  });
});
