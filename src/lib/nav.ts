import type { NavGroup } from "@/components/AppShell";

export const NAV_SUPERADMIN: NavGroup[] = [
  {
    items: [
      { href: "/superadmin", label: "Ringkasan Platform", icon: "▦" },
      { href: "/superadmin/sekolah", label: "Sekolah", icon: "🏫" },
      { href: "/superadmin/revenue", label: "Revenue", icon: "₽" },
      { href: "/superadmin/kurikulum", label: "Kurikulum", icon: "📚" },
      { href: "/superadmin/bank-soal", label: "Bank Soal", icon: "✎" },
    ],
  },
];

export const NAV_KEPSEK: NavGroup[] = [
  { items: [{ href: "/kepsek", label: "Ringkasan", icon: "▦" }] },
  {
    label: "Administrasi",
    items: [
      { href: "/kepsek/siswa", label: "Data Siswa", icon: "☰" },
      { href: "/kepsek/siswa/mutasi", label: "Mutasi Siswa", icon: "⇄" },
      { href: "/kepsek/guru", label: "Data Guru", icon: "◑" },
      { href: "/kepsek/guru/kinerja", label: "Kinerja Guru", icon: "◔" },
      { href: "/kepsek/jadwal", label: "Jadwal Pelajaran", icon: "▥" },
      { href: "/kepsek/rpp", label: "Kelengkapan RPP", icon: "▧" },
      { href: "/kepsek/master-data", label: "Master Data & Nilai", icon: "▦" },
      { href: "/kepsek/tahun-ajaran", label: "Tahun Ajaran", icon: "◷" },
      { href: "/kepsek/ppdb", label: "PPDB", icon: "✦" },
      { href: "/kepsek/pengumuman", label: "Pengumuman", icon: "📣" },
      { href: "/kepsek/kalender", label: "Kalender Akademik", icon: "▤" },
    ],
  },
  {
    label: "Keuangan & Data",
    items: [
      { href: "/keuangan", label: "Keuangan / SPP", icon: "₽" },
      { href: "/kepsek/ekspor", label: "Ekspor / Impor Data", icon: "⇅" },
    ],
  },
];

// TU (Tata Usaha) — dipecah dari "Bendahara/TU" (1.6): administrasi data saja, tanpa akses keuangan.
// Direvisi (1.7): akses diperluas ke Jadwal Pelajaran & Master Data + Nilai (sebelumnya cuma data siswa/guru/ekspor).
export const NAV_TU: NavGroup[] = [
  {
    label: "Administrasi",
    items: [
      { href: "/kepsek/siswa", label: "Data Siswa", icon: "☰" },
      { href: "/kepsek/siswa/mutasi", label: "Mutasi Siswa", icon: "⇄" },
      { href: "/kepsek/guru", label: "Data Guru", icon: "◑" },
      { href: "/kepsek/jadwal", label: "Jadwal Pelajaran", icon: "▥" },
      { href: "/kepsek/master-data", label: "Master Data & Nilai", icon: "▦" },
      { href: "/kepsek/tahun-ajaran", label: "Tahun Ajaran", icon: "◷" },
      { href: "/kepsek/ekspor", label: "Ekspor / Impor Data", icon: "⇅" },
      { href: "/kepsek/pengumuman", label: "Pengumuman", icon: "📣" },
      { href: "/kepsek/kalender", label: "Kalender Akademik", icon: "▤" },
    ],
  },
];

// Bendahara (1.6) — murni keuangan, tak lagi merangkap administrasi data (lihat NAV_TU).
export const NAV_KEUANGAN: NavGroup[] = [
  {
    items: [{ href: "/keuangan", label: "Keuangan / SPP", icon: "₽" }],
  },
];

export const NAV_GURU: NavGroup[] = [
  { items: [
    { href: "/guru", label: "Dashboard", icon: "▦" },
    { href: "/guru/murid", label: "Murid", icon: "◔" },
  ] },
  {
    label: "Mengajar",
    items: [
      { href: "/guru/jadwal", label: "Jadwal Mengajar", icon: "▥" },
      { href: "/guru/absensi", label: "Absensi", icon: "✓" },
      { href: "/guru/nilai", label: "Nilai & Rapor", icon: "✎" },
      { href: "/guru/nilai/asesmen", label: "Asesmen Deskriptif", icon: "✒" },
      { href: "/guru/tugas", label: "Tugas / PR", icon: "▧" },
      { href: "/guru/materi", label: "Materi Belajar", icon: "▢" },
      { href: "/guru/tanya-jawab", label: "Tanya Jawab Kelas", icon: "💬" },
      { href: "/guru/rpp", label: "RPP & Capaian", icon: "▤" },
      { href: "/guru/projek", label: "Projek P5", icon: "✦" },
    ],
  },
  {
    label: "Ujian / CBT",
    items: [
      { href: "/guru/ujian", label: "Kelola Ujian", icon: "▤" },
      { href: "/guru/bank-soal", label: "Bank Soal", icon: "❖" },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/guru/pesan", label: "Pesan", icon: "✉" },
      { href: "/guru/izin", label: "Pengajuan Izin", icon: "✋" },
      { href: "/guru/kalender", label: "Kalender Akademik", icon: "▤" },
    ],
  },
];

export const NAV_ORTU: NavGroup[] = [
  { items: [{ href: "/ortu", label: "Beranda", icon: "⌂" }] },
  {
    items: [
      { href: "/ortu/izin", label: "Ajukan Izin", icon: "✋" },
      { href: "/ortu/pesan", label: "Pesan", icon: "✉" },
      { href: "/ortu/kalender", label: "Kalender Akademik", icon: "▤" },
      { href: "/ortu/consent", label: "Privasi Data Anak", icon: "🔒" },
    ],
  },
];

export const NAV_MURID: NavGroup[] = [
  { items: [{ href: "/murid", label: "Beranda", icon: "⌂" }] },
  {
    items: [
      { href: "/murid/jadwal", label: "Jadwal", icon: "▥" },
      { href: "/murid/materi", label: "Materi Belajar", icon: "▢" },
      { href: "/murid/tanya-jawab", label: "Tanya Jawab Kelas", icon: "💬" },
      { href: "/murid/ujian", label: "Ujian & Latihan", icon: "▤" },
      { href: "/murid/tugas", label: "Tugas", icon: "▧" },
      { href: "/murid/performa", label: "Performa Saya", icon: "◔" },
      { href: "/murid/kalender", label: "Kalender Akademik", icon: "▤" },
    ],
  },
];

/// Beberapa halaman di bawah /kepsek/* dipakai bersama oleh Kepsek & TU (siswa, guru,
/// master-data, tahun-ajaran, ekspor — lihat ROLE_BY_PATH_PREFIX di lib/auth.ts). Halaman itu
/// pakai helper ini supaya sidebar TU menampilkan menu TU, bukan menu Kepsek yang lebih luas.
export function groupsForPeran(peran: string): NavGroup[] {
  return peran === "TU" ? NAV_TU : NAV_KEPSEK;
}

export const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: "Superadmin Selaras Ajar",
  KEPALA_SEKOLAH: "Kepala Sekolah",
  BENDAHARA: "Bendahara",
  TU: "Tata Usaha (TU)",
  GURU: "Guru",
  ORANG_TUA: "Orang Tua / Wali",
  MURID: "Murid",
};
