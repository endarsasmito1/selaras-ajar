"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./AppShell";

const STORAGE_KEY = "selaras-sidebar-collapsed";

export function NavLinks({
  groups,
  activeHref,
  collapsed = false,
}: {
  groups: NavGroup[];
  activeHref: string;
  collapsed?: boolean;
}) {
  return (
    <>
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && !collapsed && (
            <div className="text-[10px] tracking-wider uppercase text-ink-soft font-bold px-2.5 pt-3.5 pb-1">
              {g.label}
            </div>
          )}
          {g.items.map((item) => {
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg text-[13.5px] mb-0.5 py-2",
                  collapsed ? "justify-center px-0" : "px-2.5",
                  active
                    ? "bg-primary-tint text-primary-deep font-semibold"
                    : "text-ink-soft hover:bg-paper-raised hover:text-ink"
                )}
              >
                <span className="w-4 text-center shrink-0">{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

/** Sidebar desktop yang bisa diciutkan jadi mode ikon-saja — preferensi disimpan di localStorage
 * (murni UI, gak perlu sinkron server/cookie) supaya konsisten dipilih ulang tiap kunjungan. */
export function Sidebar({ groups, activeHref }: { groups: NavGroup[]; activeHref: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Hydration-safe: localStorage gak ada di server, jadi state mulai dari default (false) dan
    // baru disesuaikan ke preferensi tersimpan sesudah mount client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- disengaja, bukan anti-pattern.
    if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 bg-paper-sunken border-r border-rule flex-col gap-1.5 sticky top-0 h-screen overflow-y-auto",
        collapsed ? "w-[64px] p-2" : "w-[220px] p-3.5"
      )}
    >
      <div
        className={cn(
          "pb-4 pt-1 flex items-center",
          collapsed ? "flex-col gap-2 px-0" : "justify-between gap-2 px-2.5"
        )}
      >
        <Link
          href="/"
          title="Selaras Ajar"
          className="font-serif font-bold text-[17px] text-primary-deep flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-[3px] bg-accent inline-block shrink-0" />
          {!collapsed && "Selaras Ajar"}
        </Link>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md border border-rule text-ink-soft hover:bg-paper-raised hover:text-ink"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      <NavLinks groups={groups} activeHref={activeHref} collapsed={collapsed} />
      <div className="flex-1" />
    </aside>
  );
}
