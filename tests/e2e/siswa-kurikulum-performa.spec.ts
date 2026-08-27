import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";

test.describe("Siswa tanpa wali (12.15-12.16)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: siswa tanpa wali tampilkan Callout eksplisit + form tambah wali berhasil", async ({ page }) => {
    const sekolah = db.sekolah.findFirst({ nama: "SD Harapan Bangsa" });
    const siswa = db.siswa.findFirstTanpaWali({ sekolahId: sekolah!.id as string });
    test.skip(!siswa, "Semua siswa sekolah primer sudah punya wali di data seed saat ini");
    if (!siswa) return;

    await page.goto(`/kepsek/siswa/${siswa.id}`);
    await expect(page.getByText("Belum ada wali terdaftar untuk siswa ini.")).toBeVisible();
    await page.getByText("+ Tambah wali").click();
    const email = `waliuji${Date.now()}@ujiotomatis.demo`;
    await page.fill('form[action="/api/siswa/tambah-wali"] input[name="nama"]', "Wali Uji Otomatis");
    await page.fill('form[action="/api/siswa/tambah-wali"] input[name="email"]', email);
    await page.getByRole("button", { name: "Simpan wali" }).click();
    await expect(page.getByText(/password sementara/)).toBeVisible();
    await expect(page.getByText("Belum ada wali terdaftar untuk siswa ini.")).toHaveCount(0);
  });
});

test.describe("Master Data — Kurikulum picker (14.9-14.11)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: pilih Kurikulum Merdeka lalu isi mapel otomatis dari KurikulumMapel", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    const kurikulumSelect = page.locator('form[action="/api/master-data/kurikulum"] select[name="kurikulumId"]');
    await expect(kurikulumSelect).toBeVisible();
    await kurikulumSelect.selectOption({ label: "Kurikulum Merdeka" });
    await page.locator('form[action="/api/master-data/kurikulum"]').getByRole("button", { name: "Simpan" }).click();
    await expect(page).not.toHaveURL(/error=/);

    const sekolah = db.sekolah.findFirst({ nama: "SD Harapan Bangsa" });
    expect(sekolah?.kurikulumId).toBeTruthy();

    await page.goto("/kepsek/master-data");
    await expect(page.getByText(/Isi sesuai Kurikulum Merdeka/)).toBeVisible();
    await page.getByRole("button", { name: /Isi sesuai Kurikulum Merdeka/ }).click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: lepas pilihan kurikulum (kembali kosong) fallback ke preset hardcode Kurikulum Merdeka", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    const kurikulumSelect = page.locator('form[action="/api/master-data/kurikulum"] select[name="kurikulumId"]');
    await kurikulumSelect.selectOption("");
    await page.locator('form[action="/api/master-data/kurikulum"]').getByRole("button", { name: "Simpan" }).click();
    await expect(page).not.toHaveURL(/error=/);

    const sekolah = db.sekolah.findFirst({ nama: "SD Harapan Bangsa" });
    expect(sekolah?.kurikulumId).toBeNull();
    await expect(page.getByText(/Isi sesuai Kurikulum Merdeka \(SD\)/)).toBeVisible();
  });
});

test.describe("Performa Siswa — klik mapel tampilkan daftar ujian (20.5)", () => {
  test.use({ storageState: "tests/e2e/.auth/murid.json" });

  test("positif: expand satu mapel di Performa Saya menampilkan daftar ujian mapel itu", async ({ page }) => {
    await page.goto("/murid/performa");
    const kartuNilaiMapel = page.locator("div.bg-paper-raised", { hasText: "Nilai per mata pelajaran" });
    const detailsPertama = kartuNilaiMapel.locator("details").first();
    await expect(detailsPertama).toBeVisible();
    await detailsPertama.locator("summary").click();
    const jumlahUjianTeks = await detailsPertama.locator("summary span").last().textContent();
    expect(jumlahUjianTeks).toMatch(/ujian/);
  });
});
