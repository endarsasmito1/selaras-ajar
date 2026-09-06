import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-paper-raised border border-rule rounded-xl p-5 shadow-sm min-w-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Padanan `.stat .icon-badge`/`.icon-badge.warn`/`.icon-badge.ok`/`.icon-badge.gold` di prototipe
// (assets/styles.css) — kotak ikon 34x34 warna sesuai tone, dipasang SEBELUM label tiap stat.
const ICON_BADGE_TONE: Record<string, string> = {
  default: "bg-primary-tint text-primary-deep",
  good: "bg-success-tint text-success-text",
  warn: "bg-warning-tint text-warning",
  gold: "bg-accent-tint text-accent-deep",
};

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn";
  /** Emoji/karakter ikon opsional — kalau diisi, tampil sbg kotak warna di atas label (persis
   * `.icon-badge` prototipe). Opsional & backward-compatible: StatCard lama tanpa ikon tetap sah. */
  icon?: string;
}) {
  const toneClass =
    tone === "good" ? "text-primary-deep" : tone === "warn" ? "text-warning" : "text-ink";
  return (
    <Card>
      {icon && (
        <div className={cn("w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-base mb-3", ICON_BADGE_TONE[tone === "good" ? "good" : tone === "warn" ? "warn" : "default"])}>
          {icon}
        </div>
      )}
      <div className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">
        {label}
      </div>
      {/* 1.21 — angka panjang (mis. "Rp156.800.000") tak punya titik spasi utk break-words wrap
          dgn wajar, dulu jadi patah di tengah digit; text-xl + nowrap muat tanpa perlu wrap sama sekali. */}
      <div className={cn("font-serif text-xl mt-1.5 tabnum whitespace-nowrap", toneClass)}>{value}</div>
      {sub && <div className="text-xs text-ink-soft mt-1">{sub}</div>}
    </Card>
  );
}
