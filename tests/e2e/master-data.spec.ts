import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

test.describe("Master Data Kelas & Mapel (F-18)", () => {
  test("positif: tambah kelas baru muncul di daftar, dikelompokkan per tingkat", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    const nama = `9Z${Date.now() % 1000}`;
    await page.getByText("+ Tambah kelas manual").click();
    await page.fill('form[action="/api/master-data/kelas"] input[name="nama"]', nama);
    await page.fill('form[action="/api/master-data/kelas"] input[name="tingkat"]', "6");
    await page.locator('form[action="/api/master-data/kelas"] button[type="submit"]').click();
    await expect(page).toHaveURL(/kelas_dibuat/);
    await expect(page.locator("span.font-semibold", { hasText: nama })).toBeVisible();
  });

  test("negatif: tambah kelas dengan nama yang sudah ada ditolak", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    await page.getByText("+ Tambah kelas manual").click();
    await page.fill('form[action="/api/master-data/kelas"] input[name="nama"]', "5A"); // sudah ada dari seed
    await page.fill('form[action="/api/master-data/kelas"] input[name="tingkat"]', "5");
    await page.locator('form[action="/api/master-data/kelas"] button[type="submit"]').click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.locator(".bg-warning-tint")).toContainText(/sudah ada/);
  });

  test("negatif: tambah mapel tanpa nama ditolak validasi required", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    await page.getByText("+ Tambah mapel manual").click();
    await page.locator('form[action="/api/master-data/mapel"] button[type="submit"]').click();
    await expect(page).toHaveURL(/\/kepsek\/master-data$/); // tak lanjut, required mencegah submit
  });

  test("positif: edit nama kelas tersimpan", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    const details = page.locator("details", { has: page.locator('form[action="/api/master-data/kelas/update"]') }).first();
    await details.locator("summary").click();
    const namaBaru = `Edited${Date.now() % 10000}`;
    await details.locator('input[name="nama"]').fill(namaBaru);
    await details.getByRole("button", { name: "Simpan" }).click();
    await expect(page).toHaveURL(/kelas_diubah/);
  });

  test("positif: pembobotan nilai valid (total 100%) tersimpan tanpa error", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    const bobotDetails = page.locator("details", { has: page.locator('form[action="/api/nilai-config/bobot"]') }).first();
    await bobotDetails.locator("> summary").click();
    const bobotForm = bobotDetails.locator('form[action="/api/nilai-config/bobot"]');
    await bobotForm.locator('input[name="bobot_Ulangan Harian"]').fill("30");
    await bobotForm.locator('input[name="bobot_Tugas"]').fill("20");
    await bobotForm.locator('input[name="bobot_UTS"]').fill("20");
    await bobotForm.locator('input[name="bobot_UAS"]').fill("30");
    await bobotForm.getByRole("button", { name: /Simpan bobot/ }).click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: pembobotan nilai tak sama dengan 100% ditolak dengan pesan jelas", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    const bobotDetails = page.locator("details", { has: page.locator('form[action="/api/nilai-config/bobot"]') }).first();
    await bobotDetails.locator("> summary").click();
    const bobotForm = bobotDetails.locator('form[action="/api/nilai-config/bobot"]');
    await bobotForm.locator('input[name="bobot_Ulangan Harian"]').fill("10");
    await bobotForm.locator('input[name="bobot_Tugas"]').fill("10");
    await bobotForm.locator('input[name="bobot_UTS"]').fill("10");
    await bobotForm.locator('input[name="bobot_UAS"]').fill("10");
    await bobotForm.getByRole("button", { name: /Simpan bobot/ }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Total bobot harus 100/)).toBeVisible();
  });
});

test.describe("Master Data — akses (RBAC)", () => {
  test("positif: TU juga bisa kelola Master Data", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/tu.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/master-data");
    await expect(page.getByRole("heading", { name: "Master Data & Nilai" })).toBeVisible();
    await context.close();
  });

  test("negatif: guru tidak bisa POST ke /api/master-data/kelas", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const res = await context.request.post("/api/master-data/kelas", {
      form: { nama: "Coba Injeksi", tingkat: "1" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
    await context.close();
  });
});
