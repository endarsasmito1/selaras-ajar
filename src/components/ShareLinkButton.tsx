"use client";

import { useState } from "react";

/**
 * 1.23 — "Bagikan ujian by link/email/WA": link tetap butuh login murid seperti biasa (bukan
 * bypass auth), WA/email di sini cuma cara kirim URL yang sama persis. Copy-link pakai clipboard
 * API, WA/email pakai skema URI standar (wa.me / mailto) — tak butuh dependency baru.
 */
export function ShareLinkButton({ url, judul }: { url: string; judul: string }) {
  const [disalin, setDisalin] = useState(false);

  async function salinLink() {
    try {
      await navigator.clipboard.writeText(url);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2000);
    } catch {
      // clipboard API mungkin diblok (mis. konteks non-HTTPS) — abaikan, tautan tetap kelihatan di bawah.
    }
  }

  const pesanWa = encodeURIComponent(`Link ujian "${judul}": ${url}`);
  const subjekEmail = encodeURIComponent(`Link ujian: ${judul}`);
  const bodyEmail = encodeURIComponent(`Berikut link ujian "${judul}":\n${url}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={url}
        onClick={(e) => (e.target as HTMLInputElement).select()}
        className="flex-1 min-w-[200px] bg-paper border border-rule rounded-lg px-3 py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={salinLink}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rule hover:bg-paper-raised"
      >
        {disalin ? "✓ Disalin" : "📋 Salin link"}
      </button>
      <a
        href={`https://wa.me/?text=${pesanWa}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rule hover:bg-paper-raised"
      >
        💬 WhatsApp
      </a>
      <a
        href={`mailto:?subject=${subjekEmail}&body=${bodyEmail}`}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rule hover:bg-paper-raised"
      >
        ✉ Email
      </a>
    </div>
  );
}
