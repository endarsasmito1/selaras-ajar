import { test, expect } from "@playwright/test";
import { openAccountMenu } from "./helpers/ui";
import { ACCOUNTS } from "./helpers/accounts";
import path from "path";

test.describe("Menu Akun — info kontekstual peran + foto profil (§5.5, 1.8)", () => {
  test("positif: murid melihat info kelasnya di dropdown akun", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const page = await context.newPage();
    await page.goto("/murid");
    await openAccountMenu(page);
    await expect(page.getByText(/Kelas 5B/).first()).toBeVisible();
    await context.close();
  });

  test("positif: guru melihat mapel & kelas yang diampu di dropdown akun", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/guru");
    await openAccountMenu(page);
    await expect(page.getByText(/Guru Matematika/)).toBeVisible();
    await context.close();
  });

  test("positif: unggah foto profil format valid (PNG) berhasil & avatar berubah", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const page = await context.newPage();
    await page.goto("/murid");
    await openAccountMenu(page);
    await page.setInputFiles('input[name="foto"]', path.join(__dirname, "fixtures/avatar.png"));
    await page.getByRole("button", { name: "Unggah" }).click();
    await expect(page).toHaveURL(/\/murid/);
    await openAccountMenu(page);
    await expect(page.locator('img[alt="Ahmad Fauzi"]').first()).toBeVisible();
    await context.close();
  });

  test("negatif: unggah berkas non-gambar (.txt) ditolak dengan pesan error", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const page = await context.newPage();
    await page.goto("/ortu");
    await openAccountMenu(page);
    await page.setInputFiles('input[name="foto"]', path.join(__dirname, "fixtures/bukan-gambar.txt"));
    await page.getByRole("button", { name: "Unggah" }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Format berkas tidak didukung/)).toBeVisible();
    await context.close();
  });

  test("negatif: submit form foto tanpa memilih berkas dicegah validasi required (klien)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const page = await context.newPage();
    await page.goto("/ortu");
    await openAccountMenu(page);
    await page.getByRole("button", { name: "Unggah" }).click();
    // Input file kini required (1.9) — browser cegah submit sebelum sampai server, tetap di halaman sama.
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/ortu$/);
    await context.close();
  });

  test("positif: klik label 'Pilih dari galeri/berkas' membuka dialog pemilih berkas OS (1.9, diperbaiki)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const page = await context.newPage();
    await page.goto("/murid");
    await openAccountMenu(page);
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByText("📷 Pilih dari galeri/berkas…").click(),
    ]);
    expect(chooser).toBeTruthy();
    await context.close();
  });
});

test.describe("Menu Akun — ganti password (1.10)", () => {
  test("negatif: password lama salah ditolak", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guruLain.json" });
    const page = await context.newPage();
    await page.goto("/guru");
    await openAccountMenu(page);
    await page.getByText("Ganti password").click();
    await page.locator('input[name="passwordLama"]').fill("password-salah");
    await page.locator('input[name="passwordBaru"]').fill("passwordbaru123");
    await page.locator('input[name="konfirmasiPasswordBaru"]').fill("passwordbaru123");
    await page.getByRole("button", { name: "Simpan password baru" }).click();
    // Redirect me-reload halaman -> <details> dropdown & "Ganti password" tertutup lagi by default.
    await openAccountMenu(page);
    await page.getByText("Ganti password").click();
    await expect(page.getByText(/Password lama salah/)).toBeVisible();
    await context.close();
  });

  test("negatif: konfirmasi password baru tidak cocok ditolak", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guruLain.json" });
    const page = await context.newPage();
    await page.goto("/guru");
    await openAccountMenu(page);
    await page.getByText("Ganti password").click();
    await page.locator('input[name="passwordLama"]').fill(ACCOUNTS.guruLain.password);
    await page.locator('input[name="passwordBaru"]').fill("passwordbaru123");
    await page.locator('input[name="konfirmasiPasswordBaru"]').fill("passwordbeda456");
    await page.getByRole("button", { name: "Simpan password baru" }).click();
    await openAccountMenu(page);
    await page.getByText("Ganti password").click();
    await expect(page.getByText(/Konfirmasi password baru tidak cocok/)).toBeVisible();
    await context.close();
  });

  test("positif: ganti password berhasil, langsung bisa login dengan password baru", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guruLain.json" });
    const page = await context.newPage();
    await page.goto("/guru");
    await openAccountMenu(page);
    await page.getByText("Ganti password").click();
    const passwordBaru = "passwordbaru123";
    await page.locator('input[name="passwordLama"]').fill(ACCOUNTS.guruLain.password);
    await page.locator('input[name="passwordBaru"]').fill(passwordBaru);
    await page.locator('input[name="konfirmasiPasswordBaru"]').fill(passwordBaru);
    await page.getByRole("button", { name: "Simpan password baru" }).click();
    await openAccountMenu(page);
    await page.getByText("Ganti password").click();
    await expect(page.getByText(/Password berhasil diubah/)).toBeVisible();

    // Logout lalu login ulang pakai password baru — password lama seharusnya sudah tak berlaku.
    await page.locator('form[action="/api/auth/logout"] button').click();
    await expect(page).toHaveURL(/\/login/);
    const formLoginManual = page.locator('form[action="/api/auth/login"]').first();
    await formLoginManual.locator('input[name="email"]').fill(ACCOUNTS.guruLain.email);
    await formLoginManual.locator('input[name="password"]').fill(passwordBaru);
    await formLoginManual.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/guru/);
    await context.close();
  });
});
