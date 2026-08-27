"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import "suneditor/dist/css/suneditor.min.css";
import type SunEditorCore from "suneditor/src/lib/core";

const SunEditor = dynamic(() => import("suneditor-react"), { ssr: false });

/** 1.23 — simbol matematika umum (toolbar sederhana, BUKAN LaTeX/KaTeX per keputusan produk),
 * disisipkan sbg unicode/HTML dasar yang sudah ada di allowlist `sanitize-html.tsx`. */
const SIMBOL_MATEMATIKA: { label: string; sisip: string; judul: string }[] = [
  { label: "√", sisip: "√", judul: "Akar" },
  { label: "±", sisip: "±", judul: "Plus-minus" },
  { label: "≤", sisip: "≤", judul: "Kurang dari sama dengan" },
  { label: "≥", sisip: "≥", judul: "Lebih dari sama dengan" },
  { label: "≠", sisip: "≠", judul: "Tidak sama dengan" },
  { label: "×", sisip: "×", judul: "Kali" },
  { label: "÷", sisip: "÷", judul: "Bagi" },
  { label: "π", sisip: "π", judul: "Pi" },
  { label: "∞", sisip: "∞", judul: "Tak hingga" },
  { label: "xⁿ", sisip: "<sup>2</sup>", judul: "Pangkat (sisip setelah angka/huruf dasar)" },
  { label: "a⁄b", sisip: "<sup>a</sup>⁄<sub>b</sub>", judul: "Pecahan (edit a & b setelah disisip)" },
];

async function uploadMedia(file: File, tipe: "gambar" | "video"): Promise<{ url: string } | { error: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tipe", tipe);
  const res = await fetch("/api/soal/media-upload", { method: "POST", body: formData });
  return res.json();
}

/**
 * Editor pertanyaan soal (1.20) — WYSIWYG beneran (bukan markdown-lite seperti sisa app ini),
 * dipilih khusus utk kasus guru matematika/IPA yang butuh simbol (√ π ± ≤ ≥ pangkat dst) yang
 * tak ada di keyboard. Isi disimpan sbg HTML mentah di `Soal.pertanyaan` — WAJIB disanitasi
 * (lib/sanitize-html.tsx) di SETIAP titik render, tidak terkecuali.
 *
 * 1.23 — tambah gambar & video (upload file ATAU tempel link YouTube/Vimeo lewat dialog video
 * bawaan SunEditor) + toolbar simbol matematika kustom.
 */
export function SoalEditor({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const editorRef = useRef<SunEditorCore | null>(null);

  function sisipSimbol(html: string) {
    editorRef.current?.insertHTML(html, true, true, true);
  }

  return (
    <div className="soal-editor-wrap">
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-1 mb-1.5">
        {SIMBOL_MATEMATIKA.map((s) => (
          <button
            key={s.label}
            type="button"
            title={s.judul}
            onClick={() => sisipSimbol(s.sisip)}
            className="w-8 h-8 flex items-center justify-center bg-paper-raised border border-rule rounded-md text-sm hover:bg-paper-hover"
          >
            {s.label}
          </button>
        ))}
      </div>
      <SunEditor
        setContents={defaultValue}
        onChange={setValue}
        getSunEditorInstance={(instance) => {
          editorRef.current = instance;
        }}
        setOptions={{
          height: "180",
          buttonList: [
            ["bold", "italic", "underline", "strike"],
            ["superscript", "subscript"],
            ["list"],
            ["image", "video"],
            ["removeFormat"],
          ],
        }}
        onImageUploadBefore={(files, _info, uploadHandler) => {
          uploadMedia(files[0], "gambar").then((res) => {
            if ("error" in res) uploadHandler(res.error);
            else uploadHandler({ result: [{ url: res.url, name: files[0].name, size: files[0].size }] });
          });
          return undefined;
        }}
        onVideoUploadBefore={(files, _info, uploadHandler) => {
          uploadMedia(files[0], "video").then((res) => {
            if ("error" in res) uploadHandler(res.error);
            else uploadHandler({ result: [{ url: res.url, name: files[0].name, size: files[0].size }] });
          });
          return undefined;
        }}
      />
    </div>
  );
}
