"use client";

import { Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type SortableColumn<T> = {
  key: string;
  label: string;
  /** Kalau diisi, header kolom ini jadi tombol sort. Dipanggil per baris utk hasil dibandingkan. */
  sortValue?: (row: T) => string | number | null;
  render: (row: T) => React.ReactNode;
  className?: string;
};

/**
 * Tabel generik dgn sort per kolom (klik header = toggle asc/desc, kolom lain menyesuaikan
 * karena state sort cuma satu — bukan multi-kolom). Sort di client atas data yang sudah di-fetch
 * server, bukan re-query DB. Kolom tanpa `sortValue` (mis. kolom aksi) tak jadi tombol.
 */
export function SortableTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Tidak ada data.",
  renderDetail,
}: {
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  /** 1.21 — opsional; kalau diisi, tiap baris dapat tombol expand/collapse menampilkan detail
   * di baris tambahan tepat di bawahnya (ikut posisi baris itu meski sudah di-sort). */
  renderDetail?: (row: T) => React.ReactNode;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sorted = useMemo(() => {
    const kolom = columns.find((c) => c.key === sortKey);
    if (!kolom?.sortValue) return rows;
    const withVal = rows.map((r) => ({ r, v: kolom.sortValue!(r) }));
    withVal.sort((a, b) => {
      if (a.v === null || a.v === undefined) return 1;
      if (b.v === null || b.v === undefined) return -1;
      if (typeof a.v === "number" && typeof b.v === "number") return a.v - b.v;
      return String(a.v).localeCompare(String(b.v), "id");
    });
    if (dir === "desc") withVal.reverse();
    return withVal.map((x) => x.r);
  }, [rows, sortKey, dir, columns]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDir("asc");
    }
  }

  return (
    <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
            {renderDetail && <th className="w-8 px-2 py-2.5" />}
            {columns.map((c) => (
              <th key={c.key} className={cn("text-left px-4 py-2.5 font-bold", c.className)}>
                {c.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 hover:text-ink"
                  >
                    {c.label}
                    <span className="text-[9px] leading-none">
                      {sortKey === c.key ? (dir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            const isOpen = expanded.has(key);
            return (
              <Fragment key={key}>
                <tr className="border-t border-rule hover:bg-paper">
                  {renderDetail && (
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleExpand(key)}
                        aria-label={isOpen ? "Sembunyikan detail" : "Tampilkan detail"}
                        className="text-ink-soft hover:text-ink text-xs w-5 h-5 inline-flex items-center justify-center"
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-2.5", c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
                {renderDetail && isOpen && (
                  <tr className="border-t border-rule bg-paper-sunken">
                    <td colSpan={columns.length + 1} className="px-4 py-3">
                      {renderDetail(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length + (renderDetail ? 1 : 0)} className="px-4 py-6 text-center text-ink-soft text-xs">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
