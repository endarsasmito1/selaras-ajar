"use client";

import { useRef } from "react";
import { Button } from "./Button";

/**
 * Popup konfirmasi native (elemen HTML <dialog>, tanpa dependency baru — @radix-ui/react-dialog
 * terpasang tapi sengaja tak dipakai supaya tetap konsisten dgn pola form-POST biasa yang
 * dipakai di seluruh app). `children` adalah form lengkap (action/method sendiri) yang
 * ditampilkan di dalam dialog — biasanya form yang sama yang sebelumnya inline di halaman.
 */
export function ConfirmDialog({
  triggerLabel,
  title,
  children,
}: {
  triggerLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => ref.current?.showModal()}>
        {triggerLabel}
      </Button>
      <dialog
        ref={ref}
        className="bg-paper-raised border border-rule rounded-xl p-6 max-w-sm w-full backdrop:bg-black/40 m-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="text-ink-soft hover:text-ink text-sm"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
