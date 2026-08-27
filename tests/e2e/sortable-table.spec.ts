import { test, expect } from "@playwright/test";

// 1.20 — SortableTable dipakai di ~18 halaman list (Data Siswa, Data Guru, Kelola Sekolah
// superadmin, dll), pola & komponennya sama persis — cukup 1 halaman representatif (Kelola
// Sekolah, kolom numerik jelas) utk uji generik klik-header-sort, bukan diulang di tiap halaman.
test.describe("Sortable Table — klik header sort (23.1-23.3)", () => {
  test.use({ storageState: "tests/e2e/.auth/superadmin.json" });

  test("positif: klik header kolom Siswa mengurutkan ascending, klik lagi jadi descending", async ({ page }) => {
    await page.goto("/superadmin/sekolah");
    const headerSiswa = page.locator("th button", { hasText: "Siswa" });
    await headerSiswa.click();
    const nilaiAsc = await page.locator("tbody tr td:nth-child(7)").allTextContents();
    const angkaAsc = nilaiAsc.map((t) => Number(t.trim()));
    const terurutAsc = [...angkaAsc].sort((a, b) => a - b);
    expect(angkaAsc).toEqual(terurutAsc);

    await headerSiswa.click();
    const nilaiDesc = await page.locator("tbody tr td:nth-child(7)").allTextContents();
    const angkaDesc = nilaiDesc.map((t) => Number(t.trim()));
    const terurutDesc = [...angkaDesc].sort((a, b) => b - a);
    expect(angkaDesc).toEqual(terurutDesc);
  });

  test("positif: klik header kolom lain (Sekolah) memindahkan acuan sort", async ({ page }) => {
    await page.goto("/superadmin/sekolah");
    await page.locator("th button", { hasText: "Siswa" }).click(); // sort by Siswa dulu
    await page.locator("th button", { hasText: "Sekolah" }).click(); // lalu pindah ke kolom Sekolah
    const namaList = await page.locator("tbody tr td:nth-child(1)").allTextContents();
    const namaTerurut = [...namaList].sort((a, b) => a.localeCompare(b, "id"));
    expect(namaList.map((n) => n.trim())).toEqual(namaTerurut.map((n) => n.trim()));
  });
});

test.describe("Sortable Table — daftar kosong tak error (23.4)", () => {
  test.use({ storageState: "tests/e2e/.auth/kepsek.json" });

  test("negatif: pencarian siswa tanpa hasil menampilkan pesan kosong, bukan error", async ({ page }) => {
    await page.goto(`/kepsek/siswa?q=${encodeURIComponent("NamaTidakAdaSamaSekaliXYZ999")}`);
    await expect(page.getByText("Tidak ada siswa yang cocok.")).toBeVisible();
  });
});
