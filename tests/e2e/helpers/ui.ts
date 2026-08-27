import type { Page } from "@playwright/test";

/** SoalEditor (SunEditor WYSIWYG) nyimpan HTML ke <input type="hidden" name="pertanyaan">, bukan
 * <textarea> polos — hidden input tak bisa di-.fill() (butuh visible), jadi set value DOM langsung. */
export async function isiPertanyaan(page: Page, teks: string) {
  await page.locator('input[name="pertanyaan"]').evaluate((el, val) => {
    (el as HTMLInputElement).value = val;
  }, teks);
}

/** Dropdown akun (pojok kanan atas, AccountMenu) dibungkus <details> tertutup by default.
 * Pakai "> summary" (direct-child) — sejak 1.10 ada <details> "Ganti password" bersarang di
 * dalamnya, dan selector tanpa ">" ikut mencocokkan summary bersarang itu juga (strict-mode error). */
export async function openAccountMenu(page: Page) {
  await page.locator('details:has(form[action="/api/auth/logout"]) > summary').click();
}

/** Popup konfirmasi berbasis <dialog> (ConfirmDialog component) — trigger dulu, baru submit di dalamnya. */
export async function confirmDialogSubmit(page: Page, buttonText: string | RegExp) {
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("button", { name: buttonText }).click();
}

/** Beberapa form (mis. absensi) pakai window.confirm() native (ConfirmSubmitButton), bukan <dialog> —
 * tanpa handler ini Playwright auto-dismiss dialog native & form batal terkirim. */
export function acceptNativeConfirm(page: Page) {
  page.once("dialog", (d) => d.accept());
}

/**
 * 1.13 — Tambah Sekolah sekarang alur 2 langkah (cari nama -> pilih hasil, atau "Tambah manual"
 * kalau tak ketemu) di halaman terpisah /superadmin/sekolah/tambah. Query pencarian dipakai
 * dijamin tak match sekolah nyata manapun (nama acak + timestamp) supaya test selalu jatuh ke
 * cabang "Tambah manual" secara deterministik, bukan bergantung hasil API eksternal.
 */
export async function bukaFormTambahSekolahManual(page: Page, queryPencarian: string) {
  await page.goto("/superadmin/sekolah/tambah");
  await page.fill('input[placeholder*="Cari nama sekolah"]', queryPencarian);
  await page.getByRole("button", { name: "Cari" }).click();
  await page.getByRole("button", { name: /Tambah manual/ }).click();
  await page.waitForSelector('input[name="nama"]');
}
