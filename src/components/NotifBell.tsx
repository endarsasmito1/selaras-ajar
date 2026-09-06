"use client";

import { useState } from "react";
import Link from "next/link";
import { waktuRelatif } from "@/lib/utils";

export type NotifItem = {
  id: string;
  tipe: string;
  judul: string;
  deskripsi: string | null;
  href: string | null;
  prioritas: "TINGGI" | "SEDANG" | "RENDAH";
  dibacaPada: string | null;
  createdAt: string;
};

// Padanan `PANEL_MAKS = 8` di prototipe (assets/app.js) — dropdown cuma preview, isi lengkap
// & paginasi ada di halaman "/notifikasi" lewat tautan "Lihat semua notifikasi" di footer.
const PANEL_MAKS = 8;

// Diekspor supaya NotifPageClient (halaman "/notifikasi") pakai aksen warna yang sama persis,
// jangan sampai panel & halaman penuh kelihatan beda gaya utk prioritas yang sama (§10.3).
export const AKSEN_PRIORITAS: Record<NotifItem["prioritas"], string> = {
  TINGGI: "border-l-danger",
  SEDANG: "border-l-warning",
  RENDAH: "border-l-transparent",
};

export function NotifBell({ initial, unreadCount }: { initial: NotifItem[]; unreadCount: number }) {
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(unreadCount);

  async function tandaiDibaca(id: string) {
    setItems((list) => list.map((n) => (n.id === id && !n.dibacaPada ? { ...n, dibacaPada: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch("/api/notifikasi/baca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Optimistic — kalau gagal, status baca akan terkoreksi sendiri lain kali panel dibuka
      // ulang (server-fetched props), tak perlu rollback manual di sini.
    }
  }

  async function tandaiSemuaDibaca() {
    setItems((list) => list.map((n) => (n.dibacaPada ? n : { ...n, dibacaPada: new Date().toISOString() })));
    setUnread(0);
    try {
      await fetch("/api/notifikasi/baca-semua", { method: "POST" });
    } catch {
      // sama alasan seperti di atas
    }
  }

  const tampil = items.slice(0, PANEL_MAKS);

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer relative w-9 h-9 flex items-center justify-center rounded-lg border border-rule text-base select-none hover:bg-paper-raised">
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </summary>
      <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-paper-raised border border-rule rounded-xl shadow-lg z-20 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-rule">
          <b className="text-[13px] text-ink">Notifikasi</b>
          {unread > 0 && (
            <button
              type="button"
              onClick={tandaiSemuaDibaca}
              className="text-[11px] font-semibold text-primary-deep hover:underline"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {tampil.length === 0 ? (
            <div className="text-center py-8 px-4 text-ink-soft text-sm">Tidak ada notifikasi</div>
          ) : (
            tampil.map((n) => (
              <a
                key={n.id}
                href={n.href ?? "#"}
                onClick={() => !n.dibacaPada && tandaiDibaca(n.id)}
                className={
                  "block px-3.5 py-2.5 border-b border-rule last:border-b-0 border-l-[3px] hover:bg-paper transition-colors " +
                  AKSEN_PRIORITAS[n.prioritas] +
                  (n.dibacaPada ? "" : " bg-primary-tint/40")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={"text-[13px] " + (n.dibacaPada ? "text-ink" : "font-semibold text-ink")}>{n.judul}</span>
                  {!n.dibacaPada && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" aria-hidden="true" />}
                </div>
                {n.deskripsi && <p className="text-xs text-ink-soft mt-0.5 line-clamp-2">{n.deskripsi}</p>}
                <span className="text-[11px] text-ink-soft/80 mt-1 block">{waktuRelatif(n.createdAt)}</span>
              </a>
            ))
          )}
        </div>

        <Link
          href="/notifikasi"
          className="notif-viewall block text-center text-xs font-semibold text-primary-deep py-2.5 border-t border-rule hover:bg-paper"
        >
          Lihat semua notifikasi
        </Link>
      </div>
    </details>
  );
}
