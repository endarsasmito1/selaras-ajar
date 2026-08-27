import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";
import { isiPertanyaan } from "./helpers/ui";
import fs from "fs";
import path from "path";

test.describe("Bank Soal lanjutan — PG Kompleks (7.11-7.12)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: buat soal Pilihan Ganda Kompleks dengan >=2 kunci dicentang", async ({ page }) => {
    await page.goto("/guru/bank-soal");
    await page.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption("#jenis-select", "PILIHAN_GANDA_KOMPLEKS");
    const pertanyaan = `Soal PGK uji ${Date.now()}`;
    await isiPertanyaan(page, pertanyaan);
    const opsi = page.locator('input[name="opsi"]');
    await opsi.nth(0).fill("12");
    await opsi.nth(1).fill("17");
    await opsi.nth(2).fill("24");
    await opsi.nth(3).fill("31");
    const kunciMulti = page.locator('input[name="kunciJawabanMulti"]');
    await kunciMulti.nth(0).check();
    await kunciMulti.nth(2).check();
    await page.getByRole("button", { name: "Simpan ke bank soal" }).click();
    await expect(page).not.toHaveURL(/error=/);
    await expect(page.getByText(pertanyaan)).toBeVisible();
    const soal = db.soal.findFirst({ jenis: "PILIHAN_GANDA_KOMPLEKS" });
    expect(JSON.parse(soal!.kunciJawaban as string)).toEqual([0, 2]);
  });

  test("negatif: soal PG Kompleks dengan <2 kunci dicentang ditolak", async ({ page }) => {
    await page.goto("/guru/bank-soal");
    await page.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption("#jenis-select", "PILIHAN_GANDA_KOMPLEKS");
    await isiPertanyaan(page, "Soal PGK tanpa cukup kunci");
    const opsi = page.locator('input[name="opsi"]');
    await opsi.nth(0).fill("A");
    await opsi.nth(1).fill("B");
    await opsi.nth(2).fill("C");
    await opsi.nth(3).fill("D");
    await page.locator('input[name="kunciJawabanMulti"]').nth(0).check();
    await page.getByRole("button", { name: "Simpan ke bank soal" }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/minimal 2 kunci jawaban/)).toBeVisible();
  });
});

test.describe("Bank Soal lanjutan — filter poin & poin custom (7.8-7.9)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: poin default custom (bukan 10) tersimpan & tampil", async ({ page }) => {
    await page.goto("/guru/bank-soal");
    await page.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption("#jenis-select", "ESAI");
    const pertanyaan = `Soal poin custom ${Date.now()}`;
    await isiPertanyaan(page, pertanyaan);
    await page.fill('input[name="poinDefault"]', "35");
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Simpan ke bank soal" }).click()]);
    const row = page.locator("div.bg-paper-raised", { hasText: pertanyaan }).first();
    await expect(row.getByText("35 poin")).toBeVisible();
  });

  test("positif: filter rentang poin menyaring daftar soal", async ({ page }) => {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    await page.goto(`/guru/bank-soal/mapel/${mapel!.id}?poinMin=34&poinMax=36`);
    await expect(page.getByText(/poin custom/)).toBeVisible();
    await page.goto(`/guru/bank-soal/mapel/${mapel!.id}?poinMin=1000&poinMax=2000`);
    await expect(page.getByText("Tidak ada soal di rentang poin ini.")).toBeVisible();
  });
});

test.describe("Bank Soal lanjutan — WYSIWYG & sanitasi XSS (7.13-7.14)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: format HTML dasar (bold) pada pertanyaan tersimpan & tampil terformat", async ({ page }) => {
    await page.goto("/guru/bank-soal");
    await page.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption("#jenis-select", "ESAI");
    const marker = `Cetak${Date.now()}Tebal`;
    await isiPertanyaan(page, `<p>Soal dengan <b>${marker}</b></p>`);
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Simpan ke bank soal" }).click()]);
    const bold = page.locator("b", { hasText: marker });
    await expect(bold).toBeVisible();
  });

  test("negatif: submit <script> sebagai pertanyaan tersanitasi, tidak tereksekusi", async ({ page }) => {
    let dialogMuncul = false;
    page.on("dialog", async (d) => {
      dialogMuncul = true;
      await d.dismiss();
    });
    await page.goto("/guru/bank-soal");
    await page.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption("#jenis-select", "ESAI");
    const marker = `xss${Date.now()}`;
    await isiPertanyaan(page, `<p>Sebelum</p><script>alert('${marker}')</script><p>Sesudah</p>`);
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Simpan ke bank soal" }).click()]);
    await page.waitForTimeout(300); // beri kesempatan script (kalau lolos sanitasi) sempat jalan
    expect(dialogMuncul).toBe(false);
    const scriptCount = await page.locator("script", { hasText: marker }).count();
    expect(scriptCount).toBe(0);
  });
});

// 1.23 — upload gambar/video di editor pertanyaan soal, dites via API langsung (bukan lewat
// dialog upload SunEditor yang rapuh di-otomasi) karena logic yang perlu diverifikasi ada di
// route-nya (gating peran, validasi MIME/ukuran), bukan di perilaku plugin pihak ketiga.
test.describe("Bank Soal — upload media di editor soal (1.23)", () => {
  test("positif: guru upload gambar valid dapat URL", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const res = await context.request.post("/api/soal/media-upload", {
      multipart: {
        file: { name: "avatar.png", mimeType: "image/png", buffer: fs.readFileSync(path.join(__dirname, "fixtures/avatar.png")) },
        tipe: "gambar",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^\/uploads\/soal\//);
    await context.close();
  });

  test("negatif: upload berkas non-gambar sbg tipe gambar ditolak", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const res = await context.request.post("/api/soal/media-upload", {
      multipart: {
        file: { name: "bukan-gambar.txt", mimeType: "text/plain", buffer: fs.readFileSync(path.join(__dirname, "fixtures/bukan-gambar.txt")) },
        tipe: "gambar",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Format berkas tidak didukung/);
    await context.close();
  });

  test("negatif: murid tidak bisa akses route upload media soal", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const res = await context.request.post("/api/soal/media-upload", {
      multipart: {
        file: { name: "avatar.png", mimeType: "image/png", buffer: fs.readFileSync(path.join(__dirname, "fixtures/avatar.png")) },
        tipe: "gambar",
      },
    });
    expect(res.status()).toBe(403);
    await context.close();
  });
});
