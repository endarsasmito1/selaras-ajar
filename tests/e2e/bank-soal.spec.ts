import { test, expect, type Page } from "@playwright/test";
import { db } from "./helpers/db";

test.use({ storageState: "tests/e2e/.auth/guru.json" });

// 1.20 — field "pertanyaan" sekarang SoalEditor (SunEditor WYSIWYG) yang nyimpan HTML ke
// <input type="hidden" name="pertanyaan">, bukan <textarea> polos lagi. Hidden input tak bisa
// di-.fill() (butuh visible), jadi set value DOM-nya langsung — itu yg dibaca saat form di-submit.
async function isiPertanyaan(page: Page, teks: string) {
  await page.locator('input[name="pertanyaan"]').evaluate((el, val) => {
    (el as HTMLInputElement).value = val;
  }, teks);
}

test.describe("Bank Soal (BS-1..BS-8)", () => {
  test("positif: tambah soal pilihan ganda dengan kunci jawaban", async ({ page }) => {
    await page.goto("/guru/bank-soal");
    await page.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    await expect(page).toHaveURL(/\/guru\/bank-soal\/mapel\//);
    await page.getByText("+ Tambah soal baru").click();

    const pertanyaan = `Soal PG uji otomatis ${Date.now()}`;
    await isiPertanyaan(page, pertanyaan);
    const opsiInputs = page.locator('input[name="opsi"]');
    await opsiInputs.nth(0).fill("Jawaban A");
    await opsiInputs.nth(1).fill("Jawaban B");
    await opsiInputs.nth(2).fill("Jawaban C");
    await opsiInputs.nth(3).fill("Jawaban D");
    await page.locator('input[name="kunciJawaban"]').nth(1).check();
    await page.getByRole("button", { name: "Simpan ke bank soal" }).click();

    await expect(page).not.toHaveURL(/error=/);
    await expect(page.getByText(pertanyaan)).toBeVisible();
  });

  test("negatif: soal pilihan ganda tanpa kunci jawaban ditolak (BS-5)", async ({ page }) => {
    await page.goto("/guru/bank-soal");
    await page.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    await page.getByText("+ Tambah soal baru").click();
    await isiPertanyaan(page, "Soal PG tanpa kunci");
    const opsiInputs = page.locator('input[name="opsi"]');
    await opsiInputs.nth(0).fill("Opsi A");
    await opsiInputs.nth(1).fill("Opsi B");
    await page.getByRole("button", { name: "Simpan ke bank soal" }).click();
    // Radio kunciJawaban ditandai required di form -> browser cegah submit, tetap di halaman sama.
    await expect(page).toHaveURL(/\/guru\/bank-soal\/mapel\//);
    await expect(page).not.toHaveURL(/error=/);
  });

  test("positif: tambah soal esai (tanpa opsi/kunci sama sekali)", async ({ page }) => {
    await page.goto("/guru/bank-soal");
    await page.locator('a[href^="/guru/bank-soal/mapel/"]').filter({ hasText: "Matematika" }).first().click();
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption("#jenis-select", "ESAI");
    await expect(page.locator("#opsi-pg")).toBeHidden(); // tunggu JS toggle field selesai sebelum lanjut
    const pertanyaan = `Soal esai uji ${Date.now()}`;
    await isiPertanyaan(page, pertanyaan);
    // URL tujuan sama persis dengan URL saat ini (redirect balik ke halaman yang sama) — toHaveURL
    // sendiri tak bisa jadi sinyal "navigasi selesai" di sini, jadi tunggu event navigasi eksplisit.
    await Promise.all([
      page.waitForNavigation(),
      page.getByRole("button", { name: "Simpan ke bank soal" }).click(),
    ]);
    await expect(page.getByText(pertanyaan)).toBeVisible();
  });

  test("positif: edit soal yang sudah ada mengubah pertanyaannya", async ({ page }) => {
    const soal = db.soal.findFirst({ jenis: "ESAI" });
    test.skip(!soal, "Belum ada soal esai di bank");
    if (!soal) return;
    await page.goto(`/guru/bank-soal/${soal.id}/edit`);
    const pertanyaanBaru = `Pertanyaan diedit ${Date.now()}`;
    await isiPertanyaan(page, pertanyaanBaru);
    await page.getByRole("button", { name: /Simpan/ }).click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: akses edit soal dengan ID yang tak ada menghasilkan 404", async ({ page }) => {
    const res = await page.goto("/guru/bank-soal/id-yang-tidak-ada/edit");
    expect(res?.status()).toBe(404);
  });

  test("positif: tambah soal langsung dari halaman utama bank soal, mapel dipilih via dropdown (1.9)", async ({ page }) => {
    await page.goto("/guru/bank-soal");
    await page.getByText("+ Tambah soal baru").click();
    await page.selectOption('select[name="mapelId"]', { label: "Matematika" });
    const pertanyaan = `Soal dari halaman utama ${Date.now()}`;
    await isiPertanyaan(page, pertanyaan);
    const opsiInputs = page.locator('input[name="opsi"]');
    await opsiInputs.nth(0).fill("Opsi A");
    await opsiInputs.nth(1).fill("Opsi B");
    await opsiInputs.nth(2).fill("Opsi C");
    await opsiInputs.nth(3).fill("Opsi D");
    await page.locator('input[name="kunciJawaban"]').nth(0).check();
    await page.getByRole("button", { name: "Simpan ke bank soal" }).click();
    // API mengarahkan balik ke halaman mapel terkait setelah simpan.
    await expect(page).toHaveURL(/\/guru\/bank-soal\/mapel\//);
    await expect(page.getByText(pertanyaan)).toBeVisible();
  });
});
