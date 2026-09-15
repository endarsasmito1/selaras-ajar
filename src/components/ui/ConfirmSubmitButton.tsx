"use client";

import { useRef } from "react";
import { Button } from "./Button";

/**
 * Popup konfirmasi custom (bukan `window.confirm()` native) — dialog tetap di dalam <form> yang
 * sama secara DOM (cuma dirender ke top-layer browser saat showModal(), tak ikut re-parent),
 * jadi tombol "Ya, lanjutkan" di dalamnya (type=submit) tetap men-submit form aslinya.
 */
function DialogKonfirmasi({
  dialogRef,
  confirmMessage,
  labelKonfirmasi,
  form,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  confirmMessage: string;
  labelKonfirmasi?: string;
  /** Feedback teknis (Sep 2026) — sebagian tombol aksi (mis. Setujui/Tolak izin di tabel absensi)
   * bukan `<button>` di DALAM `<form>`-nya, tapi pakai atribut HTML `form="<id>"` buat nunjuk form
   * EKSTERNAL di tempat lain (pola umum di app ini, hindari nested <form>). Tombol submit asli di
   * dalam dialog ini butuh atribut yang SAMA supaya beneran nyambung ke form yang dituju. */
  form?: string;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="bg-paper-raised border border-rule rounded-xl p-6 max-w-sm w-full backdrop:bg-black/40 m-auto"
    >
      <p className="text-sm mb-5">{confirmMessage}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
          Batal
        </Button>
        <Button type="submit" form={form} size="sm" onClick={() => dialogRef.current?.close()}>
          {labelKonfirmasi ?? "Ya, lanjutkan"}
        </Button>
      </div>
    </dialog>
  );
}

/** Tombol submit yang minta konfirmasi lewat dialog custom sebelum form-nya benar-benar terkirim. */
export function ConfirmSubmitButton({
  confirmMessage,
  labelKonfirmasi,
  children,
  form,
  ...props
}: React.ComponentProps<typeof Button> & { confirmMessage: string; labelKonfirmasi?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button type="button" form={form} {...props} onClick={() => ref.current?.showModal()}>
        {children}
      </Button>
      <DialogKonfirmasi dialogRef={ref} confirmMessage={confirmMessage} labelKonfirmasi={labelKonfirmasi} form={form} />
    </>
  );
}

/** Sama seperti di atas, tapi tanpa styling <Button> — utk link teks kecil ("Hapus" dsb) yang sudah punya className sendiri. */
export function ConfirmSubmitLink({
  confirmMessage,
  labelKonfirmasi,
  children,
  form,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirmMessage: string; labelKonfirmasi?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button {...props} form={form} type="button" onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <DialogKonfirmasi dialogRef={ref} confirmMessage={confirmMessage} labelKonfirmasi={labelKonfirmasi} form={form} />
    </>
  );
}
