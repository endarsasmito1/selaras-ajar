import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

test.describe("Master Data Kelas & Mapel (F-18)", () => {
  // Feedback teknis (Sep 2026) — seluruh describe block ini sempat gagal (strict-mode violation
  // di button[type="submit"], lalu timeout nunggu <summary> yg gak ada lagi) krn form tambah/
  // edit/impor di halaman ini sudah dipindah dari <details> ke <Drawer> (native <dialog>, lihat
  // komentar di kepsek/master-data/page.tsx) — test-nya sendiri gak pernah di-update ikut
  // perubahan itu. Sekarang: trigger di-klik dulu (buka dialog), lalu semua interaksi discope ke
  // `dialog[open]`, dan tombol submit dipilih PAKAI TEKS PERSIS (bukan `button[type="submit"]`
  // generik) krn tiap dialog sekarang juga punya tombol "Batal" (`formMethod="dialog"`) yang sama-
  // sama type="submit".
  test("positif: tambah kelas baru muncul di daftar, dikelompokkan per tingkat", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    const nama = `9Z${Date.now() % 1000}`;
    await page.getByRole("button", { name: "+ Tambah kelas manual" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog.locator('input[name="nama"]').fill(nama);
    await dialog.locator('input[name="tingkat"]').fill("6");
    await dialog.getByRole("button", { name: "Tambah kelas", exact: true }).click();
    // 1.24 — pesan sukses dipindah ke toast (`?toast=`, lihat ToastFromQuery), URL-nya sendiri
    // dibersihkan client-side sesaat sesudah toast muncul — assert teks toast, bukan query param.
    await expect(page.getByText(`Kelas "${nama}" ditambahkan.`)).toBeVisible();
    // Baris kelas sekarang trigger <Drawer> (tombol), bukan lagi <span> polos.
    await expect(page.getByRole("button", { name: nama, exact: true })).toBeVisible();
  });

  test("negatif: tambah kelas dengan nama yang sudah ada ditolak", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    await page.getByRole("button", { name: "+ Tambah kelas manual" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog.locator('input[name="nama"]').fill("5A"); // sudah ada dari seed
    await dialog.locator('input[name="tingkat"]').fill("5");
    await dialog.getByRole("button", { name: "Tambah kelas", exact: true }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.locator(".bg-warning-tint")).toContainText(/sudah ada/);
  });

  test("negatif: tambah mapel tanpa nama ditolak validasi required", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    await page.getByRole("button", { name: "+ Tambah mapel manual" }).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Tambah mapel", exact: true }).click();
    await expect(page).toHaveURL(/\/kepsek\/master-data$/); // tak lanjut, required mencegah submit
  });

  test("positif: edit nama kelas tersimpan", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    // Trigger per-baris kelas dibedakan dari trigger mapel/bobot lewat class `text-left w-full`
    // (lihat triggerClassName di page.tsx) — cukup ambil yg pertama, gak peduli kelas yg mana.
    await page.locator("button.text-left.w-full").first().click();
    const dialog = page.locator("dialog[open]");
    const namaBaru = `Edited${Date.now() % 10000}`;
    await dialog.locator('input[name="nama"]').fill(namaBaru);
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(`Kelas "${namaBaru}" diperbarui.`)).toBeVisible();
  });

  test("positif: pembobotan nilai valid (total 100%) tersimpan tanpa error", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    // Trigger bobot beda dari kelas/mapel — sama-sama `cursor-pointer font-semibold` tapi TANPA
    // `text-left` (lihat triggerClassName masing-masing di page.tsx).
    await page.locator("button.cursor-pointer.font-semibold:not(.text-left)").first().click();
    const dialog = page.locator("dialog[open]");
    await dialog.locator('input[name="bobot_Ulangan Harian"]').fill("30");
    await dialog.locator('input[name="bobot_Tugas"]').fill("20");
    await dialog.locator('input[name="bobot_UTS"]').fill("20");
    await dialog.locator('input[name="bobot_UAS"]').fill("30");
    await dialog.getByRole("button", { name: /Simpan bobot/ }).click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: pembobotan nilai tak sama dengan 100% ditolak dengan pesan jelas", async ({ page }) => {
    await page.goto("/kepsek/master-data");
    await page.locator("button.cursor-pointer.font-semibold:not(.text-left)").first().click();
    const dialog = page.locator("dialog[open]");
    await dialog.locator('input[name="bobot_Ulangan Harian"]').fill("10");
    await dialog.locator('input[name="bobot_Tugas"]').fill("10");
    await dialog.locator('input[name="bobot_UTS"]').fill("10");
    await dialog.locator('input[name="bobot_UAS"]').fill("10");
    await dialog.getByRole("button", { name: /Simpan bobot/ }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Total bobot harus 100/)).toBeVisible();
  });
});

test.describe("Master Data — akses (RBAC)", () => {
  test("positif: TU juga bisa kelola Master Data", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/tu.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/master-data");
    await expect(page.getByRole("heading", { name: "Master Data & Nilai" })).toBeVisible();
    await context.close();
  });

  test("negatif: guru tidak bisa POST ke /api/master-data/kelas", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const res = await context.request.post("/api/master-data/kelas", {
      form: { nama: "Coba Injeksi", tingkat: "1" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
    await context.close();
  });
});
