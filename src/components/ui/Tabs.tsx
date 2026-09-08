"use client";

import { useState } from "react";
import { tabClass } from "@/lib/tab-style";

/** §6.6 ui-design-system-selaras-ajar.md — mode "in-page": state lokal, gak ganti URL. Cocok utk
 * navigasi dalam-halaman yang gak perlu di-refresh/di-share linknya (mis. Susun/Pengaturan/Konfirmasi
 * ujian kalau digabung 1 halaman). Utk tab yang HARUS bisa di-share/refresh (mis. filter riwayat),
 * jangan pakai ini — cukup styled <a> biasa pakai class yang sama (lihat `tabClass` di bawah). */
export function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: { key: string; label: string; content: React.ReactNode }[];
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  return (
    <div>
      <div className="flex gap-1 border-b border-rule mb-4 flex-wrap" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={tabClass(active === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" hidden={active !== t.key}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
