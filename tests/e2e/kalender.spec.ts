import { test, expect } from "@playwright/test";
import { confirmDialogSubmit } from "./helpers/ui";

const ROW_SELECTOR = "div.bg-paper-raised.border.border-rule.rounded-xl.px-4.py-3";

test.describe("Kalender Akademik (F-7) — kelola oleh Kepsek", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: tambah agenda baru muncul di daftar agenda mendatang", async ({ page }) => {
    await page.goto("/kepsek/kalender");
    const judul = `Agenda Test ${Date.now()}`;
    await page.getByText("+ Tambah agenda").click();
    const tambahForm = page.locator('form[action="/api/agenda"]');
    await tambahForm.locator('input[name="judul"]').fill(judul);
    const tanggalDepan = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    await tambahForm.locator('input[name="tanggal"]').fill(tanggalDepan);
    await tambahForm.locator('select[name="jenis"]').selectOption("Kegiatan");
    await tambahForm.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/kepsek\/kalender/);
    await expect(page.getByText(judul).first()).toBeVisible();
  });

  test("positif: edit agenda mengubah judulnya", async ({ page }) => {
    await page.goto("/kepsek/kalender");
    const row = page.locator(ROW_SELECTOR, { has: page.getByRole("button", { name: "Edit" }) }).first();
    await row.getByRole("button", { name: "Edit" }).click();
    const judulBaru = `Diubah ${Date.now()}`;
    await page.locator('dialog[open] input[name="judul"]').fill(judulBaru);
    await confirmDialogSubmit(page, "Simpan perubahan");
    await expect(page.getByText(judulBaru).first()).toBeVisible();
  });

  test("positif: hapus agenda menghilangkannya dari daftar", async ({ page }) => {
    await page.goto("/kepsek/kalender");
    const judul = `Hapus Test ${Date.now()}`;
    await page.getByText("+ Tambah agenda").click();
    const tambahForm = page.locator('form[action="/api/agenda"]');
    await tambahForm.locator('input[name="judul"]').fill(judul);
    await tambahForm.locator('input[name="tanggal"]').fill(new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10));
    await tambahForm.locator('button[type="submit"]').click();
    await expect(page.getByText(judul).first()).toBeVisible();

    const row = page.locator(ROW_SELECTOR, { hasText: judul }).last();
    await row.getByRole("button", { name: "Hapus" }).click();
    await confirmDialogSubmit(page, "Ya, hapus");
    await expect(page.getByText(judul)).not.toBeVisible();
  });
});

test.describe("Kalender — semua peran bisa lihat, cuma Kepsek/TU bisa kelola (1.7/1.8)", () => {
  for (const role of ["guru", "ortu", "murid"] as const) {
    test(`positif: ${role} bisa buka kalender (read-only, tanpa form tambah)`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: `tests/e2e/.auth/${role}.json` });
      const page = await context.newPage();
      const path = role === "guru" ? "/guru/kalender" : role === "ortu" ? "/ortu/kalender" : "/murid/kalender";
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Kalender Akademik" })).toBeVisible();
      await expect(page.getByText("+ Tambah agenda")).not.toBeVisible();
      await context.close();
    });
  }

  test("negatif: guru tidak bisa POST langsung ke /api/agenda (dilindungi role check di route handler)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const res = await context.request.post("/api/agenda", {
      form: { judul: "Coba injeksi guru", tanggal: "2026-09-01", jenis: "Kegiatan" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
    await context.close();
  });
});
