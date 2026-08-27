import { test, expect } from "@playwright/test";

test.describe("Pengajuan Izin/Sakit (ortu ajukan, guru putuskan)", () => {
  test("positif: ortu ajukan izin baru untuk anaknya", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const page = await context.newPage();
    await page.goto("/ortu/izin");
    await page.selectOption('select[name="jenis"]', "IZIN");
    await page.fill('input[name="tanggal"]', new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
    const keterangan = `Uji otomatis izin ${Date.now()}`;
    await page.fill('textarea[name="keterangan"]', keterangan);
    await page.getByRole("button", { name: "Kirim pengajuan" }).click();
    await expect(page).toHaveURL(/\/ortu\/izin/);
    await expect(page.getByText(keterangan)).toBeVisible();
    await context.close();
  });

  test("negatif: ajukan izin tanpa keterangan ditolak validasi required", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const page = await context.newPage();
    await page.goto("/ortu/izin");
    await page.fill('input[name="tanggal"]', new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
    await page.getByRole("button", { name: "Kirim pengajuan" }).click();
    await expect(page).toHaveURL(/\/ortu\/izin/); // tetap di halaman yang sama, tak pindah
    await expect(page.locator('textarea[name="keterangan"]')).toBeVisible();
    await context.close();
  });

  test("positif: guru (wali kelas) setujui pengajuan izin yang menunggu", async ({ browser }) => {
    const ortuCtx = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const ortuPage = await ortuCtx.newPage();
    await ortuPage.goto("/ortu/izin");
    await ortuPage.selectOption('select[name="jenis"]', "SAKIT");
    await ortuPage.fill('input[name="tanggal"]', new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
    const keterangan = `Sakit uji ${Date.now()}`;
    await ortuPage.fill('textarea[name="keterangan"]', keterangan);
    await ortuPage.getByRole("button", { name: "Kirim pengajuan" }).click();
    await ortuCtx.close();

    const guruCtx = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const guruPage = await guruCtx.newPage();
    await guruPage.goto("/guru/izin");
    const row = guruPage.locator("div.bg-paper-raised.border.border-rule.rounded-xl", { hasText: keterangan }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Setujui" }).click();
    await expect(guruPage).toHaveURL(/\/guru\/izin/);
    await guruCtx.close();
  });
});

test.describe("Consent PDP (UU PDP, F-15/§5.4)", () => {
  test.use({ storageState: "tests/e2e/.auth/ortu.json" });

  test("positif: ortu berikan persetujuan (centang & simpan)", async ({ page }) => {
    await page.goto("/ortu/consent");
    const checkbox = page.locator('input[name="disetujui"]');
    if (!(await checkbox.isChecked())) await checkbox.check();
    await page.getByRole("button", { name: "Simpan pilihan" }).click();
    await expect(page.getByText("Anda sudah menyetujui")).toBeVisible();
  });

  test("negatif: ortu cabut persetujuan — status kembali jadi belum menyetujui", async ({ page }) => {
    await page.goto("/ortu/consent");
    const checkbox = page.locator('input[name="disetujui"]');
    if (await checkbox.isChecked()) await checkbox.uncheck();
    await page.getByRole("button", { name: "Simpan pilihan" }).click();
    await expect(page.getByText("Anda belum memberi persetujuan")).toBeVisible();
  });
});
