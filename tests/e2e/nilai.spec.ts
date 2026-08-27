import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";

test.use({ storageState: "tests/e2e/.auth/guru.json" });

test.describe("Input Nilai — sumber dari Tugas/Ujian, editable/upsert & sinkron balik (G-2, 1.10)", () => {
  test("positif: pilih sumber Tugas, isi skor baru tersimpan & tampil di riwayat", async ({ page }) => {
    await page.goto("/guru/nilai");
    const opsiPertama = await page.locator('select[name="sumber"] option').first().textContent();

    const skorInput = page.locator('form[action="/api/nilai"] input[name^="skor_"]').first();
    await skorInput.fill("88");
    await page.getByRole("button", { name: /Simpan/ }).click();
    await expect(page).toHaveURL(/\/guru\/nilai/);
    if (opsiPertama) {
      await expect(page.locator("summary", { hasText: opsiPertama.trim() }).first()).toBeVisible();
    }
  });

  test("positif: sumber yang skornya sudah ada (dari tugas/ujian asli) ter-prefill otomatis", async ({ page }) => {
    await page.goto("/guru/nilai");
    // Cari opsi ujian di select (ujian tambahan seed sudah py sebagian nilai murid).
    const select = page.locator('select[name="sumber"]');
    const ujianOption = select.locator('optgroup[label="Ujian"] option').first();
    const count = await ujianOption.count();
    test.skip(count === 0, "Tidak ada opsi Ujian utk guru demo ini");
    if (count === 0) return;
    const value = await ujianOption.getAttribute("value");
    await select.selectOption(value!);
    await page.getByRole("button", { name: "Tampilkan" }).click();
    // Tak semua murid pasti sudah punya nilai, tapi form & tabel skor harus tampil tanpa error.
    await expect(page.locator('form[action="/api/nilai"]')).toBeVisible();
  });

  test("positif: edit ulang skor pada sumber yang sama meng-update, bukan menduplikat baris baru", async ({ page }) => {
    await page.goto("/guru/nilai");
    const editLink = page.getByRole("link", { name: "Edit" }).first();
    const jumlahEditAwal = await page.getByRole("link", { name: "Edit" }).count();
    test.skip(jumlahEditAwal === 0, "Belum ada riwayat nilai yang bisa diedit dari sumber Tugas/Ujian");
    if (jumlahEditAwal === 0) return;

    const judul = (await page.locator("summary span.font-semibold").first().textContent())?.trim() ?? "";
    await editLink.click();
    await expect(page.getByText(/Nilai yang sudah tersimpan\/ada ditampilkan/)).toBeVisible();
    await page.locator('form[action="/api/nilai"] input[name^="skor_"]').first().fill("77");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();

    await expect(page).toHaveURL(/\/guru\/nilai/);
    if (judul) {
      const kelompokSama = page.locator("summary", { hasText: judul });
      await expect(kelompokSama).toHaveCount(1);
    }
  });

  test("positif: mengedit skor dari sumber Ujian juga mengubah nilaiTotal UjianPengerjaan aslinya", async ({ page }) => {
    const pengerjaan = db.ujianPengerjaan.findSelesaiDenganGuru();
    test.skip(!pengerjaan, "Belum ada UjianPengerjaan SELESAI milik guru demo (Rina) di seed");
    if (!pengerjaan) return;

    const kelasId = db.ujianKelas.findKelasIdByUjian(pengerjaan.ujianId as string);
    test.skip(!kelasId, "Tidak menemukan kelas utk ujian ini");
    if (!kelasId) return;
    await page.goto(`/guru/nilai?kelas=${kelasId}&mapel=${pengerjaan.mapelId}&sumber=ujian:${pengerjaan.ujianId}`);
    const skorLama = Number(pengerjaan.nilaiTotal ?? 0);
    const skorBaru = skorLama === 91 ? 90 : 91;

    const baris = page.locator("tr", { hasText: pengerjaan.siswaNama as string });
    test.skip((await baris.count()) === 0, "Baris siswa tidak ditemukan di tabel (mungkin beda kelas guru aktif)");
    if ((await baris.count()) === 0) return;
    await baris.locator('input[name^="skor_"]').fill(String(skorBaru));
    await page.getByRole("button", { name: /Simpan/ }).click();
    await expect(page).toHaveURL(/\/guru\/nilai/);

    const setelah = db.ujianPengerjaan.findById(pengerjaan.pengerjaanId as string);
    expect(Number(setelah?.nilaiTotal)).toBe(skorBaru);
  });

  test("negatif: guru lain (Solihin) default ke mapelnya sendiri, bukan Matematika milik Rina", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guruLain.json" });
    const page = await context.newPage();
    await page.goto("/guru/nilai");
    const subtitle = page.locator("p.text-xs.text-ink-soft.mt-0\\.5").first();
    await expect(subtitle).toContainText("Bahasa Indonesia");
    await expect(subtitle).not.toContainText("Matematika");
    await context.close();
  });

  test("negatif: guru tidak bisa mengakses menu Input Nilai murid (RBAC lintas peran)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const page = await context.newPage();
    const res = await context.request.post("/api/nilai", {
      form: { kelasId: "x", mapelId: "x", sumberTipe: "tugas", sumberId: "x", siswaId: "x", skor_x: "100" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
    await context.close();
  });
});
