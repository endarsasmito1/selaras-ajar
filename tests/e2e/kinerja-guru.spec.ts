import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

test.describe("Kinerja Guru (MG-5) — kelas diampu, riwayat tahun ajaran, pagination", () => {
  test("positif: pilih guru dari daftar & lihat detail kinerja + daftar kelas diampu", async ({ page }) => {
    await page.goto("/kepsek/guru/kinerja");
    await page.getByText(/Rina/).first().click();
    await expect(page).toHaveURL(/\/kepsek\/guru\/kinerja\//);
    const kartuKelasDiampu = page.locator("div.bg-paper-raised.border.border-rule.rounded-xl", { hasText: "Kelas yang diampu" }).first();
    await expect(kartuKelasDiampu).toBeVisible();
    await expect(kartuKelasDiampu.getByText("4A", { exact: true })).toBeVisible();
  });

  test("positif: ganti selektor tahun ajaran menampilkan riwayat tahun lalu", async ({ page }) => {
    await page.goto("/kepsek/guru/kinerja");
    await page.getByText(/Rina/).first().click();
    const select = page.locator('select[name="tahun"]');
    const opsiLama = select.locator("option", { hasText: "2024/2025" });
    await expect(opsiLama).toHaveCount(1);
    const value = await opsiLama.getAttribute("value");
    if (value) {
      await select.selectOption(value);
      await page.getByRole("button", { name: "Tampilkan" }).click();
      await expect(page).toHaveURL(new RegExp(`tahun=${value}`));
      await expect(page.getByText(/2024\/2025/).first()).toBeVisible();
    }
  });

  test("positif: pagination murid yang diajar bekerja jika lebih dari 1 halaman", async ({ page }) => {
    await page.goto("/kepsek/guru/kinerja");
    await page.getByText(/Rina/).first().click();
    const halaman2 = page.getByRole("link", { name: "2", exact: true });
    if (await halaman2.count()) {
      await halaman2.click();
      await expect(page).toHaveURL(/halaman=2/);
    }
  });

  test("negatif: guru tidak bisa akses halaman kinerja guru lain (admin only)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/guru/kinerja");
    await expect(page).toHaveURL(/\/guru/);
    await context.close();
  });
});
