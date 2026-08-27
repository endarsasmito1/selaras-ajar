import { test, expect } from "@playwright/test";
import { confirmDialogSubmit } from "./helpers/ui";

test.use({ storageState: "tests/e2e/.auth/guru.json" });

test.describe("Absensi (G-1)", () => {
  test("positif: guru ubah status satu murid jadi Sakit & simpan lewat konfirmasi", async ({ page }) => {
    await page.goto("/guru/absensi");
    await expect(page.getByRole("heading", { name: /Absensi — Kelas/ })).toBeVisible();

    const firstRow = page.locator("tbody tr").first();
    // Radio-nya disembunyikan (peer hidden) — klik span berlabel yang jadi tampilan visualnya.
    await firstRow.locator('label:has(input[value="SAKIT"])').click();

    await page.getByRole("button", { name: "Simpan absensi" }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);

    // Setelah simpan, redirect balik ke halaman isi absensi & radio Sakit tetap terpilih (tersimpan).
    await expect(page).toHaveURL(/\/guru\/absensi/);
    await expect(page.locator("tbody tr").first().locator('input[type="radio"][value="SAKIT"]')).toBeChecked();
  });

  test("negatif: batal di dialog konfirmasi tidak mengirim form", async ({ page }) => {
    await page.goto("/guru/absensi");
    await page.getByRole("button", { name: "Simpan absensi" }).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Batal" }).click();
    // Tetap di halaman yang sama, tak ada navigasi terjadi.
    await expect(page).toHaveURL(/\/guru\/absensi(\?|$)/);
  });

  test("positif: tab Riwayat per hari menampilkan rekap Hadir/Sakit/Izin/Alpa", async ({ page }) => {
    await page.goto("/guru/absensi?tab=riwayat");
    await expect(page.getByText("Hadir", { exact: true })).toBeVisible();
    await expect(page.getByText("Sakit", { exact: true })).toBeVisible();
  });

  test("positif: filter riwayat per murid menampilkan riwayat lintas tanggal murid itu", async ({ page }) => {
    await page.goto("/guru/absensi?tab=riwayat");
    const select = page.locator('select[name="siswaId"]');
    const namaMurid = await select.locator("option").nth(1).textContent();
    await select.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Tampilkan" }).click();
    await expect(page.getByText("Persen hadir")).toBeVisible();
    if (namaMurid) await expect(page.locator(".font-serif.text-xl", { hasText: namaMurid.trim() })).toBeVisible();
  });
});
