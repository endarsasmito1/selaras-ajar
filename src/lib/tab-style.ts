import { cn } from "@/lib/utils";

/** §6.6 ui-design-system-selaras-ajar.md — dipakai bareng `<a>`/`<Link>` biasa buat "tab" yang
 * server-driven (state di query-param, halaman tetap server component) — file terpisah dari
 * `Tabs.tsx` (client component) supaya bisa dipanggil dari server component tanpa error
 * "Attempted to call tabClass() from the server but tabClass is on the client". */
export function tabClass(active: boolean) {
  return cn(
    "px-4 py-2 text-sm -mb-px border-b-2 font-sans",
    active
      ? "text-primary-deep border-primary font-semibold"
      : "text-ink-soft border-transparent hover:text-ink"
  );
}
