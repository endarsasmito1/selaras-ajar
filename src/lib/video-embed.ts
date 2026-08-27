/**
 * 1.23 — bedakan sumber video materi: file yang diupload sendiri (`/uploads/materi/...`,
 * diputar via <video>) vs link YouTube/Vimeo (di-embed via <iframe>) vs link biasa lain
 * (fallback: tampilkan sbg link, jangan coba embed sembarang domain).
 */
export type EmbedVideo = { tipe: "file" | "youtube" | "vimeo" | "link"; url: string };

export function toEmbedVideo(url: string): EmbedVideo {
  if (url.startsWith("/uploads/")) return { tipe: "file", url };

  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return { tipe: "youtube", url: `https://www.youtube.com/embed/${u.pathname.slice(1)}` };
    }
    if (u.hostname.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      if (id) return { tipe: "youtube", url: `https://www.youtube.com/embed/${id}` };
    }
    if (u.hostname.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return { tipe: "vimeo", url: `https://player.vimeo.com/video/${id}` };
    }
  } catch {
    // url tak valid — fallback ke link biasa di bawah
  }
  return { tipe: "link", url };
}
