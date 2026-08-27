import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";
import { confirmDialogSubmit } from "./helpers/ui";

test.describe("Absensi lanjutan — catatan & tanggal/hari (3.5-3.6)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: tanggal & hari ditampilkan menonjol di atas tabel Isi Absensi", async ({ page }) => {
    await page.goto("/guru/absensi");
    await expect(page.getByText("Mengisi absensi untuk")).toBeVisible();
    const label = page.locator("p.font-serif.text-lg.text-primary-deep");
    await expect(label).toBeVisible();
    const teks = await label.textContent();
    expect(teks).toMatch(/\d{4}/); // ada tahun -> tanggal lengkap, bukan cuma placeholder
  });

  test("positif: guru isi catatan per murid saat absensi, tersimpan", async ({ page }) => {
    await page.goto("/guru/absensi");
    const catatanInput = page.locator('input[name^="catatan_"]').first();
    const catatan = `Catatan uji ${Date.now()}`;
    await catatanInput.fill(catatan);
    await page.getByRole("button", { name: "Simpan absensi" }).click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);
    await page.waitForLoadState("networkidle");
    await page.goto("/guru/absensi");
    const catatanTersimpan = page.locator('input[name^="catatan_"]').first();
    await expect(catatanTersimpan).toHaveValue(catatan);
  });

  test("positif: riwayat absensi tampilkan status berbeda dgn Pill tone masing-masing (Hadir/Sakit/Izin/Alpa)", async ({ page }) => {
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const tanggal = db.absensi.findTanggalDenganStatusBeragam(kelas5B!.id as string);
    test.skip(!tanggal, "Tidak ada tanggal dgn status beragam di data seed kelas 5B saat ini");
    if (!tanggal) return;
    await page.goto(`/guru/absensi?tab=riwayat&tanggal=${tanggal}`);
    const statusUnik = new Set(await page.locator("tbody td:nth-child(2)").allTextContents());
    expect(statusUnik.size).toBeGreaterThan(1);
  });
});

// 1.23 — datepicker Isi Absensi (gak bisa pilih tanggal depan) + indikator izin pending inline.
test.describe("Absensi lanjutan — datepicker & indikator izin pending (1.23)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: input tanggal Isi Absensi ada atribut max = hari ini (gak bisa pilih tanggal depan)", async ({ page }) => {
    await page.goto("/guru/absensi");
    const todayStr = new Date().toISOString().slice(0, 10);
    const tanggalInput = page.locator('input[type="date"][name="tanggal"]');
    await expect(tanggalInput).toHaveAttribute("max", todayStr);
  });

  test("negatif: POST langsung ke /api/absensi dgn tanggal masa depan di-fallback ke hari ini (server-side guard)", async ({ page }) => {
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const besok = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await page.request.post("/api/absensi", {
      form: { kelasId: kelas5B!.id as string, tanggal: besok },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303);
    const lokasi = res.headers()["location"];
    expect(lokasi).not.toContain(`tanggal=${besok}`);
  });

  test("positif: pengajuan izin MENUNGGU muncul sbg badge di baris murid & bisa disetujui inline dari Isi Absensi", async ({ page }) => {
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const kelas5BId = kelas5B!.id as string;
    const siswaDb = db.siswa.findFirst({ kelasId: kelas5BId });
    test.skip(!siswaDb, "Tidak ada siswa di kelas 5B pada data seed saat ini");
    if (!siswaDb) return;
    const wali = db.waliSiswa.findFirst({ siswaId: siswaDb.id as string });
    test.skip(!wali, "Siswa ini belum punya wali di data seed saat ini");
    if (!wali) return;

    const todayIso = new Date().toISOString();
    const pengajuanId = db.pengajuanIzin.createMenunggu({
      siswaId: siswaDb.id as string,
      diajukanOlehId: wali.penggunaId as string,
      tanggalIso: todayIso,
      jenis: "SAKIT",
      keterangan: "Demam — uji indikator absensi",
    });

    await page.goto(`/guru/absensi?kelas=${kelas5BId}&tab=isi`);
    await expect(page.getByText(/Izin diajukan — Sakit/)).toBeVisible();
    await page.getByRole("button", { name: "Setujui" }).click();
    await expect(page).toHaveURL(/\/guru\/absensi/);

    const updated = db.pengajuanIzin.findById(pengajuanId);
    expect(updated?.status).toBe("DISETUJUI");
    // Setujui izin men-upsert Absensi (SAKIT) — badge "Izin diajukan" harus hilang setelah diputuskan.
    await expect(page.getByText(/Izin diajukan — Sakit/)).not.toBeVisible();
  });
});
