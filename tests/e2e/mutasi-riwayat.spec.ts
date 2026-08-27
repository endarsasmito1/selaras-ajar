import { test, expect } from "@playwright/test";
import { confirmDialogSubmit } from "./helpers/ui";

test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

test.describe("Mutasi Siswa & Riwayat Siswa (F-2/F-3, 1.7)", () => {
  test("positif: tambah siswa mutasi masuk sebagai siswa aktif baru", async ({ page }) => {
    await page.goto("/kepsek/siswa/mutasi");
    const nisn = `MSK${Date.now()}`.slice(0, 15);
    const nama = `Siswa Mutasi Masuk ${Date.now()}`;
    await page.fill('input[name="nisn"]', nisn);
    await page.fill('input[name="nama"]', nama);
    await page.getByRole("button", { name: "Tambahkan sebagai siswa aktif" }).click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: mutasi masuk dengan NISN yang sudah dipakai ditolak", async ({ page }) => {
    await page.goto("/kepsek/siswa/mutasi");
    await page.fill('input[name="nisn"]', "0098234571"); // NISN Ahmad Fauzi dari seed
    await page.fill('input[name="nama"]', "Siswa Duplikat NISN");
    await page.getByRole("button", { name: "Tambahkan sebagai siswa aktif" }).click();
    await expect(page).toHaveURL(/error=/);
  });

  test("positif: mutasi keluar via popup konfirmasi wajib isi tanggal & keterangan — siswa pindah ke Riwayat", async ({ page }) => {
    // Siapkan siswa throwaway lewat mutasi masuk dulu supaya tak menyentuh data seed lain.
    const nisn = `MK${Date.now()}`.slice(0, 15);
    const nama = `Siswa Utk Mutasi Keluar ${Date.now()}`;
    await page.goto("/kepsek/siswa/mutasi");
    await page.fill('input[name="nisn"]', nisn);
    await page.fill('input[name="nama"]', nama);
    await page.getByRole("button", { name: "Tambahkan sebagai siswa aktif" }).click();

    // 1.8 — daftar dipaginasi & bisa dicari (bukan lagi 300+ dialog sekaligus di-mount), jadi
    // cari nama siswa yang baru dibuat lewat search box supaya pasti muncul di halaman ini.
    await page.goto(`/kepsek/siswa/mutasi?q=${encodeURIComponent(nama)}`);

    const row = page.locator("div.flex.items-center.justify-between.text-sm.border-b", { hasText: nama }).first();
    const tombolMutasiKeluar = row.getByRole("button", { name: "Mutasi keluar" });
    await expect(tombolMutasiKeluar).toBeVisible();
    await tombolMutasiKeluar.click();
    await page.locator('dialog[open] textarea[name="keterangan"]').fill("Pindah mengikuti orang tua (uji otomatis).");
    await confirmDialogSubmit(page, "Ya, mutasi keluar");

    await expect(page).not.toHaveURL(/error=/);
    // Cek spesifik di daftar siswa (bukan seluruh halaman) — banner sukses juga menyebut nama siswa.
    await expect(page.locator("div.flex.flex-col.gap-2.max-h-96.overflow-auto").getByText(nama)).not.toBeVisible();

    await page.goto("/kepsek/siswa/riwayat");
    await expect(page.getByText(nama)).toBeVisible();
    await expect(page.getByText("Mutasi keluar").first()).toBeVisible();
  });

  test("negatif: popup mutasi keluar tanpa keterangan ditolak validasi required", async ({ page }) => {
    await page.goto("/kepsek/siswa/mutasi");
    const tombolMutasi = page.getByRole("button", { name: "Mutasi keluar" }).first();
    await expect(tombolMutasi).toBeVisible();
    await tombolMutasi.click();
    await page.locator('dialog[open] button[type="submit"]').click();
    // required textarea mencegah submit — dialog tetap terbuka
    await expect(page.locator("dialog[open]")).toBeVisible();
  });

  test("positif: cari siswa pindah keluar via search box mempersempit daftar (1.8, batasi jumlah dialog di-mount)", async ({ page }) => {
    await page.goto("/kepsek/siswa/mutasi?q=NamaYangJelasTidakAda9999");
    await expect(page.getByText("Tidak ada siswa yang cocok.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mutasi keluar" })).toHaveCount(0);
  });

  test("positif: daftar siswa pindah keluar dipaginasi (maks 25 per halaman)", async ({ page }) => {
    await page.goto("/kepsek/siswa/mutasi");
    const tombolCount = await page.getByRole("button", { name: "Mutasi keluar" }).count();
    expect(tombolCount).toBeLessThanOrEqual(25);
    const halaman2 = page.getByRole("link", { name: "2", exact: true });
    if (await halaman2.count()) {
      await halaman2.click();
      await expect(page).toHaveURL(/halaman=2/);
    }
  });
});

test.describe("Riwayat Siswa — akses & isi data", () => {
  test("positif: TU juga bisa melihat Riwayat Siswa", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/tu.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/siswa/riwayat");
    await expect(page).toHaveURL(/\/kepsek\/siswa\/riwayat/);
    await context.close();
  });

  test("negatif: guru tidak bisa akses Riwayat Siswa (admin only)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/siswa/riwayat");
    await expect(page).toHaveURL(/\/guru/);
    await context.close();
  });
});
