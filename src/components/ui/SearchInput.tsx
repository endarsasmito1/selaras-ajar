import { cn } from "@/lib/utils";

/**
 * Padanan `.search` di prototipe (assets/styles.css) — kotak border dgn ikon 🔍 menyatu, dipakai
 * di semua input pencarian-nama. Sebelumnya di app sungguhan input pencarian cuma `<input>` polos
 * tanpa pembungkus/ikon di semua halaman (guru/murid, kepsek/siswa, superadmin/sekolah, dst).
 * Server component murni (uncontrolled, `defaultValue`) — cocok dipasang di form method="GET" yang
 * sudah dipakai di semua halaman itu, tanpa perlu JS tambahan.
 */
export function SearchInput({
  name,
  defaultValue,
  placeholder,
  className,
  inputClassName,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  /** Kelas di div pembungkus — bawa persis ukuran/lebar yg dipakai tiap halaman sebelumnya
   * (mis. "w-56 py-2", "px-3 py-1.5 w-48"), JANGAN dikasih default di sini biar gak nyeragamkan
   * lebar semua kotak cari yang sebenarnya sengaja beda-beda per konteks halaman. */
  className: string;
  /** Kelas ukuran teks utk <input> di dalamnya (mis. "text-sm" / "text-xs") — dipisah dari
   * className pembungkus krn ukuran teks & padding wrapper bisa beda kombinasi per halaman. */
  inputClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 bg-paper-raised border border-rule rounded-lg px-3.5", className)}>
      <span aria-hidden="true" className="text-ink-soft text-sm shrink-0">🔍</span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn("bg-transparent outline-none text-ink placeholder:text-ink-soft w-full", inputClassName)}
      />
    </div>
  );
}
