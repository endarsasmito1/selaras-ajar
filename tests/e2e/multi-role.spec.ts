import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";
import { openAccountMenu, confirmDialogSubmit } from "./helpers/ui";

// 1.20 — Tono (TU) sudah dibuat multi-role (TU + Guru) langsung dari seed, dipakai sbg akun
// contoh yang sudah bisa switch peran tanpa setup tambahan.
test.describe("Multi-role — switch peran (2.10-2.13)", () => {
  test.use({ storageState: "tests/e2e/.auth/tu.json" });

  test("positif: akun multi-role (Tono) lihat tombol switch ke peran lain & berhasil pindah", async ({ page }) => {
    await page.goto("/kepsek/siswa");
    await openAccountMenu(page);
    const tombol = page.getByRole("button", { name: "⇄ Jadi Guru" });
    await expect(tombol).toBeVisible();
    await tombol.click();
    await expect(page).toHaveURL(/\/guru/);
    await openAccountMenu(page);
    await expect(page.getByText("Guru", { exact: true })).toBeVisible();
  });

  test("negatif: POST langsung ke /api/auth/switch-role dengan kombinasi peran yang tak dimiliki ditolak", async ({ request }) => {
    const res = await request.post("/api/auth/switch-role", {
      form: { peran: "SUPERADMIN", sekolahId: "" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303);
    const loc = res.headers()["location"];
    expect(loc).toMatch(/error=1/);
  });
});

test.describe("Multi-role — akun satu peran tak lihat tombol switch (2.11)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("negatif: akun single-role tidak menampilkan tombol switch peran di menu akun", async ({ page }) => {
    await page.goto("/guru");
    await openAccountMenu(page);
    await expect(page.getByRole("button", { name: /⇄ Jadi/ })).toHaveCount(0);
  });
});

test.describe("Multi-role — kepsek assign/cabut peran tambahan (13.22-13.25)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("positif: kepsek beri peran tambahan Bendahara ke guru lain, muncul di daftar", async ({ page }) => {
    const solihin = db.pengguna.findFirst({ email: "solihin@selarasajar.demo" });
    await page.goto(`/kepsek/guru/${solihin!.id}/edit`);
    await page.selectOption('select[name="peran"]', "BENDAHARA");
    await page.getByRole("button", { name: "+ Tambah peran" }).click();
    await expect(page).not.toHaveURL(/error=/);
    const kartuPeran = page.locator("div.bg-paper-raised", { hasText: "Peran tambahan (multi-role)" });
    await expect(kartuPeran.getByText("Bendahara", { exact: true })).toBeVisible();
  });

  test("negatif: kirim peran tambahan yang sama dua kali tidak menduplikat baris", async ({ page }) => {
    const solihin = db.pengguna.findFirst({ email: "solihin@selarasajar.demo" });
    const before = db.penggunaPeran.findMany({ penggunaId: solihin!.id as string }).length;
    await page.goto(`/kepsek/guru/${solihin!.id}/edit`);
    // opsi BENDAHARA sudah tak ada di dropdown (sudah dipunya dari test sebelumnya) kalau dijalankan
    // berurutan — cek langsung ke DB via API idempotency alih-alih bergantung urutan test.
    const res = await page.request.post("/api/guru/tambah-peran", {
      form: { penggunaId: solihin!.id as string, peran: "BENDAHARA" },
    });
    expect(res.ok()).toBeTruthy();
    const after = db.penggunaPeran.findMany({ penggunaId: solihin!.id as string }).length;
    expect(after).toBe(before);
  });

  test("positif: kepsek cabut peran tambahan, hilang dari daftar", async ({ page }) => {
    const solihin = db.pengguna.findFirst({ email: "solihin@selarasajar.demo" });
    await page.goto(`/kepsek/guru/${solihin!.id}/edit`);
    const kartuPeran = page.locator("div.bg-paper-raised", { hasText: "Peran tambahan (multi-role)" });
    const row = kartuPeran.locator("form", { has: page.locator('input[name="penggunaPeranId"]') }).filter({ hasText: "Bendahara" });
    await expect(row).toBeVisible();
    // 1.21 — getByText("Cabut") jadi ambigu: dialog konfirmasi custom (ganti window.confirm native)
    // nyimpan teks "Cabut peran Bendahara dari..." permanen di DOM (cuma disembunyikan lewat
    // <dialog> tak terbuka), jadi harus scope ke tombol pemicunya secara eksplisit.
    await row.getByRole("button", { name: "Cabut", exact: true }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    // NB: "Bendahara" jangan dicek via getByText di kartuPeran — setelah dicabut, opsi "Bendahara"
    // otomatis muncul lagi di dropdown "+ Tambah peran" (sibling di kartu yg sama), jadi teks itu
    // TETAP ada di kartu meski barisnya sudah hilang. Assert langsung ke form barisnya (row) instead.
    await expect(row).toHaveCount(0);
  });
});

test.describe("Multi-role — RBAC assign/cabut peran (13.25)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("negatif: guru (bukan kepsek) tidak bisa POST ke /api/guru/tambah-peran atau /api/guru/hapus-peran", async ({ page }) => {
    const solihin = db.pengguna.findFirst({ email: "solihin@selarasajar.demo" });
    const res1 = await page.request.post("/api/guru/tambah-peran", {
      form: { penggunaId: solihin!.id as string, peran: "TU" },
    });
    expect(res1.status()).toBe(403);
    const res2 = await page.request.post("/api/guru/hapus-peran", { form: { penggunaPeranId: "apa-saja" } });
    expect(res2.status()).toBe(403);
  });
});
