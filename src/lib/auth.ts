import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Peran } from "@/generated/prisma/client";

const COOKIE_NAME = "selaras_session";
const secretKey = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-ganti-di-produksi-selaras-ajar"
);

export type SessionPayload = {
  userId: string;
  /** String kosong hanya untuk SUPERADMIN — peran itu bukan bagian dari sekolah manapun,
   *  sengaja bukan `null` supaya semua kode existing yang tenant-scoped (kepsek/guru/dst,
   *  yang lewat proxy tak akan pernah dijalankan sbg SUPERADMIN) tak perlu berubah tipenya. */
  sekolahId: string;
  peran: Peran;
  nama: string;
  /** 1.21 — "L" | "P" | null, dipakai honorifik Pak/Bu di salam dinamis header. */
  jenisKelamin?: string | null;
  /** Multi-role (1.20) — daftar SEMUA peran yang dimiliki akun ini (termasuk peran aktif
   *  saat ini sendiri), dihitung sekali saat login dari `PenggunaPeran` + peran utama
   *  `Pengguna`. Dipakai tombol switch-role di `AccountMenu`. `peran`/`sekolahId` di atas
   *  tetap satu-satunya sumber kebenaran utk RBAC — field ini murni utk UI+validasi switch. */
  perans?: { peran: Peran; sekolahId: string }[];
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function loginWithCredentials(email: string, password: string) {
  const user = await prisma.pengguna.findUnique({ where: { email }, include: { sekolah: true } });
  if (!user || !user.aktif) return null;
  // Sekolah dinonaktifkan superadmin -> semua penggunanya tak bisa login (kecuali SUPERADMIN, tak terikat sekolah).
  if (user.sekolah && !user.sekolah.aktif) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  await createSession(await buildSessionPayload(user));
  return user;
}

/** Susun payload session lengkap dgn daftar `perans` (peran utama + baris `PenggunaPeran`). */
export async function buildSessionPayload(user: {
  id: string;
  sekolahId: string | null;
  peran: Peran;
  nama: string;
  jenisKelamin?: string | null;
}): Promise<SessionPayload> {
  const perananLain = await prisma.penggunaPeran.findMany({ where: { penggunaId: user.id } });
  const semua = [
    { peran: user.peran, sekolahId: user.sekolahId ?? "" },
    ...perananLain.map((p) => ({ peran: p.peran, sekolahId: p.sekolahId })),
  ];
  const perans = Array.from(new Map(semua.map((p) => [`${p.peran}|${p.sekolahId}`, p])).values());
  return {
    userId: user.id,
    sekolahId: user.sekolahId ?? "",
    peran: user.peran,
    nama: user.nama,
    jenisKelamin: user.jenisKelamin ?? null,
    perans,
  };
}

// Peta peran -> halaman beranda masing-masing
export const HOME_BY_ROLE: Record<Peran, string> = {
  SUPERADMIN: "/superadmin",
  KEPALA_SEKOLAH: "/kepsek",
  BENDAHARA: "/keuangan",
  TU: "/kepsek/siswa",
  GURU: "/guru",
  ORANG_TUA: "/ortu",
  MURID: "/murid",
};

// Peta prefix rute -> peran yang boleh akses. Urutan penting — dicocokkan lewat .find(),
// yang pertama cocok yang menang, jadi prefix lebih spesifik HARUS didahulukan dari catch-all-nya.
export const ROLE_BY_PATH_PREFIX: { prefix: string; roles: Peran[] }[] = [
  { prefix: "/superadmin", roles: ["SUPERADMIN"] },
  // TU (1.6): administrasi data saja — beberapa subpath /kepsek/* dibuka juga untuk TU,
  // reuse halaman yang sama dengan kepsek (bukan duplikat halaman). Harus didahulukan dari
  // entri "/kepsek" generik di bawah supaya TU tak keblokir di situ.
  { prefix: "/kepsek/siswa", roles: ["KEPALA_SEKOLAH", "TU"] },
  { prefix: "/kepsek/guru", roles: ["KEPALA_SEKOLAH", "TU"] },
  { prefix: "/kepsek/master-data", roles: ["KEPALA_SEKOLAH", "TU"] },
  { prefix: "/kepsek/tahun-ajaran", roles: ["KEPALA_SEKOLAH", "TU"] },
  { prefix: "/kepsek/ekspor", roles: ["KEPALA_SEKOLAH", "TU"] },
  // Diperluas 1.7: TU juga kelola jadwal & lihat kalender.
  { prefix: "/kepsek/jadwal", roles: ["KEPALA_SEKOLAH", "TU"] },
  { prefix: "/kepsek/kalender", roles: ["KEPALA_SEKOLAH", "TU"] },
  // Pengumuman sekolah (1.20) — TU juga boleh menerbitkan pengumuman, bukan cuma kepsek.
  { prefix: "/kepsek/pengumuman", roles: ["KEPALA_SEKOLAH", "TU"] },
  { prefix: "/kepsek", roles: ["KEPALA_SEKOLAH"] },
  { prefix: "/keuangan", roles: ["KEPALA_SEKOLAH", "BENDAHARA"] },
  // Kepsek boleh masuk ke halaman guru yang sifatnya read-only (detail ujian, performa, dst)
  // untuk kebutuhan pengawasan — halaman itu sendiri tak punya aksi yang hanya boleh guru.
  { prefix: "/guru", roles: ["GURU", "KEPALA_SEKOLAH"] },
  { prefix: "/ortu", roles: ["ORANG_TUA"] },
  { prefix: "/murid", roles: ["MURID"] },
];
