import { test, expect, request as playwrightRequest, type Page, type Locator } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { ACCOUNTS } from "./helpers/accounts";

/**
 * Visual regression (1.20) — screenshot diff Playwright bawaan (`toHaveScreenshot`).
 *
 * PENTING — data dummy di seed PAKAI random (nama siswa, jumlah ujian, status absensi per
 * tanggal, dst — lihat prisma/seed.ts), jadi konten tabel/angka BEDA tiap reseed meski tampilan
 * (CSS/layout) sama sekali tak berubah. Supaya test ini benar-benar mengukur regresi VISUAL
 * (bukan "data hari ini beda dari kemarin"), setiap screenshot MASK area yang datanya acak
 * (`table`, `.tabnum`, peta `.leaflet-container`) — cuma bagian struktural (sidebar, header,
 * grid card, label, form kosong) yang dibandingkan pixel-per-pixel.
 *
 * Jalan aman baik standalone MAUPUN sbg bagian suite penuh — file ini reseed DB & terbitkan ulang
 * storageState-nya SENDIRI di beforeAll (menduplikasi persis pola global-setup.ts), supaya tak
 * ketiban state sisa mutasi test file lain (kurikulum/pengumuman/tagihan baru dst yg dibuat test
 * fungsional lain akan mengacaukan tinggi tabel/daftar). Aman krn nama file ini ("visual-...")
 * alfabetis PALING TERAKHIR di antara semua *.spec.ts, jadi reseed di sini tak merusak storageState
 * yg masih dipakai file lain setelahnya (tak ada file lain setelahnya).
 *
 *   npx playwright test visual-regression                        # jalankan & bandingkan ke baseline
 *   npx playwright test visual-regression --update-snapshots     # generate ulang baseline (setelah perubahan desain yang disengaja)
 */

test.beforeAll(async ({}, testInfo) => {
  // 1.20 — reseed naik jadi ~5.5 menit setelah semua murid/kelas dikasih riwayat ujian lengkap
  // (dulu cuma 5-8 dari 30 murid/kelas), jadi timeout digenerosikan jauh di atas observasi itu.
  test.setTimeout(600_000);
  const authDir = path.join(__dirname, ".auth");
  console.log("🌱 [visual-regression] Reseed mandiri supaya bebas dari mutasi test file lain...");
  execSync("npm run db:seed", { cwd: path.resolve(__dirname, "../.."), stdio: "inherit" });

  const baseURL = testInfo.project.use.baseURL ?? "http://localhost:3000";
  const requestContext = await playwrightRequest.newContext({ baseURL });
  for (const [role, acc] of Object.entries(ACCOUNTS)) {
    const res = await requestContext.post("/api/auth/login", { form: { email: acc.email, password: acc.password }, maxRedirects: 0 });
    if (res.status() !== 303) throw new Error(`Login setup gagal untuk role ${role} (${acc.email}): status ${res.status()}`);
    await requestContext.storageState({ path: path.join(authDir, `${role}.json`) });
  }
  await requestContext.dispose();
  console.log("✓ [visual-regression] Storage state diterbitkan ulang atas data hasil reseed baru.");
});

const MASK_DINAMIS = (page: Page): Locator[] => [
  page.locator("table"),
  page.locator(".tabnum"),
  page.locator(".leaflet-container"),
];

async function siapkan(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

test.describe("Visual — halaman login (statis, tanpa data dummy)", () => {
  test("login page — kondisi awal", async ({ page }) => {
    await siapkan(page, "/login");
    await expect(page).toHaveScreenshot("login-awal.png", { fullPage: true });
  });

  test("login page — kondisi error", async ({ page }) => {
    await siapkan(page, "/login?error=1");
    await expect(page).toHaveScreenshot("login-error.png", { fullPage: true });
  });
});

const PERAN_SIDEBAR = ["superadmin", "kepsek", "tu", "guru", "ortu", "murid", "bendahara"] as const;

test.describe("Visual — sidebar navigasi per peran (struktur menu, 100% statis)", () => {
  for (const peran of PERAN_SIDEBAR) {
    test(`sidebar peran ${peran}`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: `tests/e2e/.auth/${peran}.json` });
      const page = await context.newPage();
      const home: Record<string, string> = {
        superadmin: "/superadmin",
        kepsek: "/kepsek",
        tu: "/kepsek/siswa",
        guru: "/guru",
        ortu: "/ortu",
        murid: "/murid",
        bendahara: "/keuangan",
      };
      await siapkan(page, home[peran]);
      const sidebar = page.locator("aside").first();
      await expect(sidebar).toHaveScreenshot(`sidebar-${peran}.png`);
      await context.close();
    });
  }
});

test.describe("Visual — dashboard per peran (data dinamis di-mask)", () => {
  test("dashboard superadmin", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/superadmin.json" });
    const page = await context.newPage();
    await siapkan(page, "/superadmin");
    await expect(page).toHaveScreenshot("dashboard-superadmin.png", { fullPage: true, mask: MASK_DINAMIS(page) });
    await context.close();
  });

  test("dashboard kepsek", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/kepsek.json" });
    const page = await context.newPage();
    await siapkan(page, "/kepsek");
    await expect(page).toHaveScreenshot("dashboard-kepsek.png", { fullPage: true, mask: MASK_DINAMIS(page) });
    await context.close();
  });

  test("dashboard guru", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await siapkan(page, "/guru");
    // "Jadwal mengajar hari ini" bukan <table> (list div biasa) & jumlah barisnya tergantung hari
    // ini hari apa (jadwal berbeda tiap hari) — di-mask terpisah dari MASK_DINAMIS.
    const kartuJadwal = page.locator("div", { hasText: "Jadwal mengajar hari ini" }).last();
    await expect(page).toHaveScreenshot("dashboard-guru.png", {
      fullPage: true,
      mask: [...MASK_DINAMIS(page), kartuJadwal],
    });
    await context.close();
  });

  test("dashboard murid", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const page = await context.newPage();
    await siapkan(page, "/murid");
    // fullPage TIDAK dipakai di sini — kartu "Nilai terbaru"/"Materi belajar" di bawah lipatan
    // pakai list <div> biasa (bukan <table>, luput dari MASK_DINAMIS) dgn jumlah baris acak per
    // reseed, bikin TINGGI halaman ikut berubah (bukan cuma isinya) tiap reseed. Viewport-only
    // capture tetap menguji layout header+kartu ringkasan yg paling rawan regresi CSS.
    await expect(page).toHaveScreenshot("dashboard-murid.png", { mask: MASK_DINAMIS(page) });
    await context.close();
  });

  test("dashboard ortu", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/ortu.json" });
    const page = await context.newPage();
    await siapkan(page, "/ortu");
    await expect(page).toHaveScreenshot("dashboard-ortu.png", { fullPage: true, mask: MASK_DINAMIS(page) });
    await context.close();
  });

  test("keuangan / SPP (bendahara)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/bendahara.json" });
    const page = await context.newPage();
    await siapkan(page, "/keuangan");
    // fullPage TIDAK dipakai — jumlah bar "Proyeksi keuangan" & baris tabel tagihan di bawah
    // lipatan ikut jumlah periode/tagihan yg tercatat, sedikit beda tinggi tiap reseed.
    await expect(page).toHaveScreenshot("dashboard-keuangan.png", { mask: MASK_DINAMIS(page) });
    await context.close();
  });
});

test.describe("Visual — halaman form kosong (tanpa data dummy, isi sendiri statis)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("form buat ujian baru", async ({ page }) => {
    // Kelas+mapel yg diampu Rina (5B/Matematika) hardcode di seed, bukan acak — halaman ini
    // deterministik seluruhnya, tak perlu masking.
    await siapkan(page, "/guru/ujian/baru");
    await expect(page).toHaveScreenshot("form-ujian-baru.png", { fullPage: true });
  });
});

test.describe("Visual — tambah sekolah (form pencarian, statis)", () => {
  test.use({ storageState: "tests/e2e/.auth/superadmin.json" });

  test("form tambah sekolah — langkah pencarian", async ({ page }) => {
    await siapkan(page, "/superadmin/sekolah/tambah");
    await expect(page).toHaveScreenshot("form-tambah-sekolah.png", { fullPage: true });
  });
});
