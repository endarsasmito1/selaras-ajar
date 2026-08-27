"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

type Variant = "primary" | "accent" | "ghost";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-deep",
  accent: "bg-accent text-[#3A2C10] hover:bg-accent-deep hover:text-white",
  ghost: "bg-transparent border border-rule text-ink hover:bg-paper-raised",
};
const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm min-h-11",
  sm: "px-3.5 py-2 text-xs",
};

/**
 * 1.11 — LinkButton yang minta konfirmasi native `confirm()` sebelum navigasi, dipakai utk "Mulai
 * Ujian" (CBT berjadwal): klik langsung sebelumnya tanpa gerbang konfirmasi langsung mengonsumsi
 * waktu ujian (baris UjianPengerjaan & timer dibuat begitu halaman start dimuat).
 */
export function ConfirmLinkButton({
  href,
  confirmMessage,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  confirmMessage: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <a
        href={href}
        className={cn(base, variants[variant], sizes[size], className)}
        onClick={(e) => {
          e.preventDefault();
          ref.current?.showModal();
        }}
      >
        {children}
      </a>
      <dialog
        ref={ref}
        className="bg-paper-raised border border-rule rounded-xl p-6 max-w-sm w-full backdrop:bg-black/40 m-auto"
      >
        <p className="text-sm mb-5">{confirmMessage}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => ref.current?.close()}>
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              ref.current?.close();
              router.push(href);
            }}
          >
            Ya, lanjutkan
          </Button>
        </div>
      </dialog>
    </>
  );
}
