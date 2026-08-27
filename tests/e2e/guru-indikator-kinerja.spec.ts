import { test, expect } from "@playwright/test";

test.describe("Indikator kehadiran guru di Data Guru (13.19-13.20)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: badge kehadiran mengajar tampil dgn tone sesuai ambang", async ({ page }) => {
    await page.goto("/kepsek/guru");
    const kolomKehadiran = page.locator("thead th", { hasText: "Kehadiran Mengajar" });
    await expect(kolomKehadiran).toBeVisible();
    const adaBaik = await page.getByText(/Baik/).count();
    const adaCukup = await page.getByText(/Cukup/).count();
    const adaPerhatian = await page.getByText(/Perlu perhatian/).count();
    const adaKosong = await page.getByText("Data belum memadai").count();
    expect(adaBaik + adaCukup + adaPerhatian + adaKosong).toBeGreaterThan(0);
  });

  test("negatif: guru tanpa data presensi tampilkan 'Data belum memadai', bukan error", async ({ page }) => {
    await page.goto("/kepsek/guru");
    // Guru spesialis non-wali (banyak di seed) umumnya belum punya baris PresensiGuru sama sekali.
    await expect(page.getByText("Data belum memadai").first()).toBeVisible();
  });
});

test.describe("Search murid di halaman Kinerja Guru (13.18)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: search nama murid menyaring tabel Murid yang diajar", async ({ page }) => {
    await page.goto("/kepsek/guru/kinerja");
    await page.locator('a[href^="/kepsek/guru/kinerja/"]').first().click();
    await expect(page).toHaveURL(/\/kepsek\/guru\/kinerja\/.+/);

    const barisAwal = page.locator("table").last().locator("tbody tr");
    const jumlahAwal = await barisAwal.count();
    test.skip(jumlahAwal === 0, "Guru ini belum punya murid diajar di data seed saat ini");
    if (jumlahAwal === 0) return;

    const namaPertama = (await barisAwal.first().locator("td").first().textContent())?.trim() ?? "";
    const potongan = namaPertama.slice(0, 3);
    await page.fill('input[name="q"]', potongan);
    await page.getByRole("button", { name: "Cari" }).click();
    const barisSetelah = page.locator("table").last().locator("tbody tr");
    await expect(barisSetelah.first()).toContainText(potongan);
  });
});
