import { cn } from "@/lib/utils";

export function Callout({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "info"
          ? "bg-primary-tint border-primary/30 text-primary-deep"
          : "bg-warning-tint border-warning/35 text-warning"
      )}
    >
      {children}
    </div>
  );
}
