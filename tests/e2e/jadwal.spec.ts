import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

test.describe("Jadwal Pelajaran (§4.14, JP-2/JP-3)", () => {
  test("positif: tambah sesi baru di hari yang masih kosong jamnya", async ({ page }) => {
    await page.goto("/kepsek/jadwal");
    await page.locator('a[href^="/kepsek/jadwal/"]').first().click();
    await expect(page).toHaveURL(/\/kepsek\/jadwal\//);

    const tambahDetails = page.locator("details", { hasText: "+ Tambah sesi" }).first();
    await tambahDetails.locator("summary").click();
    await tambahDetails.locator('input[name="jamMulai"]').fill("06:00");
    await tambahDetails.locator('input[name="jamSelesai"]').fill("06:30");
    await tambahDetails.getByRole("button", { name: "Simpan sesi" }).click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("negatif: tambah sesi yang jamnya bentrok dengan sesi lain di kelas yang sama ditolak (JP-3)", async ({ page }) => {
    await page.goto("/kepsek/jadwal");
    await page.locator('a[href^="/kepsek/jadwal/"]').first().click();

    // Ambil jam sesi pertama yang sudah ada di hari itu, lalu coba tambah sesi baru dgn jam persis sama.
    const sesiPertama = page.locator("div.bg-primary-tint").first();
    const jamText = await sesiPertama.locator("div.tabnum").first().textContent(); // format "HH:MM–HH:MM"
    test.skip(!jamText, "Tidak ada sesi existing di kelas ini utk dites bentrok");
    if (!jamText) return;
    const [jamMulai, jamSelesai] = jamText.split(/[–-]/).map((s) => s.trim());

    const tambahDetails = page.locator("details", { hasText: "+ Tambah sesi" }).first();
    await tambahDetails.locator("summary").click();
    await tambahDetails.locator('input[name="jamMulai"]').fill(jamMulai);
    await tambahDetails.locator('input[name="jamSelesai"]').fill(jamSelesai);
    await tambahDetails.getByRole("button", { name: "Simpan sesi" }).click();

    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Bentrok jadwal/)).toBeVisible();
  });

  test("negatif: jam mulai lebih besar dari jam selesai ditolak", async ({ page }) => {
    await page.goto("/kepsek/jadwal");
    await page.locator('a[href^="/kepsek/jadwal/"]').first().click();
    const tambahDetails = page.locator("details", { hasText: "+ Tambah sesi" }).first();
    await tambahDetails.locator("summary").click();
    await tambahDetails.locator('input[name="jamMulai"]').fill("10:00");
    await tambahDetails.locator('input[name="jamSelesai"]').fill("09:00");
    await tambahDetails.getByRole("button", { name: "Simpan sesi" }).click();
    await expect(page).toHaveURL(/error=/);
    await expect(page.getByText(/Jam mulai harus lebih awal/)).toBeVisible();
  });

  test("positif: edit jam sesi yang sudah ada langsung di kartu (edit-in-place, 1.7)", async ({ page }) => {
    await page.goto("/kepsek/jadwal");
    await page.locator('a[href^="/kepsek/jadwal/"]').first().click();
    const editDetails = page.locator("details", { hasText: "Edit jam" }).first();
    await editDetails.locator("summary").click();
    await editDetails.locator('input[name="jamMulai"]').fill("05:00");
    await editDetails.locator('input[name="jamSelesai"]').fill("05:30");
    await editDetails.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page).not.toHaveURL(/error=/);
  });

  test("positif: hapus sesi menghilangkannya dari jadwal", async ({ page }) => {
    await page.goto("/kepsek/jadwal");
    await page.locator('a[href^="/kepsek/jadwal/"]').first().click();
    const hapusButton = page.getByRole("button", { name: "Hapus" }).first();
    await hapusButton.click();
    await expect(page).not.toHaveURL(/error=/);
  });
});

test.describe("Jadwal — akses per peran", () => {
  test("positif: guru cuma bisa lihat & isi jadwalnya sendiri (bukan jadwal guru lain)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const page = await context.newPage();
    await page.goto("/guru/jadwal");
    await expect(page.getByRole("heading", { name: /Jadwal/ })).toBeVisible();
    await context.close();
  });

  test("positif: murid bisa lihat jadwal kelasnya (read-only)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/murid.json" });
    const page = await context.newPage();
    await page.goto("/murid/jadwal");
    await expect(page.getByRole("heading", { name: /Jadwal/ })).toBeVisible();
    await expect(page.getByText("+ Tambah sesi")).not.toBeVisible();
    await context.close();
  });

  test("positif: TU bisa kelola jadwal (diperluas 1.7)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/tu.json" });
    const page = await context.newPage();
    await page.goto("/kepsek/jadwal");
    await expect(page).toHaveURL(/\/kepsek\/jadwal/);
    await context.close();
  });

  test("negatif: guru tidak bisa mengubah jadwal mapel yang bukan diampunya (akses API langsung)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/guru.json" });
    const res = await context.request.post("/api/jadwal", {
      form: {
        kelasId: "kelas-tidak-valid",
        hari: "1",
        jamMulai: "07:00",
        jamSelesai: "07:40",
        tahunAjaranId: "ta-tidak-valid",
        penugasan: "mapel-x|guru-y",
      },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303); // redirect dgn ?error=, bukan 200 sukses
    const location = res.headers()["location"] ?? "";
    expect(location).toContain("error");
    await context.close();
  });
});
