import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";

test.describe("Keuangan lanjutan — tagihan custom & proyeksi (16.5-16.9)", () => {
  test.use({ storageState: "tests/e2e/.auth/bendahara.json" });

  test("positif: bendahara buat jenis tagihan baru non-SPP lalu langsung buat tagihan bulk-nya", async ({ page }) => {
    const namaTipe = `Study Tour Uji ${Date.now()}`;
    const namaPeriode = `Study Tour ${Date.now()}`;
    await page.goto("/keuangan/tipe-tagihan");
    await page.fill('form[action="/api/tagihan-tipe"] input[name="nama"]', namaTipe);
    await page.locator('form[action="/api/tagihan-tipe"]').getByRole("button", { name: "+ Tambah" }).click();
    await expect(page.locator("div.text-sm.border-b", { hasText: namaTipe })).toBeVisible();

    await page.selectOption('select[name="tipeId"]', { label: namaTipe });
    await page.fill('input[name="nominal"]', "500000");
    // Jatuh tempo sengaja TAK melebihi periode SPP terbaru (seed pakai 2026-08-10) — supaya tak
    // membajak periode default /keuangan (regresi yg pernah kejadian di Fase 9, sudah diperbaiki).
    await page.fill('input[name="jatuhTempo"]', "2026-08-05");
    await page.fill('input[name="periode"]', namaPeriode);
    // 1.21 — "Semua siswa aktif" sekarang mode radio default, tak perlu dipilih eksplisit.
    await page.getByRole("button", { name: "Buat tagihan" }).click();
    await expect(page).toHaveURL(/tagihan_dibuat=/);
    await expect(page.getByText(/tagihan baru dibuat/)).toBeVisible();

    const tipe = db.tagihanTipe.findFirst({ sekolahId: db.sekolah.findFirst({ nama: "SD Harapan Bangsa" })!.id as string, nama: namaTipe });
    expect(db.tagihan.count({ tipeId: tipe!.id as string })).toBeGreaterThan(0);
  });

  test("positif: riwayat tagihan siswa menampilkan SPP + tagihan custom", async ({ page }) => {
    const siswa = db.siswa.findFirst({ nisn: "0098234571" });
    await page.goto(`/keuangan/siswa/${siswa!.id}`);
    await expect(page.getByText("SPP").first()).toBeVisible();
    await expect(page.getByText(/Study Tour/).first()).toBeVisible();
  });

  test("positif: section Proyeksi Keuangan tampil di halaman utama", async ({ page }) => {
    await page.goto("/keuangan");
    await expect(page.getByText("Proyeksi keuangan")).toBeVisible();
    await expect(page.getByText("Proyeksi bulan depan")).toBeVisible();
    await expect(page.getByText("Proyeksi 12 bulan ke depan")).toBeVisible();
  });

  test("negatif: periode default /keuangan tetap SPP, bukan periode tagihan custom", async ({ page }) => {
    await page.goto("/keuangan");
    const nilaiTerpilih = await page.locator('select[name="periode"]').inputValue();
    expect(nilaiTerpilih).not.toMatch(/Study Tour/);
  });
});

test.describe("Keuangan lanjutan — riwayat siswa dari kepsek juga tetap jalan", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: kepsek juga bisa lihat riwayat tagihan siswa lewat profil 360", async ({ page }) => {
    const siswa = db.siswa.findFirst({ nisn: "0098234571" });
    await page.goto(`/kepsek/siswa/${siswa!.id}`);
    await expect(page.getByText("Riwayat pembayaran SPP")).toBeVisible();
  });
});
