import { cn } from "@/lib/utils";

/** §6.12 ui-design-system-selaras-ajar.md — tren mini di halaman performa murid. Presentational
 * murni (div bar, bukan chart library) — cukup utk "naik/turun sekilas", bukan analisis detail. */
export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[3px] h-[34px]">
      {values.map((v, i) => (
        <span
          key={i}
          className="flex-1 bg-primary rounded-t-sm opacity-85 min-h-[3px]"
          style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
        />
      ))}
    </div>
  );
}

/** `netralDi` — ambang di mana perubahan dianggap gak signifikan (mis. ±1 poin nilai bukan
 * "naik"/"turun" beneran) dan ditampilkan sbg panah datar netral, bukan hijau/oranye. */
export function Trend({ value, satuan = "", netralDi = 0 }: { value: number; satuan?: string; netralDi?: number }) {
  const arah = value > netralDi ? "naik" : value < -netralDi ? "turun" : "netral";
  return (
    <span
      className={cn(
        "text-xs font-bold whitespace-nowrap",
        arah === "naik" ? "text-success" : arah === "turun" ? "text-warning" : "text-ink-soft"
      )}
    >
      {arah === "naik" ? "▲" : arah === "turun" ? "▼" : "→"} {Math.abs(value)}
      {satuan}
    </span>
  );
}
