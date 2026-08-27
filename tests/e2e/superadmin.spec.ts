import { test, expect } from "@playwright/test";
import { bukaFormTambahSekolahManual } from "./helpers/ui";

test.use({ storageState: "tests/e2e/.auth/superadmin.json" });

test.describe("Superadmin — Administrasi Platform (§4.19)", () => {
  test("positif: buat sekolah baru manual — tanpa akun kepala sekolah otomatis (1.14)", async ({ page }) => {
    const nama = `SD Uji Otomatis ${Date.now()}`;
    await bukaFormTambahSekolahManual(page, nama);
    await page.getByRole("button", { name: "Buat sekolah" }).click();
    await expect(page).toHaveURL(/sekolah_dibuat=1/);
    await expect(page.getByText(nama).first()).toBeVisible();
    await expect(page.getByText(/Belum ada akun kepala sekolah/)).toBeVisible();
  });

  test("negatif: buat sekolah tanpa nama ditolak validasi required", async ({ page }) => {
    await bukaFormTambahSekolahManual(page, `SD Tanpa Nama ${Date.now()}`);
    await page.fill('input[name="nama"]', ""); // kosongkan lagi — mode manual prefill dari query pencarian
    await page.getByRole("button", { name: "Buat sekolah" }).click();
    await expect(page).toHaveURL(/\/superadmin\/sekolah\/tambah$/); // required field browser cegah submit
  });

  test("positif: tambah akun kepala sekolah dari halaman detail sekolah (1.14)", async ({ page }) => {
    const nama = `SD Kepsek Belakangan ${Date.now()}`;
    const email = `kepsek${Date.now()}@ujiotomatis.demo`;
    await bukaFormTambahSekolahManual(page, nama);
    await page.getByRole("button", { name: "Buat sekolah" }).click();
    await page.getByText(nama).first().click();

    await page.getByText("+ Tambah akun kepala sekolah").click();
    await page.fill('input[name="kepsekNama"]', "Kepsek Uji Otomatis");
    await page.fill('input[name="kepsekEmail"]', email);
    await page.getByRole("button", { name: "Buat akun" }).click();

    await expect(page).toHaveURL(/kepsek_dibuat=1/);
    await expect(page.getByText(email).first()).toBeVisible();
  });

  test("negatif: tambah akun kepsek dengan email yang sudah dipakai ditolak", async ({ page }) => {
    const nama = `SD Kepsek Duplikat ${Date.now()}`;
    await bukaFormTambahSekolahManual(page, nama);
    await page.getByRole("button", { name: "Buat sekolah" }).click();
    await page.getByText(nama).first().click();

    await page.getByText("+ Tambah akun kepala sekolah").click();
    await page.fill('input[name="kepsekNama"]', "Kepsek Duplikat");
    await page.fill('input[name="kepsekEmail"]', "hendra@selarasajar.demo"); // sudah ada
    await page.getByRole("button", { name: "Buat akun" }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/sudah dipakai akun lain/)).toBeVisible();
  });

  test("positif: nonaktifkan sekolah memblokir login semua pengguna sekolah itu", async ({ page, browser }) => {
    const nama = `SD Blokir Uji ${Date.now()}`;
    const email = `blokir${Date.now()}@ujiotomatis.demo`;
    await bukaFormTambahSekolahManual(page, nama);
    await page.getByRole("button", { name: "Buat sekolah" }).click();
    await page.getByText(nama).first().click();

    await page.getByText("+ Tambah akun kepala sekolah").click();
    await page.fill('input[name="kepsekNama"]', "Kepsek Blokir Uji");
    await page.fill('input[name="kepsekEmail"]', email);
    await page.getByRole("button", { name: "Buat akun" }).click();
    const url = new URL(page.url());
    const password = url.searchParams.get("password");
    expect(password).toBeTruthy();

    await page.goto("/superadmin/sekolah");
    const row = page.locator("tr", { hasText: nama }).first();
    await row.getByRole("button", { name: "Nonaktifkan" }).click();
    await page.locator('dialog[open] button[type="submit"]').click();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto("/login");
    await page2.fill("#email", email);
    await page2.fill("#password", password!);
    await page2.click('button[type="submit"]');
    await expect(page2).toHaveURL(/\/login/); // ditolak — sekolah nonaktif
    await context2.close();
  });
});

test.describe("Superadmin — RBAC", () => {
  test("negatif: kepsek tidak bisa akses /superadmin", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/kepsek.json" });
    const page = await context.newPage();
    await page.goto("/superadmin");
    await expect(page).toHaveURL(/\/kepsek/);
    await context.close();
  });
});
