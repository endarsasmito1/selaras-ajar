import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";

test.describe("KKM per UTS/UAS (5.7)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: set KKM UTS/UAS beda dari KKM dasar tersimpan", async ({ page }) => {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    await page.goto("/kepsek/master-data");
    const form = page.locator('form[action="/api/nilai-config/kkm"]', { has: page.locator(`input[value="${mapel!.id}"]`) });
    await form.locator('input[name="kkmUTS"]').fill("85");
    await form.locator('input[name="kkmUAS"]').fill("90");
    await form.getByRole("button", { name: "Simpan" }).click();
    await expect(page).not.toHaveURL(/error=/);

    const updated = db.mataPelajaran.findFirst({ nama: "Matematika" });
    expect(updated?.kkmUTS).toBe(85);
    expect(updated?.kkmUAS).toBe(90);
  });
});

test.describe("KKM per UTS/UAS — resolusi di halaman Nilai (5.8-5.9)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: nilai dari Ujian ber-jenisPenilaian UTS pakai kkmUTS, bukan KKM dasar", async ({ page }) => {
    const judul = `UTS Uji KKM ${Date.now()}`;
    const mapelMatematika = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const babMatematika = db.bab.findFirst({ mapelId: mapelMatematika!.id as string });
    await page.goto("/guru/ujian/baru");
    await page.fill('input[name="judul"]', judul);
    await page.locator("label", { hasText: "5B — Matematika" }).locator('input[type="checkbox"]').check();
    await page.selectOption('select[name="jenisPenilaian"]', "UTS");
    await page.selectOption('select[name="babId"]', babMatematika!.id as string);
    await page.getByRole("button", { name: "Lanjut susun soal →" }).click();

    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    await page.goto(`/guru/nilai?kelas=${kelas5B!.id}&mapel=${mapel!.id}`);
    await page.selectOption('select[name="sumber"]', { label: judul });
    await page.getByRole("button", { name: "Tampilkan" }).click();
    const skorInputs = page.locator('input[name^="skor_"]');
    await skorInputs.first().fill("75"); // di atas KKM dasar (70) tapi DI BAWAH kkmUTS (85)
    await page.getByRole("button", { name: /Simpan/ }).click();
    await expect(page).not.toHaveURL(/error=/);

    await page.locator("summary", { hasText: judul }).click();
    await expect(page.getByText("Remedial").first()).toBeVisible();
  });

  test("negatif: nilai dari Tugas tetap pakai KKM dasar meski kkmUTS terisi", async ({ page }) => {
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    await page.goto(`/guru/nilai?kelas=${kelas5B!.id}&mapel=${mapel!.id}`);
    const opsiTugas = page.locator('select[name="sumber"] optgroup[label="Tugas"] option').first();
    test.skip((await opsiTugas.count()) === 0, "Tidak ada Tugas di kelas/mapel ini utk diuji");
    if ((await opsiTugas.count()) === 0) return;
    const labelTugas = await opsiTugas.textContent();
    await page.selectOption('select[name="sumber"]', { label: labelTugas! });
    await page.getByRole("button", { name: "Tampilkan" }).click();
    const skorInputs = page.locator('input[name^="skor_"]');
    await skorInputs.first().fill("75"); // >= KKM dasar 70 -> harus Tuntas, walau kkmUTS=85
    await page.getByRole("button", { name: /Simpan/ }).click();
    await page.locator("summary", { hasText: labelTugas! }).first().click();
    await expect(page.getByText("Tuntas").first()).toBeVisible();
  });
});

test.describe("KKM per UTS/UAS — fallback saat kosong (5.10)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("negatif: kkmUTS/kkmUAS dikosongkan otomatis fallback ke KKM dasar", async ({ page }) => {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    await page.goto("/kepsek/master-data");
    const form = page.locator('form[action="/api/nilai-config/kkm"]', { has: page.locator(`input[value="${mapel!.id}"]`) });
    await form.locator('input[name="kkmUTS"]').fill("");
    await form.locator('input[name="kkmUAS"]').fill("");
    await form.getByRole("button", { name: "Simpan" }).click();
    await expect(page).not.toHaveURL(/error=/);

    const updated = db.mataPelajaran.findFirst({ nama: "Matematika" });
    expect(updated?.kkmUTS).toBeNull();
    expect(updated?.kkmUAS).toBeNull();
  });
});
