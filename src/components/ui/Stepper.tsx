import { cn } from "@/lib/utils";

/** §6.10 ui-design-system-selaras-ajar.md — alur bertahap (impor CSV: Pilih → Unggah → Periksa →
 * Simpan). Presentational murni, gak nyimpan state — `activeIndex` didorong dari step URL/kondisi
 * server yang sudah ada di tiap halaman wizard. */
export function Stepper({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="flex flex-wrap items-center mb-6" role="list" aria-label="Langkah">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center" role="listitem">
          <div className="flex items-center gap-2.5 text-xs">
            <span
              className={cn(
                "w-[26px] h-[26px] rounded-full flex items-center justify-center font-bold text-xs font-serif shrink-0",
                i < activeIndex
                  ? "bg-success text-white"
                  : i === activeIndex
                  ? "bg-primary text-white"
                  : "bg-paper-sunken text-ink-soft"
              )}
              aria-hidden="true"
            >
              {i < activeIndex ? "✓" : i + 1}
            </span>
            <span className={cn(i === activeIndex ? "text-ink font-semibold" : "text-ink-soft")}>{label}</span>
          </div>
          {i < steps.length - 1 && <span className="w-11 h-0.5 bg-rule mx-3 shrink-0" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}
