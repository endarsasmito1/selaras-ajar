import type { NavGroup } from "@/components/AppShell";

export const NAV_KEPSEK: NavGroup[] = [
  { items: [{ href: "/kepsek", label: "Ringkasan", icon: "▦" }] },
  {
    label: "Administrasi",
    items: [
      { href: "/kepsek/siswa", label: "Data Siswa", icon: "☰" },
      { href: "/kepsek/siswa/mutasi", label: "Mutasi Siswa", icon: "⇄" },
      { href: "/kepsek/guru", label: "Data Guru", icon: "◑" },
      { href: "/kepsek/guru/kinerja", label: "Kinerja Guru", icon: "◔" },
      { href: "/kepsek/pengguna", label: "Pengguna & Peran", icon: "☺" },
      { href: "/kepsek/tahun-ajaran", label: "Tahun Ajaran", icon: "◷" },
      { href: "/kepsek/ppdb", label: "PPDB", icon: "✦" },
      { href: "/kepsek/kalender", label: "Kalender Akademik", icon: "▤" },
    ],
  },
  {
    label: "Keuangan & Data",
    items: [
      { href: "/keuangan", label: "Keuangan / SPP", icon: "₽" },
      { href: "/keuangan/dana", label: "Transparansi Dana", icon: "◑" },
      { href: "/kepsek/nilai-pengaturan", label: "Pengaturan Nilai", icon: "⚙" },
      { href: "/kepsek/ekspor", label: "Ekspor / Impor Data", icon: "⇅" },
    ],
  },
];

export const NAV_KEUANGAN: NavGroup[] = [
  {
    items: [
      { href: "/keuangan", label: "Keuangan / SPP", icon: "₽" },
      { href: "/keuangan/dana", label: "Transparansi Dana", icon: "◑" },
    ],
  },
];

export const NAV_GURU: NavGroup[] = [
  { items: [{ href: "/guru", label: "Dashboard", icon: "▦" }] },
  {
    label: "Mengajar",
    items: [
      { href: "/guru/absensi", label: "Absensi", icon: "✓" },
      { href: "/guru/nilai", label: "Nilai & Rapor", icon: "✎" },
      { href: "/guru/tugas", label: "Tugas / PR", icon: "▧" },
      { href: "/guru/materi", label: "Materi Belajar", icon: "▢" },
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
      { href: "/guru/performa", label: "Performa Murid", icon: "◔" },
      { href: "/guru/pesan", label: "Pesan", icon: "✉" },
      { href: "/guru/izin", label: "Pengajuan Izin", icon: "✋" },
    ],
  },
];

export const NAV_ORTU: NavGroup[] = [
  { items: [{ href: "/ortu", label: "Beranda", icon: "⌂" }] },
  {
    items: [
      { href: "/ortu/izin", label: "Ajukan Izin", icon: "✋" },
      { href: "/ortu/dana", label: "Transparansi Dana", icon: "◑" },
      { href: "/ortu/pesan", label: "Pesan", icon: "✉" },
      { href: "/ortu/consent", label: "Privasi Data Anak", icon: "🔒" },
    ],
  },
];

export const NAV_MURID: NavGroup[] = [
  { items: [{ href: "/murid", label: "Beranda", icon: "⌂" }] },
  {
    items: [
      { href: "/murid/ujian", label: "Ujian & Latihan", icon: "▤" },
      { href: "/murid/tugas", label: "Tugas", icon: "▧" },
      { href: "/murid/performa", label: "Performa Saya", icon: "◔" },
    ],
  },
];

export const ROLE_LABEL: Record<string, string> = {
  KEPALA_SEKOLAH: "Kepala Sekolah",
  BENDAHARA: "Bendahara / Tata Usaha",
  GURU: "Guru",
  ORANG_TUA: "Orang Tua / Wali",
  MURID: "Murid",
};
