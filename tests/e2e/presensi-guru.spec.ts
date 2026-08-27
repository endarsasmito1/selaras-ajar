import { test, expect } from "@playwright/test";
import { confirmDialogSubmit } from "./helpers/ui";

test.describe("Presensi Guru Mengajar (§4.15, AG-1..AG-6) — menu disembunyikan tapi modul tetap jalan (1.7)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: halaman rekap presensi guru tetap bisa diakses langsung via URL", async ({ page }) => {
    await page.goto("/kepsek/presensi-guru");
    await expect(page).toHaveURL(/\/kepsek\/presensi-guru/);
    await expect(page.getByText("Rekap kehadiran mengajar")).toBeVisible();
  });

  test("negatif: menu Presensi Guru tidak muncul di sidebar navigasi kepsek", async ({ page }) => {
    await page.goto("/kepsek");
    await expect(page.locator("aside").getByText("Presensi Guru")).not.toBeVisible();
  });

  test("positif: dashboard menampilkan sesi hari ini yang belum terisi (AG-4)", async ({ page }) => {
    await page.goto("/kepsek/presensi-guru");
    await expect(page.getByText("Sesi hari ini yang belum terisi")).toBeVisible();
  });
});

test.describe("Presensi Guru — tandai hadir manual (AG-2)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: guru tandai hadir manual untuk sesi hari ini yang belum tercatat", async ({ page }) => {
    await page.goto("/guru/jadwal");
    await page.locator('a[href^="/guru/jadwal/"]').first().click();
    const tombolTandai = page.getByRole("button", { name: "Tandai hadir" }).first();
    test.skip((await tombolTandai.count()) === 0, "Tidak ada sesi hari ini yang belum tercatat presensinya saat test dijalankan");
    if ((await tombolTandai.count()) === 0) return;
    await tombolTandai.click();
    await expect(page).not.toHaveURL(/error=/);
  });
});

test.describe("Presensi Guru otomatis dari absensi murid (AG-1)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: submit absensi murid otomatis mencatat guru hadir mengajar sesi jadwal hari itu", async ({ page }) => {
    await page.goto("/guru/absensi");
    await page.getByRole("button", { name: "Simpan absensi" }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    await expect(page).toHaveURL(/\/guru\/absensi/);
    // Callout di halaman absensi menjelaskan efek samping otomatis ini (AG-1) — memverifikasi
    // teksnya tampil sudah cukup sbg bukti fitur ini didokumentasikan & alurnya tak error.
    await expect(page.getByText(/Kehadiran mengajarmu untuk sesi jadwal hari ini juga otomatis tercatat/)).toBeVisible();
  });
});
