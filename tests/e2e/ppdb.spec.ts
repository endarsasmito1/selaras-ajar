import { test, expect } from "@playwright/test";

test.describe("PPDB — formulir publik (tanpa login)", () => {
  test("positif: isi form, tinjau, lalu kirim pendaftaran baru", async ({ page }) => {
    await page.goto("/ppdb");
    const namaUnik = `Calon Test ${Date.now()}`;
    await page.fill('input[name="namaCalon"]', namaUnik);
    await page.fill('input[name="jenjangDaftar"]', "Kelas 1");
    await page.fill('input[name="namaOrtu"]', "Bpk. Test Otomatis");
    await page.fill('input[name="kontak"]', "0812-0000-0000");
    await page.getByRole("button", { name: "Tinjau Pendaftaran" }).click();

    await expect(page.getByText("Tinjau data sebelum dikirim")).toBeVisible();
    await expect(page.getByText(namaUnik)).toBeVisible();
    await page.getByRole("button", { name: "Ya, kirim pendaftaran" }).click();
    await expect(page).not.toHaveURL(/\/ppdb$/); // redirect ke halaman sukses/terima kasih
  });

  test("negatif: submit tanpa isi field wajib tertahan validasi browser (tak lanjut ke tinjau)", async ({ page }) => {
    await page.goto("/ppdb");
    await page.getByRole("button", { name: "Tinjau Pendaftaran" }).click();
    // required field kosong -> browser validation mencegah lanjut, halaman tinjau tak muncul
    await expect(page.getByText("Tinjau data sebelum dikirim")).not.toBeVisible();
  });

  test("positif: dari halaman tinjau bisa balik ubah data sebelum kirim", async ({ page }) => {
    await page.goto("/ppdb");
    await page.fill('input[name="namaCalon"]', "Calon Ubah Data");
    await page.fill('input[name="jenjangDaftar"]', "Kelas 2");
    await page.fill('input[name="namaOrtu"]', "Ortu Uji");
    await page.fill('input[name="kontak"]', "0812-1111-1111");
    await page.getByRole("button", { name: "Tinjau Pendaftaran" }).click();
    await page.getByRole("button", { name: "← Ubah data" }).click();
    await expect(page.locator('input[name="namaCalon"]')).toBeVisible();
  });
});

test.describe("PPDB — kelola pendaftar (kepsek)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: terima pendaftar baru — status berubah jadi Diterima", async ({ page, request }) => {
    // Siapkan 1 pendaftar baru lewat form publik (independen dari data seed).
    await request.post("/api/ppdb", {
      form: { namaCalon: `Otomatis ${Date.now()}`, jenjangDaftar: "Kelas 1", namaOrtu: "Ortu Otomatis", kontak: "0812-2222-2222" },
    });

    await page.goto("/kepsek/ppdb");
    const row = page.locator("tbody tr", { has: page.getByRole("button", { name: "Terima" }) }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Terima" }).click();
    await expect(page).toHaveURL(/\/kepsek\/ppdb/);
  });

  test("positif: tolak pendaftar — status berubah jadi Ditolak", async ({ page, request }) => {
    await request.post("/api/ppdb", {
      form: { namaCalon: `Ditolak ${Date.now()}`, jenjangDaftar: "Kelas 1", namaOrtu: "Ortu Ditolak", kontak: "0812-3333-3333" },
    });
    await page.goto("/kepsek/ppdb");
    const row = page.locator("tbody tr", { has: page.getByRole("button", { name: "Tolak" }) }).first();
    await row.getByRole("button", { name: "Tolak" }).click();
    await expect(page).toHaveURL(/\/kepsek\/ppdb/);
  });
});
