import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // seluruh suite jalan lawan 1 database yang sama — hindari race antar test
  workers: 1,
  retries: 0,
  // Migrasi PostgreSQL (Sep 2026) — default 30s ternyata gak cukup lagi begitu DB jadi Supabase
  // network (bukan SQLite embedded lagi): 35 dari 264 test gagal murni krn "Test timeout of 30000ms
  // exceeded" di aksi biasa (selectOption/click/fill) yang sekarang beneran nunggu round-trip ke
  // Tokyo, bukan bug logic. CI tetap aman (Postgres service container lokal, latency ~0).
  timeout: 90_000,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Visual regression (1.20) — toleransi kecil utk anti-aliasing/font rendering antar run, bukan
  // utk menutupi perubahan data (itu tugas `mask` di tiap test, bukan threshold ini).
  //
  // Migrasi PostgreSQL (Sep 2026) — `expect()` py timeout SENDIRI (default 5s), terpisah dari
  // `timeout` test-level di atas (90s). Redirect/state-update pasca-submit yang lewat network ke
  // Supabase bisa kelewat 5s meski test-level timeout longgar — dinaikkan sama-sama jadi 15s.
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Di CI, "npm run build" udah jalan duluan sbg step terpisah (lihat deploy.yml) — pakai server
    // hasil build ("next start") drpd "next dev" biar gak kompilasi on-demand per halaman lagi
    // (dev-mode compile-on-visit numpuk berat di 107 halaman x runner GH Actions yg pas-pasan CPU-nya).
    // Lokal tetap "next dev" biar iterasinya nyaman (gak perlu build ulang tiap ubah kode).
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
