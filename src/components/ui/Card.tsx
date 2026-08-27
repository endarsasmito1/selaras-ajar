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

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneClass =
    tone === "good" ? "text-primary-deep" : tone === "warn" ? "text-warning" : "text-ink";
  return (
    <Card>
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
