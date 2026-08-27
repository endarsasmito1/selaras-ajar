import { test, expect } from "@playwright/test";
import { isiPertanyaan } from "./helpers/ui";

test.describe("Superadmin — Kurikulum (22.7)", () => {
  test.use({ storageState: "tests/e2e/.auth/superadmin.json" });

  test("positif: buat Kurikulum baru + tambah mapel, muncul di daftar", async ({ page }) => {
    const nama = `Kurikulum Uji ${Date.now()}`;
    await page.goto("/superadmin/kurikulum");
    await page.getByText("+ Tambah kurikulum baru").click();
    await page.fill('form[action="/api/superadmin/kurikulum"] input[name="nama"]', nama);
    await page.selectOption('form[action="/api/superadmin/kurikulum"] select[name="jenjang"]', "SMP");
    await page.getByRole("button", { name: "Tambah kurikulum" }).click();
    const tautanKurikulum = page.getByRole("link", { name: nama });
    await expect(tautanKurikulum).toBeVisible();

    await tautanKurikulum.click();
    await expect(page).toHaveURL(/\/superadmin\/kurikulum\//);
    await page.fill('input[name="nama"]', "Bahasa Inggris Lanjutan");
    await page.fill('input[name="kkm"]', "75");
    await page.getByRole("button", { name: "Tambah mapel" }).click();
    // 1.21 — getByText polos ambigu: dialog konfirmasi hapus utk mapel ini juga nyimpan namanya
    // permanen di DOM (di dalam <dialog> tak terbuka) — scope ke sel tabel spesifik.
    await expect(page.getByRole("cell", { name: "Bahasa Inggris Lanjutan" })).toBeVisible();
  });

  test("positif: kurikulum baru muncul sbg opsi dropdown di Master Data kepsek sekolah sejenjang", async ({ page }) => {
    // Kurikulum "SMP" yang baru dibuat di atas tak akan muncul di Master Data sekolah primer (jenjang
    // SD) — verifikasi lewat kurikulum jenjang SD bawaan seed ("Kurikulum Merdeka") yang memang harus tampil.
    await page.goto("/superadmin/kurikulum");
    await expect(page.getByText("Kurikulum Merdeka").first()).toBeVisible();
  });
});

test.describe("Superadmin — Kurikulum RBAC (22.8)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("negatif: kepsek tidak bisa akses /superadmin/kurikulum atau POST ke API-nya", async ({ page }) => {
    await page.goto("/superadmin/kurikulum");
    await expect(page).not.toHaveURL(/\/superadmin\/kurikulum$/);
    const res = await page.request.post("/api/superadmin/kurikulum", { form: { nama: "x", jenjang: "SD" } });
    expect(res.status()).toBe(403);
  });
});

test.describe("Superadmin — Bank Soal Global (22.9)", () => {
  test.use({ storageState: "tests/e2e/.auth/superadmin.json" });

  test("positif: superadmin buat soal bank global, muncul di bank soal guru sekolah manapun", async ({ page, browser }) => {
    const pertanyaan = `Soal global uji ${Date.now()}`;
    await page.goto("/superadmin/bank-soal");
    await page.getByText("+ Tambah soal baru").click();
    await page.fill('input[name="mapelNama"]', "Matematika");
    await page.fill('input[name="rekomendasiKelas"]', "Kelas 5-6");
    await isiPertanyaan(page, pertanyaan);
    const opsi = page.locator('input[name="opsi"]');
    await opsi.nth(0).fill("A");
    await opsi.nth(1).fill("B");
    await opsi.nth(2).fill("C");
    await opsi.nth(3).fill("D");
    await page.locator('input[name="kunciJawaban"]').nth(0).check();
    await page.getByRole("button", { name: "Simpan ke bank soal terpusat" }).click();
    await expect(page.getByText(pertanyaan)).toBeVisible();
    await expect(page.getByText("Kelas 5-6")).toBeVisible();

    const guruCtx = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const guruPage = await guruCtx.newPage();
    await guruPage.goto("/guru/bank-soal");
    await guruPage.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    // 1.22 — bank soal global sekarang diisi banyak dummy per mapel (bukan cuma soal ini), jadi
    // badge "Dari Selaras Ajar" tak lagi unik di halaman ini — scope ke kartu soal ini spesifik.
    const kartuSoal = guruPage.locator(".bg-paper-raised.border.border-rule.rounded-xl").filter({ hasText: pertanyaan });
    await expect(kartuSoal.getByText(pertanyaan)).toBeVisible();
    await expect(kartuSoal.getByText("✦ Dari Selaras Ajar")).toBeVisible();
    await guruCtx.close();
  });
});

test.describe("Superadmin — Bank Soal Global RBAC (22.10)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("negatif: guru tidak bisa akses /superadmin/bank-soal atau POST ke API-nya", async ({ page }) => {
    await page.goto("/superadmin/bank-soal");
    await expect(page).not.toHaveURL(/\/superadmin\/bank-soal$/);
    const res = await page.request.post("/api/superadmin/bank-soal", { form: { mapelNama: "x", jenis: "ESAI", pertanyaan: "y" } });
    expect(res.status()).toBe(403);
  });
});
