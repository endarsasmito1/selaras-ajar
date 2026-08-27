/**
 * Daftar mata pelajaran resmi Kurikulum Merdeka per jenjang — dipakai sebagai preset "Isi sesuai
 * Kurikulum Merdeka" di Master Data (kepsek) dan sebagai acuan data dummy (seed.ts). SMA & SMK
 * cuma memuat mapel kelompok umum (bukan peminatan/kejuruan, karena itu berbeda-beda per sekolah)
 * — kepsek tetap bisa tambah manual mapel spesifik sekolahnya lewat "+ Tambah mapel manual".
 */
export const KURIKULUM_MAPEL: Record<"SD" | "SMP" | "SMA" | "SMK", { nama: string; kkm: number }[]> = {
  SD: [
    { nama: "Pendidikan Agama", kkm: 75 },
    { nama: "PPKn", kkm: 70 },
    { nama: "Bahasa Indonesia", kkm: 72 },
    { nama: "Matematika", kkm: 70 },
    { nama: "IPAS", kkm: 70 },
    { nama: "PJOK", kkm: 75 },
    { nama: "Seni Budaya", kkm: 75 },
    { nama: "Bahasa Inggris", kkm: 70 },
  ],
  SMP: [
    { nama: "Pendidikan Agama", kkm: 75 },
    { nama: "PPKn", kkm: 70 },
    { nama: "Bahasa Indonesia", kkm: 72 },
    { nama: "Matematika", kkm: 70 },
    { nama: "IPA", kkm: 70 },
    { nama: "IPS", kkm: 70 },
    { nama: "Bahasa Inggris", kkm: 70 },
    { nama: "PJOK", kkm: 75 },
    { nama: "Informatika", kkm: 70 },
    { nama: "Seni Budaya", kkm: 75 },
    { nama: "Prakarya", kkm: 75 },
  ],
  SMA: [
    { nama: "Pendidikan Agama", kkm: 75 },
    { nama: "PPKn", kkm: 70 },
    { nama: "Bahasa Indonesia", kkm: 72 },
    { nama: "Matematika", kkm: 70 },
    { nama: "Bahasa Inggris", kkm: 70 },
    { nama: "PJOK", kkm: 75 },
    { nama: "Informatika", kkm: 70 },
    { nama: "Seni Budaya", kkm: 75 },
    { nama: "Sejarah", kkm: 70 },
  ],
  SMK: [
    { nama: "Pendidikan Agama", kkm: 75 },
    { nama: "PPKn", kkm: 70 },
    { nama: "Bahasa Indonesia", kkm: 72 },
    { nama: "Matematika", kkm: 70 },
    { nama: "Bahasa Inggris", kkm: 70 },
    { nama: "PJOK", kkm: 75 },
    { nama: "Informatika", kkm: 70 },
    { nama: "IPAS", kkm: 70 },
    { nama: "Projek Kreatif dan Kewirausahaan", kkm: 70 },
  ],
};
