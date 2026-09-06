import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "info" | "neutral" | "danger" | "blue";

const toneClass: Record<Tone, string> = {
  ok: "bg-success-tint text-success",
  warn: "bg-warning-tint text-warning",
  info: "bg-primary-tint text-primary-deep",
  neutral: "bg-paper-sunken text-ink-soft",
  danger: "bg-danger-tint text-danger",
  // Padanan `.pill.blue` di prototipe — khusus status "Izin", sengaja beda hue dari `info`
  // (yang pakai primary-tint) supaya gak ketuker sama warna brand di konteks lain.
  blue: "bg-info-blue-tint text-info-blue",
};

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap",
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
