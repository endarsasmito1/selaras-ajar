import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/guru.json" });

test.describe("Jadwal — guru tidak bisa bentrok dengan jadwalnya sendiri lintas kelas (1.10)", () => {
  test("negatif: tambah sesi di kelas B yang jamnya bentrok dengan sesi guru yang sama di kelas A ditolak", async ({ page }) => {
    // Rina mengajar Matematika di banyak kelas (4A, 4B, dst). Isi sesi di kelas pertama pada jam unik.
    await page.goto("/guru/jadwal");
    const kelasLinks = page.locator('a[href^="/guru/jadwal/"]');
    const jumlahKelas = await kelasLinks.count();
    test.skip(jumlahKelas < 2, "Guru demo perlu mengajar minimal 2 kelas untuk tes ini");

    const hrefA = await kelasLinks.nth(0).getAttribute("href");
    const hrefB = await kelasLinks.nth(1).getAttribute("href");

    await page.goto(hrefA!);
    let tambahDetails = page.locator("details", { hasText: "+ Tambah sesi" }).first();
    await tambahDetails.locator("summary").click();
    await tambahDetails.locator('input[name="jamMulai"]').fill("06:05");
    await tambahDetails.locator('input[name="jamSelesai"]').fill("06:35");
    await tambahDetails.getByRole("button", { name: "Simpan sesi" }).click();
    await expect(page).not.toHaveURL(/error=/);

    // Coba isi jam yang sama (overlap) di kelas kedua — guru yang sama, hari yang sama.
    await page.goto(hrefB!);
    tambahDetails = page.locator("details", { hasText: "+ Tambah sesi" }).first();
    await tambahDetails.locator("summary").click();
    await tambahDetails.locator('input[name="jamMulai"]').fill("06:05");
    await tambahDetails.locator('input[name="jamSelesai"]').fill("06:35");
    await tambahDetails.getByRole("button", { name: "Simpan sesi" }).click();

    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Bentrok jadwal/)).toBeVisible();
  });
});
