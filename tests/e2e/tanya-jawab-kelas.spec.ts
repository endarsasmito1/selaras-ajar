import { test, expect } from "@playwright/test";
import { db } from "./helpers/db";
import { confirmDialogSubmit } from "./helpers/ui";

// 1.23 — Tanya Jawab Kelas: fitur baru terpisah dari Diskusi (KomentarKonten), per kelas+mapel.
// Rina (guru) ngajar Matematika di kelas 5B (walinya juga); Ahmad Fauzi (murid) di kelas 5B;
// Ahmad Solihin (guruLain) ngajar Bahasa Indonesia di kelas 5B — dipakai utk uji isolasi guru.

test.describe("Tanya Jawab Kelas — murid", () => {
  test.use({ storageState: "tests/e2e/.auth/murid.json" });

  test("positif: murid kirim pertanyaan anonim, tampil sbg 'Anonim' (bukan nama asli) di panel murid", async ({ page }) => {
    // Rute /murid/tanya-jawab baru (1.23) — first-hit dev server (Turbopack) bisa kompilasi lama.
    test.slow();
    const mapelMtk = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const teks = `Pertanyaan anonim uji ${Date.now()}`;

    await page.goto(`/murid/tanya-jawab?mapel=${mapelMtk!.id as string}`);
    // Scope ke <main> — form:not(:has(parentId)) tanpa scope ikut kena form logout AppShell di
    // header (yg juga "tak punya parentId"), form pertama versi tak-terscope jadi form yg salah.
    const formBaru = page.locator("main").locator('form:not(:has(input[name="parentId"]))').first();
    await formBaru.locator('input[name="isi"]').fill(teks);
    await formBaru.locator('input[name="anonim"]').check();
    await formBaru.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/murid\/tanya-jawab/);

    // Scope ke kartu pertanyaan spesifik (bukan sembarang <div> — ada banyak div pembungkus
    // bersarang di AppShell yang juga "mengandung" teks ini kalau dicocokkan tanpa kelas).
    const kartu = page.locator(".bg-paper-raised.border-rule.rounded-lg.p-3", { hasText: teks }).first();
    // Scope ke baris penulis (.text-xs.font-semibold) — "Anonim" tanpa scope ini juga nyangkut
    // di label checkbox "Kirim sebagai anonim" di form yang sama (strict-mode violation).
    const barisPenulis = kartu.locator(".text-xs.font-semibold").first();
    await expect(barisPenulis).toContainText("Anonim");
    await expect(barisPenulis).not.toContainText("Ahmad Fauzi");
  });

  test("negatif: halaman murid tidak punya tombol Hapus sama sekali (bukan moderator)", async ({ page }) => {
    const mapelMtk = db.mataPelajaran.findFirst({ nama: "Matematika" });
    await page.goto(`/murid/tanya-jawab?mapel=${mapelMtk!.id as string}`);
    await expect(page.getByText("Hapus", { exact: true })).toHaveCount(0);
  });

  test("negatif: POST langsung ke /api/tanya-jawab/hapus sbg murid ditolak 403 (tak ada jalur hapus utk murid)", async ({ page }) => {
    const res = await page.request.post("/api/tanya-jawab/hapus", {
      form: { tanyaJawabId: "apapun" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("Tanya Jawab Kelas — guru", () => {
  test.use({ storageState: "tests/e2e/.auth/guru.json" });

  test("positif: guru tetap lihat nama asli murid meski pertanyaannya ditandai anonim (buat moderasi)", async ({ page }) => {
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const mapelMtk = db.mataPelajaran.findFirst({ nama: "Matematika" });
    await page.goto(`/guru/tanya-jawab?kelas=${kelas5B!.id as string}&mapel=${mapelMtk!.id as string}`);
    // .first() — data seed sendiri juga sudah punya 1 thread anonim demo di kelas+mapel yang sama,
    // jadi bisa ada >1 kecocokan; cukup pastikan minimal satu yang tampil, bukan yang mana.
    await expect(page.getByText(/Ahmad Fauzi \(anonim\)/).first()).toBeVisible();
  });

  test("positif: guru hapus pertanyaan, balasannya ikut terhapus (cascade)", async ({ page }) => {
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const mapelMtk = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const rina = db.pengguna.findFirst({ email: "rina@selarasajar.demo" });
    const ahmad = db.pengguna.findFirst({ email: "ahmad@selarasajar.demo" });

    const parentId = db.tanyaJawabKelas.create({
      kelasId: kelas5B!.id as string,
      mapelId: mapelMtk!.id as string,
      penggunaId: ahmad!.id as string,
      isi: `Pertanyaan buat dihapus ${Date.now()}`,
    });
    db.tanyaJawabKelas.create({
      kelasId: kelas5B!.id as string,
      mapelId: mapelMtk!.id as string,
      penggunaId: rina!.id as string,
      isi: "Balasan yang harus ikut kehapus",
      parentId,
    });
    expect(db.tanyaJawabKelas.countByParent(parentId)).toBe(1);

    await page.goto(`/guru/tanya-jawab?kelas=${kelas5B!.id as string}&mapel=${mapelMtk!.id as string}`);
    const kartu = page.locator(".bg-paper-raised.border-rule.rounded-lg.p-3", { hasText: "Pertanyaan buat dihapus" }).first();
    await kartu.getByText("Hapus", { exact: true }).first().click();
    await Promise.all([page.waitForNavigation(), confirmDialogSubmit(page, "Ya, lanjutkan")]);

    expect(db.tanyaJawabKelas.findById(parentId)).toBeUndefined();
    expect(db.tanyaJawabKelas.countByParent(parentId)).toBe(0);
  });

  test("negatif: guru yang tak mengajar mapel itu di kelas itu tak bisa hapus (isolasi lintas guru/mapel)", async ({ browser }) => {
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const mapelMtk = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const ahmad = db.pengguna.findFirst({ email: "ahmad@selarasajar.demo" });

    const targetId = db.tanyaJawabKelas.create({
      kelasId: kelas5B!.id as string,
      mapelId: mapelMtk!.id as string,
      penggunaId: ahmad!.id as string,
      isi: `Pertanyaan Matematika, coba dihapus guru Bahasa Indonesia ${Date.now()}`,
    });

    // Solihin ngajar Bahasa Indonesia (bukan Matematika) di kelas 5B yang sama — pakai storageState
    // guruLain (bukan guru/Rina) di request context terpisah supaya session-nya bener2 milik Solihin.
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guruLain.json" });
    const res = await context.request.post("/api/tanya-jawab/hapus", {
      form: { tanyaJawabId: targetId },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303);
    expect(db.tanyaJawabKelas.findById(targetId)).toBeDefined();
    await context.close();
  });
});

test.describe("Tanya Jawab Kelas — isolasi lintas kelas/mapel", () => {
  test.use({ storageState: "tests/e2e/.auth/murid.json" });

  test("positif: pertanyaan di mapel Matematika tak muncul di tab mapel lain (Bahasa Indonesia)", async ({ page }) => {
    const kelas5B = db.kelas.findFirst({ nama: "5B" });
    const mapelMtk = db.mataPelajaran.findFirst({ nama: "Matematika" });
    const mapelBindo = db.mataPelajaran.findFirst({ nama: "Bahasa Indonesia" });
    const ahmad = db.pengguna.findFirst({ email: "ahmad@selarasajar.demo" });

    const teks = `Pertanyaan khusus Matematika ${Date.now()}`;
    db.tanyaJawabKelas.create({
      kelasId: kelas5B!.id as string,
      mapelId: mapelMtk!.id as string,
      penggunaId: ahmad!.id as string,
      isi: teks,
    });

    await page.goto(`/murid/tanya-jawab?mapel=${mapelBindo!.id as string}`);
    await expect(page.getByText(teks)).toHaveCount(0);

    await page.goto(`/murid/tanya-jawab?mapel=${mapelMtk!.id as string}`);
    await expect(page.getByText(teks)).toBeVisible();
  });
});
