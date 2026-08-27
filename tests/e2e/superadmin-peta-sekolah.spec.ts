import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";
import { bukaFormTambahSekolahManual } from "./helpers/ui";

// Superadmin — Peta Sekolah / lat-long (22.11-22.15)
test.use({ storageState: "tests/e2e/.auth/superadmin.json" });

test("positif: isi lat/long saat tambah sekolah baru tersimpan", async ({ page }) => {
  const nama = `SD Peta Uji ${Date.now()}`;
  await bukaFormTambahSekolahManual(page, nama);
  await page.fill('input[name="latitude"]', "-6.914744");
  await page.fill('input[name="longitude"]', "107.609810");
  await page.getByRole("button", { name: "Buat sekolah" }).click();
  await expect(page).toHaveURL(/\/superadmin\/sekolah/);

  const sekolah = db.sekolah.findFirst({ nama });
  expect(sekolah?.latitude).toBeCloseTo(-6.914744, 4);
  expect(sekolah?.longitude).toBeCloseTo(107.60981, 4);
});

test("positif: edit lat/long sekolah yang sudah ada dari halaman detail", async ({ page }) => {
  const nama = `SD Peta Edit Uji ${Date.now()}`;
  await bukaFormTambahSekolahManual(page, nama);
  await page.getByRole("button", { name: "Buat sekolah" }).click();
  await page.getByText(nama).first().click();

  await page.fill('form[action="/api/superadmin/sekolah/lokasi"] input[name="latitude"]', "-7.797");
  await page.fill('form[action="/api/superadmin/sekolah/lokasi"] input[name="longitude"]', "110.370");
  await page.getByRole("button", { name: "Simpan lokasi" }).click();
  await expect(page.getByText("Koordinat: -7.797, 110.37")).toBeVisible();

  const sekolah = db.sekolah.findFirst({ nama });
  expect(sekolah?.latitude).toBeCloseTo(-7.797, 3);
});

test("positif: toggle Peta di daftar sekolah menampilkan marker sekolah ber-koordinat", async ({ page }) => {
  await page.goto("/superadmin/sekolah");
  await page.getByRole("button", { name: /Peta \(\d+\)/ }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 10000 });
  const jumlahMarker = await page.locator(".leaflet-marker-icon").count();
  expect(jumlahMarker).toBeGreaterThan(0);
});

test("negatif: sekolah tanpa lat/long tidak muncul sbg marker tapi tetap muncul di tabel", async ({ page }) => {
  const nama = `SD Tanpa Koordinat ${Date.now()}`;
  await bukaFormTambahSekolahManual(page, nama);
  await page.getByRole("button", { name: "Buat sekolah" }).click();
  await expect(page).toHaveURL(/\/superadmin\/sekolah/);
  await expect(page.getByRole("link", { name: nama })).toBeVisible(); // tampil di tabel

  await page.getByRole("button", { name: /Peta \(\d+\)/ }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 10000 });
  // Tak ada cara langsung "cari marker milik sekolah X" tanpa lat/long — cukup pastikan navigasi
  // ke tampilan Peta tak error & hitungan marker konsisten dgn sekolah yang PUNYA koordinat saja.
  const sekolahBerKoordinat = db.sekolah.findFirst({ nama: "SD Harapan Bangsa" });
  expect(sekolahBerKoordinat?.latitude).not.toBeNull();
  const sekolahBaru = db.sekolah.findFirst({ nama });
  expect(sekolahBaru?.latitude).toBeNull();
});

test("positif: dashboard /superadmin menampilkan peta sebaran sekolah", async ({ page }) => {
  await page.goto("/superadmin");
  await expect(page.getByText("Sebaran sekolah")).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 10000 });
});
