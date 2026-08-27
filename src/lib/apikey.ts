import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const PREFIX = "sla_live_";

/** Bikin key baru: plaintext (ditampilkan sekali ke user) + hash-nya (disimpan di DB). */
export function generateApiKey() {
  const secret = randomBytes(24).toString("hex"); // 48 karakter hex
  const plaintext = `${PREFIX}${secret}`;
  const keyHash = createHash("sha256").update(plaintext).digest("hex");
  const keyPrefix = plaintext.slice(0, PREFIX.length + 8);
  return { plaintext, keyHash, keyPrefix };
}

/**
 * Validasi header `X-API-Key` dari request masuk ke /api/v1/*. Mengembalikan sekolahId pemilik
 * key kalau valid & belum dicabut, atau null kalau tidak valid — endpoint pemanggil yang
 * menentukan response 401-nya sendiri (konsisten dgn pola getSession() di lib/auth.ts).
 */
export async function verifyApiKey(req: Request): Promise<{ sekolahId: string; apiKeyId: string } | null> {
  const header = req.headers.get("x-api-key");
  if (!header) return null;

  const keyHash = createHash("sha256").update(header).digest("hex");
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey || apiKey.revokedAt) return null;

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return { sekolahId: apiKey.sekolahId, apiKeyId: apiKey.id };
}
