"use client";

import { useEffect } from "react";

function labelUntuk(target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const pesanKustom = target.getAttribute("data-pesan-error");
  if (pesanKustom) return pesanKustom;

  // Pola form di app ini: <label> mendahului field di dalam <div> yang sama, tanpa htmlFor/id
  // (murni visual, tak terasosiasi programatik) — cari label terdekat lewat kontainer terdekat.
  const labelEl = target.closest("div")?.querySelector("label");
  const label = labelEl?.textContent?.trim().replace(/\*$/, "").trim();
  if (label) return label;

  const placeholder = target.getAttribute("placeholder");
  if (placeholder) return placeholder;

  return target.name
    ? target.name.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase()).trim()
    : "Kolom ini";
}

function pesanValidasi(target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const v = target.validity;
  const label = labelUntuk(target);
  if (v.valueMissing) return `${label} wajib diisi`;
  if (v.typeMismatch) {
    if ("type" in target && target.type === "email") return `${label} harus berupa email yang valid`;
    if ("type" in target && target.type === "url") return `${label} harus berupa URL yang valid`;
    return `Format ${label} tidak valid`;
  }
  if (v.tooShort && "minLength" in target) return `${label} minimal ${target.minLength} karakter`;
  if (v.tooLong && "maxLength" in target) return `${label} maksimal ${target.maxLength} karakter`;
  if (v.rangeUnderflow && "min" in target) return `${label} minimal ${target.min}`;
  if (v.rangeOverflow && "max" in target) return `${label} maksimal ${target.max}`;
  if (v.patternMismatch) return `${label} tidak sesuai format yang diminta`;
  if (v.badInput) return `${label} harus berupa angka`;
  return `${label} tidak valid`;
}

/**
 * Pesan validasi native browser ("Please fill out this field") diganti Bahasa Indonesia per-field
 * lewat setCustomValidity — bukan disable validasi native-nya (tetap pakai bubble bawaan browser
 * demi aksesibilitas & fokus-otomatis-ke-field yang sudah teruji, cuma teksnya yang diganti).
 * Dipasang sekali di AppShell, berlaku ke semua form di seluruh app tanpa perlu ubah per field —
 * kecuali field yang mau pesan custom sendiri, tinggal kasih atribut data-pesan-error.
 */
export function ValidasiFormProvider() {
  useEffect(() => {
    const isFormField = (el: EventTarget | null): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
      el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

    const onInvalid = (e: Event) => {
      if (!isFormField(e.target)) return;
      e.target.setCustomValidity(pesanValidasi(e.target));
    };
    const onInput = (e: Event) => {
      if (!isFormField(e.target)) return;
      e.target.setCustomValidity("");
    };

    // "invalid" tak bubble — harus pakai capture phase di document.
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
    };
  }, []);

  return null;
}
