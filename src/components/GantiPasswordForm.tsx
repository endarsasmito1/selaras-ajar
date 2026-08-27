"use client";

import { useSearchParams } from "next/navigation";

/**
 * 1.10 — form ganti password di menu Akun, muncul di semua halaman (lewat AppShell).
 * Client component supaya bisa baca pesan sukses/error dari query string lewat useSearchParams,
 * tanpa tiap halaman di seluruh app harus tahu & meneruskan searchParams "passwordError"/"passwordDiubah".
 */
export function GantiPasswordForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("passwordError");
  const sukses = searchParams.get("passwordDiubah");

  return (
    <form action="/api/akun/password" method="POST" className="flex flex-col gap-1.5 mt-2">
      {error && <p className="text-[11px] text-danger">{error}</p>}
      {sukses && <p className="text-[11px] text-success">Password berhasil diubah.</p>}
      <input
        type="password"
        name="passwordLama"
        required
        placeholder="Password lama"
        className="bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs"
      />
      <input
        type="password"
        name="passwordBaru"
        required
        minLength={6}
        placeholder="Password baru (min. 6 karakter)"
        className="bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs"
      />
      <input
        type="password"
        name="konfirmasiPasswordBaru"
        required
        minLength={6}
        placeholder="Ulangi password baru"
        className="bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs"
      />
      <button type="submit" className="text-xs font-semibold text-primary-deep hover:underline self-start mt-0.5">
        Simpan password baru
      </button>
    </form>
  );
}
