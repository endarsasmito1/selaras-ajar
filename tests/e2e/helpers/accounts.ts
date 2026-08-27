/** Kredensial akun demo — harus sinkron dengan prisma/seed.ts (password sama untuk semua akun). */
export const PASSWORD = "selaras123";

export const ACCOUNTS = {
  kepsek: { email: "hendra@selarasajar.demo", password: PASSWORD, nama: "Pak Hendra" },
  bendahara: { email: "tuti@selarasajar.demo", password: PASSWORD, nama: "Bu Tuti" },
  tu: { email: "tono@selarasajar.demo", password: PASSWORD, nama: "Pak Tono" },
  guru: { email: "rina@selarasajar.demo", password: PASSWORD, nama: "Bu Rina Wulandari" }, // wali 5B, guru Matematika
  guruLain: { email: "solihin@selarasajar.demo", password: PASSWORD, nama: "Ahmad Solihin" }, // guru Bahasa Indonesia — dipakai utk cek isolasi data antar-guru
  ortu: { email: "fauzan@selarasajar.demo", password: PASSWORD, nama: "Bpk. Fauzan" }, // wali Ahmad Fauzi
  murid: { email: "ahmad@selarasajar.demo", password: PASSWORD, nama: "Ahmad Fauzi" }, // kelas 5B
  superadmin: { email: "admin@selarasajar.id", password: PASSWORD, nama: "Admin Selaras Ajar" },
} as const;

export type Role = keyof typeof ACCOUNTS;
