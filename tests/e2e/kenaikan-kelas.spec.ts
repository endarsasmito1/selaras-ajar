import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

// Catatan: langkah "Jalankan Kenaikan Kelas" (finalisasi) sengaja TIDAK dieksekusi di suite ini —
// itu memutasi status aktif/kelas SEMUA siswa sekolah secara permanen & akan merusak data yang
// dipakai test lain di sesi jalan yang sama (suite ini pakai satu DB seed bersama, workers:1).
// Cakupan di sini: alur persiapan (mulai draft, tinjau, tambah rombel) + validasi — bukan eksekusi akhir.
test.describe("Kenaikan Kelas (F-2) — persiapan & validasi", () => {
  test("positif: mulai draft kenaikan kelas dengan label tahun ajaran baru", async ({ page }) => {
    await page.goto("/kepsek/tahun-ajaran/kenaikan-kelas");
    const label = `20${30 + (Date.now() % 10)}/20${31 + (Date.now() % 10)}`;
    await page.fill('input[name="label"]', label);
    await page.fill('input[name="mulai"]', "2030-07-14");
    await page.fill('input[name="selesai"]', "2030-12-19");
    await page.getByRole("button", { name: "Lanjut ke peninjauan rombel tujuan →" }).click();
    await expect(page).toHaveURL(/\/kepsek\/tahun-ajaran\/kenaikan-kelas\//);
    await expect(page.getByText("✓ Jalankan Kenaikan Kelas")).toBeVisible();
  });

  test("negatif: mulai draft tanpa label ditolak validasi required", async ({ page }) => {
    await page.goto("/kepsek/tahun-ajaran/kenaikan-kelas");
    await page.fill('input[name="mulai"]', "2031-07-14");
    await page.fill('input[name="selesai"]', "2031-12-19");
    await page.getByRole("button", { name: "Lanjut ke peninjauan rombel tujuan →" }).click();
    await expect(page).toHaveURL(/\/kepsek\/tahun-ajaran\/kenaikan-kelas$/);
  });

  test("positif: di halaman tinjau, tambah rombel tujuan tambahan untuk kelas asal", async ({ page }) => {
    await page.goto("/kepsek/tahun-ajaran/kenaikan-kelas");
    const label = `20${40 + (Date.now() % 5)}/20${41 + (Date.now() % 5)}`;
    await page.fill('input[name="label"]', label);
    await page.fill('input[name="mulai"]', "2040-07-14");
    await page.fill('input[name="selesai"]', "2040-12-19");
    await page.getByRole("button", { name: "Lanjut ke peninjauan rombel tujuan →" }).click();

    // 1.20 — input/tombol "Tambah rombel" terhubung ke form tersembunyi di luar <details> lewat
    // atribut HTML5 form="..." (bukan <form> nested lagi, supaya tak melanggar aturan "<form>
    // tak boleh berisi <form>"), jadi di-select via input `name="nama"` di dalamnya, bukan <form>.
    const tambahDetails = page.locator("details").filter({ has: page.locator('input[name="nama"]') }).first();
    await tambahDetails.locator("> summary").click();
    await tambahDetails.locator('input[name="nama"]').fill(`ZZ${Date.now() % 1000}`);
    await Promise.all([
      page.waitForNavigation(),
      tambahDetails.getByRole("button", { name: "Tambah" }).click(),
    ]);
    await expect(page).not.toHaveURL(/error=/);
  });

  test("positif: setiap siswa punya dropdown target rombel & opsi Lulus/Pindah", async ({ page }) => {
    await page.goto("/kepsek/tahun-ajaran/kenaikan-kelas");
    const label = `20${50 + (Date.now() % 5)}/20${51 + (Date.now() % 5)}`;
    await page.fill('input[name="label"]', label);
    await page.fill('input[name="mulai"]', "2050-07-14");
    await page.fill('input[name="selesai"]', "2050-12-19");
    await page.getByRole("button", { name: "Lanjut ke peninjauan rombel tujuan →" }).click();

    const selectPertama = page.locator('select[name^="target_"]').first();
    await expect(selectPertama).toBeVisible();
    await expect(selectPertama.locator("option", { hasText: "Lulus" })).toHaveCount(1);
    await expect(selectPertama.locator("option", { hasText: "Pindah" })).toHaveCount(1);
  });
});

test.describe("Kenaikan Kelas — RBAC", () => {
  test("negatif: guru tidak bisa akses halaman kenaikan kelas", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/tahun-ajaran/kenaikan-kelas");
    await expect(page).toHaveURL(/\/guru/);
    await context.close();
  });
});
