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

/**
 * Padanan `.chip`/`.chip.active` di prototipe (`assets/styles.css` — "Chip pill selector, mis.
 * 'Kelas 5B/4A/6A'"). Dipakai KHUSUS buat switch-kelas di halaman guru (absensi/materi/tanya-jawab/
 * nilai-asesmen) — beda dari `tabClass` yang dipakai buat tab isi-halaman (Isi Absensi/Riwayat, dst).
 * Prototipe sengaja pakai 2 bahasa visual berbeda utk 2 konsep navigasi berbeda: pil-bulat penuh
 * (chip) = "kamu lagi lihat data KELAS mana", garis-bawah (tab) = "kamu lagi lihat TAMPILAN yang
 * mana dari kelas yang sama" — jangan disamakan jadi satu gaya kayak sebelumnya (ND-1).
 */
export function chipClass(active: boolean) {
  return cn(
    "px-4 py-1.5 rounded-full text-xs font-bold border font-sans",
    active
      ? "bg-primary-deep border-primary-deep text-white"
      : "bg-transparent border-rule text-ink-soft hover:border-primary-deep/40"
  );
}
