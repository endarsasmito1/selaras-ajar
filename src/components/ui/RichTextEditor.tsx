"use client";

import { useRef, useState } from "react";
import { renderMarkdownLite } from "@/lib/markdown-lite";

/**
 * Editor "kaya format" tanpa HTML mentah — textarea biasa + toolbar yang membungkus
 * teks terpilih dengan sintaks markdown-lite (**bold**, *italic*, "- " list). Disimpan
 * sebagai plain text, dirender lewat renderMarkdownLite (bangun elemen React langsung,
 * bukan dangerouslySetInnerHTML) — nol risiko injeksi apa pun isi teksnya.
 */
export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder,
  rows = 5,
  required = false,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLTextAreaElement>(null);

  function bungkus(marker: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const selected = value.slice(selectionStart, selectionEnd) || "teks";
    const next =
      value.slice(0, selectionStart) + marker + selected + marker + value.slice(selectionEnd);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart + marker.length, selectionStart + marker.length + selected.length);
    });
  }

  function tambahList() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart } = el;
    const awalBaris = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const next = value.slice(0, awalBaris) + "- " + value.slice(awalBaris);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart + 2, selectionStart + 2);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1 bg-paper-sunken border border-rule rounded-t-lg px-2 py-1.5">
        <button
          type="button"
          onClick={() => bungkus("**")}
          className="px-2 py-1 rounded text-xs font-bold hover:bg-paper-raised"
          title="Tebal"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => bungkus("*")}
          className="px-2 py-1 rounded text-xs italic hover:bg-paper-raised"
          title="Miring"
        >
          I
        </button>
        <button
          type="button"
          onClick={tambahList}
          className="px-2 py-1 rounded text-xs hover:bg-paper-raised"
          title="Daftar"
        >
          • List
        </button>
      </div>
      <textarea
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="bg-paper border border-rule border-t-0 rounded-b-lg px-3 py-2.5 text-sm -mt-1.5"
      />
      {value.trim() !== "" && (
        <div className="text-xs text-ink-soft bg-paper-sunken rounded-lg px-3 py-2 prose-tight">
          <span className="font-bold uppercase tracking-wide text-[10px] block mb-1">Pratinjau</span>
          {renderMarkdownLite(value)}
        </div>
      )}
    </div>
  );
}
