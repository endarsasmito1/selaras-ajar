import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";

// 1.23 — Bab (master data per-mapel, reusable), Silabus (dokumen per-mapel), video di materi
// (upload file ATAU tautan YouTube/Vimeo, preview asli bukan cuma link).
test.describe("Materi Belajar — Bab & Silabus (1.23)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: bab baru dibuat sekali, dipakai lagi (reuse, bukan duplikat) utk materi lain di mapel sama", async ({ page }) => {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const namaBab = `Bab Uji ${Date.now()}`;

    await page.goto("/guru/materi");
    await page.selectOption("#materi-mapel-select", mapel!.id as string);
    await page.fill('input[name="judul"]', "Materi pertama");
    await page.fill('input[name="babBaru"]', namaBab);
    await page.selectOption("#tipe-materi", "catatan");
    await page.fill('textarea[name="isi"]', "Catatan pertama");
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Tambah materi" }).click()]);

    expect(db.bab.countByNamaMapel({ mapelId: mapel!.id as string, nama: namaBab })).toBe(1);

    // Materi kedua, pilih bab yang SAMA lewat dropdown (bukan ketik nama baru lagi) — harus reuse, bukan duplikat.
    await page.goto("/guru/materi");
    await page.selectOption("#materi-mapel-select", mapel!.id as string);
    await page.fill('input[name="judul"]', "Materi kedua, bab sama");
    await page.selectOption("#bab-select", { label: namaBab });
    await page.selectOption("#tipe-materi", "catatan");
    await page.fill('textarea[name="isi"]', "Catatan kedua");
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Tambah materi" }).click()]);

    expect(db.bab.countByNamaMapel({ mapelId: mapel!.id as string, nama: namaBab })).toBe(1);
  });

  test("positif: bab dgn nama sama di mapel BEDA jadi row terpisah (bukan reuse lintas mapel)", async ({ page }) => {
    // Lewat API langsung (bukan form UI) — Rina di UI cuma mengajar Matematika di 5B, dropdown
    // mapel-nya gak akan pernah nawarin IPAS; yang mau diverifikasi di sini murni logic
    // `cariAtauBuatBab()` scoping per-mapel di route-nya, bukan pembatasan mapel per-guru di UI.
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const matematika = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const ipas = db.mataPelajaran.findFirst({ nama: "IPAS" });
    const namaBab = `Bab Lintas ${Date.now()}`;

    await page.request.post("/api/materi", {
      form: { kelasId: kelas5B!.id as string, mapelId: matematika!.id as string, judul: "Materi Matematika", tipe: "catatan", isi: "x", babBaru: namaBab },
    });
    const babMatematika = db.bab.findFirst({ mapelId: matematika!.id as string });
    expect(babMatematika?.nama).toBe(namaBab);

    await page.request.post("/api/materi", {
      form: { kelasId: kelas5B!.id as string, mapelId: ipas!.id as string, judul: "Materi IPAS", tipe: "catatan", isi: "y", babBaru: namaBab },
    });
    const babIpas = db.bab.findFirst({ mapelId: ipas!.id as string });
    expect(babIpas?.nama).toBe(namaBab);
    expect(babIpas?.id).not.toBe(babMatematika?.id);
  });

  test("positif: materi video via tautan YouTube tampil sbg embed (iframe), bukan cuma link", async ({ page }) => {
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const judul = `Video Uji ${Date.now()}`;
    await page.goto("/guru/materi");
    await page.selectOption("#materi-mapel-select", mapel!.id as string);
    await page.fill('input[name="judul"]', judul);
    await page.selectOption("#tipe-materi", "video");
    await page.fill('textarea[name="isi"]', "https://www.youtube.com/watch?v=abc12345678");
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Tambah materi" }).click()]);

    await page.locator("summary", { hasText: judul }).click();
    await expect(page.locator("iframe").first()).toBeVisible();
  });

  test("positif: silabus mapel diupload sekali, muncul sbg 'tersimpan' di kunjungan berikutnya", async ({ page }) => {
    // Rina (guru.json) cuma mengajar Matematika di kelasnya (5B) — mapel lain gak muncul di dropdown-nya.
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    await page.goto("/guru/materi");
    await page.selectOption("#materi-mapel-select", mapel!.id as string);
    await expect(page.locator("#silabus-belum-ada")).toBeVisible();
    await page.setInputFiles('input[name="silabusFile"]', {
      name: "silabus.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 dummy"),
    });
    await page.fill('input[name="judul"]', "Materi dgn silabus");
    await page.selectOption("#tipe-materi", "catatan");
    await page.fill('textarea[name="isi"]', "z");
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Tambah materi" }).click()]);

    const updated = db.mataPelajaran.findFirst({ nama: "Matematika" });
    expect(updated?.silabusUrl).toBeTruthy();

    await page.goto("/guru/materi");
    await page.selectOption("#materi-mapel-select", mapel!.id as string);
    await expect(page.locator("#silabus-sudah-ada")).toBeVisible();
    await expect(page.locator("#silabus-belum-ada")).toBeHidden();
  });
});

test.describe("Ujian — bab wajib (1.23)", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("negatif: buat ujian tanpa bab (API langsung) ditolak", async ({ page }) => {
    const kelas = db.kelas.findFirst({ nama: "5B" });
    const mapel = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const res = await page.request.post("/api/ujian", {
      form: {
        judul: "Ujian Tanpa Bab API",
        penugasan: `${kelas!.id}|${mapel!.id}`,
        jenis: "UJIAN",
        jenisPenilaian: "HARIAN",
      },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303);
    expect(res.headers()["location"]).toContain("error=");
  });
});
