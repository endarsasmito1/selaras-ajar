"use client";

import { useRef } from "react";
import { Button } from "./Button";

/**
 * §7.1 ui-design-system-selaras-ajar.md — panel geser dari kanan untuk "edit satu record tanpa
 * pindah halaman, daftar di belakang tetap terlihat". Fase 4 (percobaan): dipakai pertama kali di
 * "Ubah alamat sekolah" (kepsek/page.tsx) sebelum diperluas ke halaman lain.
 *
 * Pola sama seperti `ConfirmDialog.tsx` (native <dialog>, tanpa @radix-ui/react-dialog yang sudah
 * terpasang tapi sengaja tak dipakai) — cuma beda posisi & ukuran. `children` adalah form lengkap
 * (action/method sendiri), sama seperti form yang dulunya inline di halaman.
 *
 * Esc-menutup, fokus-masuk, dan fokus-kembali-ke-pemicu ditangani otomatis oleh browser lewat
 * `showModal()` — klik backdrop ditangani manual di bawah (native <dialog> tak otomatis begitu).
 * Animasi slide-in & fade backdrop di `globals.css` (`.sa-drawer`), pakai `@starting-style` murni
 * CSS — otomatis nonaktif kalau `prefers-reduced-motion`.
 */
export function Drawer({
  triggerLabel,
  triggerClassName,
  eyebrow,
  title,
  children,
}: {
  triggerLabel: string;
  /** Override tampilan pemicu (mis. link kecil `text-[10px]` di sel grid padat) — kalau diisi,
   * dipakai SEBAGAI GANTI style default `<Button variant="ghost" size="sm">`, bukan ditambahkan ke
   * atasnya, supaya Drawer tetap bisa dipakai di tempat yang terlalu sempit utk tombol standar. */
  triggerClassName?: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      {triggerClassName ? (
        <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
          {triggerLabel}
        </button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => ref.current?.showModal()}>
          {triggerLabel}
        </Button>
      )}
      <dialog
        ref={ref}
        className="sa-drawer bg-paper p-0 border-l border-rule shadow-2xl"
        onClick={(e) => {
          // Native <dialog> tak otomatis tutup saat klik backdrop — klik di elemen <dialog> itu
          // sendiri (bukan konten di dalamnya) berarti klik area di luar panel.
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              {eyebrow && <p className="text-[11px] uppercase tracking-wider text-ink-soft font-bold mb-1">{eyebrow}</p>}
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="text-ink-soft hover:text-ink text-sm shrink-0"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
          <div className="border-b border-rule my-4" />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </dialog>
    </>
  );
}
