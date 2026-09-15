import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // seluruh suite jalan lawan 1 SQLite file yang sama — hindari race antar test
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Visual regression (1.20) — toleransi kecil utk anti-aliasing/font rendering antar run, bukan
  // utk menutupi perubahan data (itu tugas `mask` di tiap test, bukan threshold ini).
  expect: {
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
