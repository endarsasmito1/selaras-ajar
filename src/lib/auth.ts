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
  sekolahId: string;
  peran: Peran;
  nama: string;
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
  const user = await prisma.pengguna.findUnique({ where: { email } });
  if (!user || !user.aktif) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  await createSession({
    userId: user.id,
    sekolahId: user.sekolahId,
    peran: user.peran,
    nama: user.nama,
  });
  return user;
}

// Peta peran -> halaman beranda masing-masing
export const HOME_BY_ROLE: Record<Peran, string> = {
  KEPALA_SEKOLAH: "/kepsek",
  BENDAHARA: "/keuangan",
  GURU: "/guru",
  ORANG_TUA: "/ortu",
  MURID: "/murid",
};

// Peta prefix rute -> peran yang boleh akses
export const ROLE_BY_PATH_PREFIX: { prefix: string; roles: Peran[] }[] = [
  { prefix: "/kepsek", roles: ["KEPALA_SEKOLAH"] },
  { prefix: "/keuangan", roles: ["KEPALA_SEKOLAH", "BENDAHARA"] },
  { prefix: "/guru", roles: ["GURU"] },
  { prefix: "/ortu", roles: ["ORANG_TUA"] },
  { prefix: "/murid", roles: ["MURID"] },
];
