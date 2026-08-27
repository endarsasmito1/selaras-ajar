import { z } from "zod";

/**
 * Parse FormData terhadap skema zod. Field kosong dari <input> selalu string "" (bukan
 * undefined), jadi kita normalisasi dulu: field kosong yang tak wajib jadi undefined,
 * supaya `.optional()` di skema bekerja seperti yang diharapkan.
 */
export function parseForm<T extends z.ZodType>(
  formData: FormData,
  schema: T
): { data: z.infer<T>; error?: undefined } | { data?: undefined; error: string } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    raw[key] = value === "" ? undefined : value;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first?.path?.join(".");
    const pesan = field ? `${field}: ${first.message}` : first?.message ?? "Data tidak valid";
    return { error: pesan };
  }
  return { data: result.data };
}

/** Redirect balik ke halaman tujuan dengan pesan error di query string (?error=...). */
export function errorRedirectUrl(baseUrl: URL, pathname: string, pesan: string) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = `?error=${encodeURIComponent(pesan)}`;
  return url;
}
