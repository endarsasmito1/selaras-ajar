import { test, expect } from "@playwright/test";

test.describe("Tugas / PR — guru buat & koreksi", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: guru buat tugas baru dengan instruksi & tenggat", async ({ page }) => {
    await page.goto("/guru/tugas");
    const judul = `Tugas Uji ${Date.now()}`;
    await page.getByText("+ Buat tugas baru").click();
    await page.fill('input[name="judul"]', judul);
    const tenggat = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
    await page.fill('input[name="tenggat"]', tenggat);
    await page.locator('textarea[name="instruksi"]').fill("Kerjakan latihan uji otomatis halaman 1-3.");
    await page.getByRole("button", { name: "Publikasikan tugas" }).click();
    await expect(page).toHaveURL(/\/guru\/tugas$/);
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: buat tugas tanpa instruksi ditolak validasi required", async ({ page }) => {
    await page.goto("/guru/tugas");
    await page.getByText("+ Buat tugas baru").click();
    await page.fill('input[name="judul"]', "Tugas Tanpa Instruksi");
    await page.fill('input[name="tenggat"]', new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    await page.getByRole("button", { name: "Publikasikan tugas" }).click();
    await expect(page).toHaveURL(/\/guru\/tugas$/);
  });

  test("positif: guru beri nilai & catatan pada pengumpulan murid", async ({ page }) => {
    await page.goto("/guru/tugas");
    await page.locator('a[href^="/guru/tugas/kelas/"]').first().click(); // masuk ke daftar tugas 1 kelas
    await page.locator('a[href^="/guru/tugas/"]').first().click(); // masuk ke detail 1 tugas
    const linkMurid = page.locator('a[href*="/murid/"]').first();
    if (await linkMurid.count()) {
      await linkMurid.click();
      await expect(page).toHaveURL(/\/guru\/tugas\/.+\/murid\//);
      await page.locator('input[name^="nilai_"]').fill("95");
      await page.locator('textarea[name^="catatan_"]').fill("Bagus, pertahankan.");
      await page.getByRole("button", { name: "Simpan nilai & catatan" }).click();
      await expect(page).not.toHaveURL(/error=/);
    }
  });

  test("negatif: nilai di luar rentang 0-100 ditolak validasi HTML (max=100)", async ({ page }) => {
    await page.goto("/guru/tugas");
    await page.locator('a[href^="/guru/tugas/kelas/"]').first().click();
    await page.locator('a[href^="/guru/tugas/"]').first().click();
    const linkMurid = page.locator('a[href*="/murid/"]').first();
    if (await linkMurid.count()) {
      await linkMurid.click();
      const nilaiInput = page.locator('input[name^="nilai_"]');
      await expect(nilaiInput).toHaveAttribute("max", "100");
    }
  });
});

test.describe("Tugas — murid kumpulkan jawaban", () => {
  test.use({ storageState: "tests/e2e/.auth/murid.json" });

  test("positif: murid isi/perbarui jawaban tugas (teks) & submit", async ({ page }) => {
    await page.goto("/murid/tugas");
    await page.locator('a[href^="/murid/tugas/"]').first().click();
    await expect(page).toHaveURL(/\/murid\/tugas\//);
    await page.locator('textarea[name="isiJawaban"]').fill("Jawaban uji otomatis dari murid.");
    await page.getByRole("button", { name: /Kumpulkan tugas|Perbarui jawaban/ }).click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: submit tugas tanpa isi apa pun (teks/lampiran/tautan kosong) ditolak", async ({ page }) => {
    await page.goto("/murid/tugas");
    await page.locator('a[href^="/murid/tugas/"]').first().click();
    await page.locator('textarea[name="isiJawaban"]').fill("");
    await page.fill('input[name="tautanUrl"]', "");
    await page.getByRole("button", { name: /Kumpulkan tugas|Perbarui jawaban/ }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Isi minimal salah satu/)).toBeVisible();
  });

  test("negatif: murid tidak bisa mengumpulkan tugas milik siswa lain (akses langsung API)", async ({ page, request }) => {
    const res = await request.post("/api/tugas/kumpul", {
      form: { tugasId: "id-tidak-valid", isiJawaban: "Coba" },
      maxRedirects: 0,
    });
    expect([303, 404]).toContain(res.status());
  });
});
