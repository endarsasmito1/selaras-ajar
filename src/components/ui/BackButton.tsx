"use client";

import { useRouter } from "next/navigation";

/** Tombol "Kembali" generik — dipakai AppShell di semua halaman non-beranda (§5.5 PRD, 1.7). */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      title="Kembali"
      aria-label="Kembali"
      className="flex items-center justify-center w-8 h-8 text-base font-semibold text-ink-soft hover:text-primary-deep rounded-lg hover:bg-paper-raised shrink-0"
    >
      ←
    </button>
  );
}
