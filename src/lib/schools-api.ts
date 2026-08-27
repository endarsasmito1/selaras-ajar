/**
 * 1.12, diminta eksplisit — integrasi ke API "Data Sekolah Indonesia" (api.co.id) supaya
 * superadmin bisa cari nama sekolah lalu auto-isi alamat/NPSN/kecamatan/kabupaten/provinsi/kodepos
 * saat tambah sekolah baru. Key provider (SCHOOLS_API_KEY) HARUS cuma dipakai server-side lewat
 * modul ini — jangan pernah kirim ke browser (proxy lewat /api/superadmin/sekolah-search).
 *
 * Docs: https://docs.api.co.id/products/indonesia-schools/
 */

const BASE_URL = "https://use.api.co.id/regional/indonesia";

export type HasilPencarianSekolah = {
  npsn: string;
  nama: string;
  jenjang: string;
  alamat: string;
  kecamatan: string;
  kecamatanCode: string;
  kabupatenKota: string;
  provinsi: string;
};

export type PagingSekolah = { page: number; totalPage: number; totalItem: number };

type SchoolsListResponse = {
  is_success: boolean;
  message: string;
  // Provider tak sertakan field ini sama sekali kalau hasil pencarian nol.
  data?: {
    npsn: string;
    name: string;
    grade: string;
    address: string;
    province_name: string;
    regency_name: string;
    district_name: string;
    district_code: string;
  }[];
  paging?: { page: number; size: number; total_item: number; total_page: number };
};

type VillagesResponse = {
  is_success: boolean;
  data: { postal_codes: string[] }[];
};

/**
 * Best-effort — kodepos diambil dari desa pertama di kecamatan itu (kecamatan bisa punya beberapa
 * kodepos berbeda per desa, jadi ini cuma perkiraan awal, bukan jaminan presisi). Dipanggil HANYA
 * saat superadmin benar-benar memilih satu kandidat dari dropdown (bukan per keystroke pencarian)
 * supaya tak boros 1 request tambahan x N kandidat di tiap ketikan.
 */
export async function ambilKodePos(districtCode: string): Promise<string | null> {
  const apiKey = process.env.SCHOOLS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${BASE_URL}/districts/${districtCode}/villages?page=1`, {
      headers: { "x-api-co-id": apiKey },
    });
    if (!res.ok) return null;
    const json: VillagesResponse = await res.json();
    const kandidat = json.data?.[0]?.postal_codes?.[0] ?? null;
    // Akun non-premium dapat placeholder teks ("postal_code available only on premium"), bukan
    // kode pos sungguhan — validasi harus persis 5 digit, kalau tidak anggap tak tersedia.
    return kandidat && /^\d{5}$/.test(kandidat) ? kandidat : null;
  } catch {
    return null;
  }
}

/**
 * Cari sekolah by nama (partial match) — dipakai di form Tambah Sekolah. 1.14, diminta eksplisit:
 * tampilkan SEMUA hasil (bukan dipotong ke 10), dipaginasi lewat halaman provider sendiri (ukuran
 * tetap 100/halaman, tak bisa diubah) supaya nama umum ("SD NEGERI") yang match ribuan baris tetap
 * bisa ditelusuri semuanya, bukan cuma sepuluh hasil pertama.
 */
export async function cariSekolah(nama: string, halaman = 1): Promise<{ hasil: HasilPencarianSekolah[]; paging: PagingSekolah }> {
  const apiKey = process.env.SCHOOLS_API_KEY;
  if (!apiKey) throw new Error("SCHOOLS_API_KEY belum diisi di .env — daftar dulu di api.co.id lalu isi key-nya.");

  const res = await fetch(`${BASE_URL}/schools?name=${encodeURIComponent(nama)}&page=${halaman}`, {
    headers: { "x-api-co-id": apiKey },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Gagal memanggil API sekolah (status ${res.status})`);
  }
  const json: SchoolsListResponse = await res.json();
  if (!json.is_success) throw new Error(json.message ?? "Gagal mengambil data sekolah");

  // API provider tak sertakan field `data` sama sekali kalau hasilnya nol (bukan array kosong).
  const hasil = (json.data ?? []).map((s) => ({
    npsn: s.npsn,
    nama: s.name,
    jenjang: s.grade,
    alamat: s.address,
    kecamatan: s.district_name,
    kecamatanCode: s.district_code,
    kabupatenKota: s.regency_name,
    provinsi: s.province_name,
  }));
  const paging: PagingSekolah = {
    page: json.paging?.page ?? halaman,
    totalPage: json.paging?.total_page ?? (hasil.length > 0 ? 1 : 0),
    totalItem: json.paging?.total_item ?? hasil.length,
  };
  return { hasil, paging };
}
