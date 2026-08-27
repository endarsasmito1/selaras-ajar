import { Fragment, type ReactNode } from "react";

/**
 * Parser + renderer "markdown-lite" — sengaja BUKAN HTML mentah (tidak ada
 * dangerouslySetInnerHTML di mana pun). Elemen React dibangun langsung dari teks,
 * jadi nol risiko injeksi HTML/script apa pun isi teksnya. Dukungan sengaja minimal:
 * **bold**, *italic*, baris diawali "- " jadi daftar, baris kosong = paragraf baru.
 * Dipakai bareng RichTextEditor.tsx (client) yang menulis teks dengan sintaks ini.
 */

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return parts
    .filter((p) => p !== "")
    .map((part, i) => {
      const key = `${keyPrefix}-${i}`;
      if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
        return <em key={key}>{part.slice(1, -1)}</em>;
      }
      return <Fragment key={key}>{part}</Fragment>;
    });
}

export function renderMarkdownLite(text: string): ReactNode {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (lines.length === 0) return null;
        const isList = lines.every((l) => l.trim().startsWith("- "));
        if (isList) {
          return (
            <ul key={bi} className="list-disc pl-5 space-y-0.5">
              {lines.map((l, li) => (
                <li key={li}>{parseInline(l.trim().slice(2), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {parseInline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
