import DOMPurify from "isomorphic-dompurify";

/**
 * Titik sanitisasi TUNGGAL untuk `Soal.pertanyaan` (HTML dari SunEditor sejak 1.20) — setiap
 * tempat yang merender pertanyaan soal WAJIB lewat sini, bukan dangerouslySetInnerHTML langsung.
 * Whitelist ketat: tag pemformatan dasar + gambar + video (1.23), tanpa script/event handler
 * apa pun. `iframe` (video link YouTube/Vimeo) dibatasi lewat hook di bawah — tanpa itu `iframe`
 * dgn `src` bebas adalah jalan masuk XSS/embed konten arbitrer.
 */
const ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "sup", "sub", "br", "p", "span", "div", "ul", "ol", "li", "img", "video", "source", "iframe"];
// "class" diizinkan karena rumus matematika (plugin "math" SunEditor) dirender via CSS class
// (KaTeX-style), bukan inline style — cuma nama kelas CSS, bukan executable, aman.
const ALLOWED_ATTR = ["style", "class", "src", "alt", "width", "height", "controls", "frameborder", "allowfullscreen"];

const HOST_VIDEO_DIIZINKAN = ["www.youtube.com", "youtube.com", "player.vimeo.com"];

DOMPurify.addHook("uponSanitizeElement", (node) => {
  if (node.nodeName !== "IFRAME") return;
  const el = node as unknown as HTMLIFrameElement;
  try {
    const host = new URL(el.getAttribute("src") ?? "", "https://invalid.local").hostname;
    if (!HOST_VIDEO_DIIZINKAN.includes(host)) el.remove();
  } catch {
    el.remove();
  }
});

export function sanitizeSoalHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/** Render soal.pertanyaan (HTML tersanitasi) di server maupun client component. */
export function SoalHtml({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeSoalHtml(html) }} />;
}
