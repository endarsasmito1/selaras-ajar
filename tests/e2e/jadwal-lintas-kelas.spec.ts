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
    // Feedback teknis (Sep 2026) — form tambah sesi sekarang <Drawer> (native <dialog>), bukan
    // <details>/<summary> lagi — trigger di-klik dulu, lalu interaksi discope ke `dialog[open]`.
    await page.getByText("+ Tambah sesi", { exact: true }).first().click();
    let dialog = page.locator("dialog[open]");
    await dialog.locator('input[name="jamMulai"]').fill("06:05");
    await dialog.locator('input[name="jamSelesai"]').fill("06:35");
    await dialog.getByRole("button", { name: "Simpan sesi", exact: true }).click();
    await expect(page).not.toHaveURL(/error=/);

    // Coba isi jam yang sama (overlap) di kelas kedua — guru yang sama, hari yang sama.
    await page.goto(hrefB!);
    await page.getByText("+ Tambah sesi", { exact: true }).first().click();
    dialog = page.locator("dialog[open]");
    await dialog.locator('input[name="jamMulai"]').fill("06:05");
    await dialog.locator('input[name="jamSelesai"]').fill("06:35");
    await dialog.getByRole("button", { name: "Simpan sesi", exact: true }).click();

    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Bentrok jadwal/)).toBeVisible();
  });
});
