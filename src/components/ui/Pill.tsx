import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "info" | "neutral" | "danger";

const toneClass: Record<Tone, string> = {
  ok: "bg-success-tint text-success",
  warn: "bg-warning-tint text-warning",
  info: "bg-primary-tint text-primary-deep",
  neutral: "bg-paper-sunken text-ink-soft",
  danger: "bg-danger-tint text-danger",
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
