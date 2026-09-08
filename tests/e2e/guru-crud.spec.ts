import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

test.describe("Kelola Data Guru (MG-1/MG-2, 1.8: tambah manual, wali eksklusif, search)", () => {
  // Feedback teknis (Sep 2026) — 3 test di bawah stale di 3 sisi sekaligus: (1) trigger Drawer
  // teksnya sekarang "+ Tambah guru manual" polos (suffix "(MG-1)" pindah ke `eyebrow`, bukan
  // bagian trigger lagi), (2) form-nya di dalam <dialog>, ada tombol "Batal" yg bikin
  // `button[type="submit"]` generik ambigu, (3) redirect sukses sekarang pakai `?toast=` (dibaca
  // ToastFromQuery lalu langsung dibersihkan dari URL), bukan `?guru_dibuat` — assert teks toast
  // langsung, bukan pola URL yang sudah gak pernah muncul.
  test("positif: tambah guru manual muncul di daftar dengan password sementara", async ({ page }) => {
    await page.goto("/kepsek/guru");
    const email = `guruuji${Date.now()}@selarasajar.demo`;
    await page.getByRole("button", { name: "+ Tambah guru manual" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog.locator('input[name="nama"]').fill("Guru Uji Otomatis");
    await dialog.locator('input[name="email"]').fill(email);
    await dialog.getByRole("button", { name: "Tambah guru", exact: true }).click();
    await expect(page.getByText(/ditambahkan — password sementara/)).toBeVisible();
    await expect(page.locator("table").getByText("Guru Uji Otomatis")).toBeVisible();
  });

  test("negatif: tambah guru dengan email yang sudah terdaftar ditolak", async ({ page }) => {
    await page.goto("/kepsek/guru");
    await page.getByRole("button", { name: "+ Tambah guru manual" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog.locator('input[name="nama"]').fill("Guru Duplikat");
    await dialog.locator('input[name="email"]').fill("rina@selarasajar.demo"); // sudah ada
    await dialog.getByRole("button", { name: "Tambah guru", exact: true }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.locator(".bg-warning-tint")).toContainText(/sudah terdaftar/);
  });

  test("negatif: tambah guru tanpa nama/email ditolak validasi required", async ({ page }) => {
    await page.goto("/kepsek/guru");
    await page.getByRole("button", { name: "+ Tambah guru manual" }).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Tambah guru", exact: true }).click();
    await expect(page).toHaveURL(/\/kepsek\/guru$/);
  });

  test("positif: pencarian nama guru memfilter daftar", async ({ page }) => {
    await page.goto("/kepsek/guru?q=Rina");
    await expect(page.getByText(/Rina Wulandari/)).toBeVisible();
    await expect(page.getByText(/Ahmad Solihin/)).not.toBeVisible();
  });

  test("negatif: pencarian nama yang tak ada menampilkan pesan kosong", async ({ page }) => {
    await page.goto("/kepsek/guru?q=NamaTidakAda12345");
    await expect(page.getByText("Tidak ada guru yang cocok")).toBeVisible();
  });

  test("positif: set wali kelas untuk guru yang belum jadi wali", async ({ page }) => {
    await page.goto("/kepsek/guru?q=Solihin");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await expect(page).toHaveURL(/\/edit$/);
  });

  test("negatif: kelas yang sudah punya wali tidak muncul lagi sebagai pilihan wali guru lain", async ({ page }) => {
    // Rina adalah wali 5B dari seed — buka edit guru LAIN dan pastikan opsi "5B" tak ada di select wali-nya.
    await page.goto("/kepsek/guru?q=Solihin");
    await page.getByRole("link", { name: "Edit" }).first().click();
    const waliSelect = page.locator('form[action="/api/guru/wali-kelas"] select[name="kelasId"]');
    const opsi5B = waliSelect.locator("option", { hasText: "5B" });
    await expect(opsi5B).toHaveCount(0);
  });

  test("negatif: guru tidak bisa akses halaman Data Guru (admin only)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/guru");
    await expect(page).toHaveURL(/\/guru/);
    await context.close();
  });
});
