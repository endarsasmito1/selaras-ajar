"use client";

import { useMemo, useState } from "react";
import { waktuRelatif } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotifItem, AKSEN_PRIORITAS } from "@/components/NotifBell";

// Ambil per 20 dulu, tombol "Muat lebih banyak" nambah 20 lagi — pagination sederhana di
// client krn baris per akun biasanya sedikit (notif state auto-hapus begitu resolve, §10.2
// bilang "kalau daftarnya panjang" tapi tak wajib infinite-scroll/server pagination penuh).
const AMBIL_PER_HALAMAN = 20;

export function NotifPageClient({ initial }: { initial: NotifItem[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"semua" | "belum-dibaca">("semua");
  const [tampilSampai, setTampilSampai] = useState(AMBIL_PER_HALAMAN);

  const belumDibacaCount = items.filter((n) => !n.dibacaPada).length;
  const terfilter = useMemo(
    () => (filter === "belum-dibaca" ? items.filter((n) => !n.dibacaPada) : items),
    [items, filter]
  );
  const tampil = terfilter.slice(0, tampilSampai);

  async function tandaiDibaca(id: string) {
    setItems((list) => list.map((n) => (n.id === id && !n.dibacaPada ? { ...n, dibacaPada: new Date().toISOString() } : n)));
    try {
      await fetch("/api/notifikasi/baca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // optimistic, lihat catatan sama di NotifBell
    }
  }

  async function tandaiSemuaDibaca() {
    setItems((list) => list.map((n) => (n.dibacaPada ? n : { ...n, dibacaPada: new Date().toISOString() })));
    try {
      await fetch("/api/notifikasi/baca-semua", { method: "POST" });
    } catch {
      // optimistic, lihat catatan sama di NotifBell
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex gap-1 border-b border-rule" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "semua"}
            onClick={() => setFilter("semua")}
            className={
              "px-4 py-2 text-sm -mb-px border-b-2 font-sans " +
              (filter === "semua" ? "text-primary-deep border-primary font-semibold" : "text-ink-soft border-transparent hover:text-ink")
            }
          >
            Semua ({items.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "belum-dibaca"}
            onClick={() => setFilter("belum-dibaca")}
            className={
              "px-4 py-2 text-sm -mb-px border-b-2 font-sans " +
              (filter === "belum-dibaca" ? "text-primary-deep border-primary font-semibold" : "text-ink-soft border-transparent hover:text-ink")
            }
          >
            Belum dibaca ({belumDibacaCount})
          </button>
        </div>
        {belumDibacaCount > 0 && (
          <button type="button" onClick={tandaiSemuaDibaca} className="text-xs font-semibold text-primary-deep hover:underline">
            Tandai semua sudah dibaca
          </button>
        )}
      </div>

      {terfilter.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={filter === "belum-dibaca" ? "Tidak ada notifikasi yang belum dibaca." : "Belum ada notifikasi."}
          hint={filter === "belum-dibaca" ? undefined : "Notifikasi baru akan muncul di sini begitu ada kejadian yang relevan."}
        />
      ) : (
        <div className="border border-rule rounded-xl overflow-hidden bg-paper-raised">
          {tampil.map((n) => (
            <a
              key={n.id}
              href={n.href ?? "#"}
              onClick={() => !n.dibacaPada && tandaiDibaca(n.id)}
              className={
                "flex items-start gap-3 px-4 py-3.5 border-b border-rule last:border-b-0 border-l-[3px] hover:bg-paper transition-colors " +
                AKSEN_PRIORITAS[n.prioritas] +
                (n.dibacaPada ? "" : " bg-primary-tint/40")
              }
            >
              {!n.dibacaPada && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <div className={"text-sm " + (n.dibacaPada ? "text-ink" : "font-semibold text-ink")}>{n.judul}</div>
                {n.deskripsi && <p className="text-xs text-ink-soft mt-0.5">{n.deskripsi}</p>}
                <span className="text-[11px] text-ink-soft/80 mt-1 block">{waktuRelatif(n.createdAt)}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {terfilter.length > tampil.length && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setTampilSampai((n) => n + AMBIL_PER_HALAMAN)}
            className="text-sm font-semibold text-primary-deep hover:underline"
          >
            Muat lebih banyak ({terfilter.length - tampil.length} lagi)
          </button>
        </div>
      )}
    </div>
  );
}
