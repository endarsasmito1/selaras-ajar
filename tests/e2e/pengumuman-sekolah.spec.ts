import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";
import { confirmDialogSubmit } from "./helpers/ui";

test.describe("Pengumuman Sekolah (21.1-21.4)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: kepsek terbitkan pengumuman baru, muncul di daftar & widget dashboard", async ({ page }) => {
    const judul = `Pengumuman Uji ${Date.now()}`;
    await page.goto("/kepsek/pengumuman");
    await page.fill('input[name="judul"]', judul);
    await page.fill('textarea[name="isi"]', "Isi pengumuman uji otomatis.");
    await page.getByRole("button", { name: "Terbitkan" }).click();
    await expect(page).not.toHaveURL(/error=/);
    await expect(page.getByRole("heading", { name: judul })).toBeVisible();

    await page.goto("/kepsek");
    // Judul widget-nya "📣 Pengumuman" (PengumumanNotifCard) — bukan "...terbaru", teks itu gak
    // pernah ada di komponennya (lihat src/components/PengumumanWidget.tsx).
    await expect(page.getByText("📣 Pengumuman", { exact: true })).toBeVisible();
    await expect(page.getByText(judul)).toBeVisible();
  });

  test("negatif: submit pengumuman tanpa judul/isi ditolak validasi required", async ({ page }) => {
    await page.goto("/kepsek/pengumuman");
    await page.getByRole("button", { name: "Terbitkan" }).click();
    // Validasi HTML5 required mencegah submit — tetap di halaman yang sama, bukan redirect sukses.
    await expect(page).toHaveURL(/\/kepsek\/pengumuman$/);
  });

  test("positif: hapus pengumuman menghilangkannya dari daftar", async ({ page }) => {
    // Sengaja HINDARI kata "hapus" di judul/isi sendiri (mis. "Dihapus") — getByText cocok
    // substring case-insensitive, jadi "Dihapus"/"dihapus" ikut ketangkep saat mencari tombol "Hapus".
    const judul = `Pengumuman Sementara ${Date.now()}`;
    await page.goto("/kepsek/pengumuman");
    await page.fill('input[name="judul"]', judul);
    await page.fill('textarea[name="isi"]', "Konten uji, akan dibersihkan.");
    await page.getByRole("button", { name: "Terbitkan" }).click();
    await expect(page.getByRole("heading", { name: judul })).toBeVisible();

    // Scoping ke div baris spesifik (class unik "px-4 py-3.5", beda dari card form di atasnya)
    // yg SUNGGUH punya heading judul ini sbg anak langsung — bukan cuma "ada teks judul di suatu
    // tempat" (div pembungkus terluar jg "punya" teks itu krn keturunannya, cakupannya kelewat luas).
    const row = page.locator("div.px-4.py-3\\.5", { has: page.getByRole("heading", { name: judul }) });
    await row.getByRole("button", { name: "Hapus", exact: true }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    await expect(page.getByRole("heading", { name: judul })).toHaveCount(0);
  });
});

test.describe("Pengumuman Sekolah — widget lintas dashboard (21.1)", () => {
  // Feedback teknis (Sep 2026) — sebelumnya semua role dicek pakai teks "📣 Pengumuman terbaru"
  // yang GAK PERNAH ada di komponen manapun (lihat PengumumanWidget.tsx: guru pakai
  // <PengumumanBanner> tanpa heading section sama sekali per-item pakai "📣 {judul}", murid/TU
  // pakai <PengumumanNotifCard> yg headingnya "📣 Pengumuman" tanpa "terbaru"). Dipisah per gaya
  // widget yg SUNGGUH dipakai tiap role, bukan satu assertion generik yg gak match siapa pun.
  for (const role of ["murid", "tu"] as const) {
    test(`positif: dashboard ${role} menampilkan widget "📣 Pengumuman" (PengumumanNotifCard)`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: `tests/e2e/.auth/${role}.json` });
      const page = await context.newPage();
      const home = role === "tu" ? "/kepsek/siswa" : `/${role}`;
      await page.goto(home);
      await expect(page.getByText("📣 Pengumuman", { exact: true })).toBeVisible();
      await context.close();
    });
  }

  test("positif: dashboard guru menampilkan pengumuman via banner (PengumumanBanner, tanpa heading section)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/guru");
    // Banner guru gak punya judul section — tiap pengumuman tampil sbg <h4>📣 {judul}</h4> sendiri.
    await expect(page.locator("h4", { hasText: "📣" }).first()).toBeVisible();
    await context.close();
  });

  test("negatif: dashboard ortu belum punya widget pengumuman (TODO produk — lihat komentar PengumumanWidget.tsx, sengaja belum diputuskan)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const page = await context.newPage();
    await page.goto("/ortu");
    await expect(page.getByText("📣 Pengumuman", { exact: true })).toHaveCount(0);
    await context.close();
  });
});

test.describe("Pengumuman Sekolah — RBAC & isolasi (21.4-21.5)", () => {
  test("negatif: guru tidak bisa akses /kepsek/pengumuman atau POST ke API-nya", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/pengumuman");
    await expect(page).not.toHaveURL(/\/kepsek\/pengumuman$/);
    const res = await page.request.post("/api/pengumuman", { form: { judul: "x", isi: "y" } });
    expect(res.status()).toBe(403);
    await context.close();
  });

  test("negatif: pengumuman sekolah lain tidak bocor ke dashboard sekolah ini", async ({ browser }) => {
    const sekolahLain = db.sekolah.findFirst({ npsn: "10100295" }); // SD Negeri 1 Pagar Air (Fase 9)
    const judulSekolahLain = `Pengumuman Khusus Sekolah Lain ${Date.now()}`;
    const kepsekLain = await browser.newContext();
    const pageLain = await kepsekLain.newPage();
    await pageLain.goto("/login");
    await pageLain.fill("#email", `kepsek@sekolah${sekolahLain!.npsn}.demo`);
    await pageLain.fill("#password", "selaras123");
    await pageLain.click('button[type="submit"]');
    await pageLain.goto("/kepsek/pengumuman");
    await pageLain.fill('input[name="judul"]', judulSekolahLain);
    await pageLain.fill('textarea[name="isi"]', "Cuma buat sekolah lain.");
    await pageLain.getByRole("button", { name: "Terbitkan" }).click();
    await kepsekLain.close();

    const context = await browser.newContext({ storageState: "tests/e2e/.auth/kepsek.json" });
    const page = await context.newPage();
    await page.goto("/kepsek");
    await expect(page.getByText(judulSekolahLain)).toHaveCount(0);
    await context.close();
  });
});
