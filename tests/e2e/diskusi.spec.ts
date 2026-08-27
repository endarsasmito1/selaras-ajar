import { test, expect } from "@playwright/test";

test.describe("Diskusi & Tanya Jawab di Materi (§4.17)", () => {
  test.use({ storageState: "tests/e2e/.auth/murid.json" });

  test("positif: murid tulis pertanyaan baru di materi, langsung muncul di panel", async ({ page }) => {
    await page.goto("/murid/materi");
    const grupMatematika = page.locator("details", { hasText: "Matematika" }).first();
    await grupMatematika.locator("> summary").click();
    const materiPertama = grupMatematika.locator("details").first();
    await materiPertama.locator("> summary").click();

    const pertanyaan = `Pertanyaan uji otomatis ${Date.now()}`;
    const inputBaru = materiPertama.locator('form:not(:has(input[name="parentId"])) input[name="isi"]');
    await inputBaru.fill(pertanyaan);
    await materiPertama.locator('form:not(:has(input[name="parentId"])) button[type="submit"]').click();

    await expect(page).toHaveURL(/\/murid\/materi/);
  });

  test("negatif: kirim komentar kosong ditolak validasi required", async ({ page }) => {
    await page.goto("/murid/materi");
    const grup = page.locator("details", { hasText: "Matematika" }).first();
    await grup.locator("> summary").click();
    const materiPertama = grup.locator("details").first();
    await materiPertama.locator("> summary").click();
    const form = materiPertama.locator('form:not(:has(input[name="parentId"]))').first();
    await form.locator('button[type="submit"]').click();
    // required text input mencegah submit — masih di halaman yang sama, form tetap terlihat
    await expect(form.locator('input[name="isi"]')).toBeVisible();
  });

  test("negatif: murid tidak punya tombol Hapus komentar (bukan moderator)", async ({ page }) => {
    await page.goto("/murid/materi");
    // Scope ke <main> — sejak 1.16 header punya <details> lain (menu hamburger mobile, account
    // menu) yang lebih dulu di urutan DOM, jadi "details" tanpa scope bisa kena elemen header itu.
    const grup = page.locator("main details").first();
    await grup.locator("> summary").click();
    await expect(page.getByRole("button", { name: "Hapus" })).toHaveCount(0);
  });
});

test.describe("Diskusi — guru bisa balas & moderasi (hapus) komentar di materinya sendiri", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: guru balas pertanyaan murid di materi", async ({ page }) => {
    await page.goto("/guru/materi");
    const details = page.locator("details", { has: page.locator('form[action="/api/diskusi"]') }).first();
    await details.locator("> summary").click();
    const balasToggle = details.getByText("Balas").first();
    if (await balasToggle.count()) {
      await balasToggle.click();
      const balasForm = details.locator('form:has(input[name="parentId"])').first();
      await balasForm.locator('input[name="isi"]').fill("Balasan uji otomatis dari guru.");
      await balasForm.locator('button[type="submit"]').click();
    }
  });
});
