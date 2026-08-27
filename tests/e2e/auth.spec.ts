import { test, expect } from "@playwright/test";
import { ACCOUNTS } from "./helpers/accounts";
import { openAccountMenu } from "./helpers/ui";

test.describe("Autentikasi & RBAC", () => {
  test("positif: login dengan kredensial benar redirect ke beranda sesuai peran", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", ACCOUNTS.kepsek.email);
    await page.fill("#password", ACCOUNTS.kepsek.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/kepsek$/);
    // 1.21 — salam sekarang dinamis per jam (Pagi/Siang/Sore/Malam), bukan teks statis "Selamat datang".
    await expect(page.getByRole("heading", { name: /Selamat (pagi|siang|sore|malam), Pak Hendra/ })).toBeVisible();
  });

  test("negatif: login dengan password salah ditolak & tetap di halaman login dengan pesan error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", ACCOUNTS.kepsek.email);
    await page.fill("#password", "password-salah-123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Email atau kata sandi salah")).toBeVisible();
  });

  test("negatif: login dengan email yang tidak terdaftar ditolak", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "tidak-ada@selarasajar.demo");
    await page.fill("#password", "selaras123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Email atau kata sandi salah")).toBeVisible();
  });

  test("negatif: mengakses halaman terproteksi tanpa login redirect ke /login", async ({ page }) => {
    await page.goto("/kepsek");
    await expect(page).toHaveURL(/\/login/);
  });

  test("positif: logout menghapus sesi — halaman terproteksi jadi tak bisa diakses lagi", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/kepsek.json" });
    const page = await context.newPage();
    await page.goto("/kepsek");
    await expect(page).toHaveURL(/\/kepsek$/);
    await openAccountMenu(page);
    await page.locator('form[action="/api/auth/logout"] button').click();
    await page.goto("/kepsek");
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });
});

test.describe("RBAC lintas peran (negatif) — akses ke area peran lain harus ditolak/redirect", () => {
  test.use({ storageState: "tests/e2e/.auth/murid.json" });

  test("murid tidak bisa akses /kepsek — diarahkan balik ke /murid", async ({ page }) => {
    await page.goto("/kepsek");
    await expect(page).toHaveURL(/\/murid/);
  });

  test("murid tidak bisa akses /guru", async ({ page }) => {
    await page.goto("/guru");
    await expect(page).toHaveURL(/\/murid/);
  });

  test("murid tidak bisa akses /superadmin", async ({ page }) => {
    await page.goto("/superadmin");
    await expect(page).toHaveURL(/\/murid/);
  });

  test("murid tidak bisa akses /keuangan (Bendahara only)", async ({ page }) => {
    await page.goto("/keuangan");
    await expect(page).toHaveURL(/\/murid/);
  });
});

test.describe("RBAC — guru tidak bisa akses fitur admin sekolah (negatif)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("guru tidak bisa akses /kepsek/siswa (data siswa admin)", async ({ page }) => {
    await page.goto("/kepsek/siswa");
    await expect(page).toHaveURL(/\/guru/);
  });

  test("guru tidak bisa akses /superadmin", async ({ page }) => {
    await page.goto("/superadmin");
    await expect(page).toHaveURL(/\/guru/);
  });
});

test.describe("RBAC — bendahara dibatasi ke fitur keuangan saja (negatif)", () => {
  test.use({ storageState: "tests/e2e/.auth/bendahara.json" });

  test("bendahara tidak bisa akses /kepsek/siswa", async ({ page }) => {
    await page.goto("/kepsek/siswa");
    await expect(page).toHaveURL(/\/keuangan/);
  });

  test("bendahara bisa akses /keuangan (positif)", async ({ page }) => {
    await page.goto("/keuangan");
    await expect(page).toHaveURL(/\/keuangan/);
  });
});

test.describe("RBAC — TU dibatasi ke administrasi data, tidak ke keuangan (negatif)", () => {
  test.use({ storageState: "tests/e2e/.auth/tu.json" });

  test("TU tidak bisa akses /keuangan", async ({ page }) => {
    await page.goto("/keuangan");
    await expect(page).toHaveURL(/\/kepsek\/siswa/);
  });

  test("TU bisa akses /kepsek/master-data (positif)", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    await expect(page).toHaveURL(/\/kepsek\/master-data/);
  });

  test("TU tidak bisa akses /kepsek (dashboard ringkasan, kepsek-only)", async ({ page }) => {
    await page.goto("/kepsek");
    await expect(page).toHaveURL(/\/kepsek\/siswa/);
  });
});
