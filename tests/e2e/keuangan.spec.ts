import { test, expect } from "@playwright/test";
import { confirmDialogSubmit } from "./helpers/ui";

test.use({ storageState: "tests/e2e/.auth/bendahara.json" });

test.describe("Keuangan / SPP (F-14, popup konfirmasi lunas)", () => {
  test("positif: tandai tagihan lunas lewat popup konfirmasi — status berubah jadi Lunas", async ({ page }) => {
    // 1.21 — daftar tagihan + aksi "Tandai lunas" dipindah ke /keuangan/riwayat (dashboard /keuangan
    // sekarang cuma ringkasan+breakdown, bukan tabel per-baris tagihan lagi).
    await page.goto("/keuangan/riwayat");
    const row = page.locator("tbody tr", { has: page.getByRole("button", { name: "Tandai lunas" }) }).first();
    await expect(row).toBeVisible();
    const namaSiswa = await row.locator("td").first().textContent();

    await row.getByRole("button", { name: "Tandai lunas" }).click();
    await confirmDialogSubmit(page, "Konfirmasi lunas");

    await expect(page).toHaveURL(/\/keuangan\/riwayat/);
    if (namaSiswa) {
      const rowSetelah = page.locator("tbody tr", { hasText: namaSiswa.trim() }).first();
      await expect(rowSetelah.getByText("Lunas")).toBeVisible();
    }
  });

  test("positif: filter periode SPP menampilkan data periode terpilih", async ({ page }) => {
    await page.goto("/keuangan");
    const select = page.locator('select[name="periode"]');
    const opsiKedua = await select.locator("option").nth(1).getAttribute("value");
    if (opsiKedua) {
      await select.selectOption(opsiKedua);
      await page.getByRole("button", { name: "Tampilkan" }).click();
      // Form GET native pakai encoding query-string standar (spasi -> "+"), bukan encodeURIComponent ("%20").
      await expect(page).toHaveURL(new RegExp(`periode=${encodeURIComponent(opsiKedua).replace(/%20/g, "\\+")}`));
    }
  });

  test("negatif: menutup popup (✕) tanpa submit tidak mengubah status tagihan", async ({ page }) => {
    await page.goto("/keuangan/riwayat");
    const row = page.locator("tbody tr", { has: page.getByRole("button", { name: "Tandai lunas" }) }).first();
    const namaSiswa = (await row.locator("td").first().textContent())?.trim();
    await row.getByRole("button", { name: "Tandai lunas" }).click();
    await page.locator('dialog[open] button[aria-label="Tutup"]').click();
    await page.reload();
    if (namaSiswa) {
      const rowSetelah = page.locator("tbody tr", { hasText: namaSiswa }).first();
      await expect(rowSetelah.getByText("Belum bayar")).toBeVisible();
    }
  });
});

test.describe("Keuangan — akses ditolak untuk peran non-keuangan (negatif)", () => {
  test("guru tidak bisa akses /keuangan", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/keuangan");
    await expect(page).toHaveURL(/\/guru/);
    await context.close();
  });
});
