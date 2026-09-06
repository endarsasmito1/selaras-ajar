/**
 * Padanan `SA.donut()` di prototipe (assets/app.js) — cincin persentase pakai `conic-gradient`
 * CSS murni, gak perlu SVG/canvas/library. Dipakai utk "Kehadiran" di dashboard Murid/Ortu, dst.
 */
export function Donut({
  persen,
  tone = "primary",
  caption,
}: {
  persen: number;
  tone?: "primary" | "gold";
  caption?: string;
}) {
  const warna = tone === "gold" ? "var(--accent)" : "var(--primary-deep)";
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="w-[88px] h-[88px] rounded-full flex items-center justify-center mb-2.5"
        style={{ background: `conic-gradient(${warna} ${persen}%, var(--rule-soft) 0)` }}
      >
        <div className="w-[66px] h-[66px] rounded-full bg-paper flex items-center justify-center font-serif font-bold text-[17px] text-primary-deeper">
          {persen}%
        </div>
      </div>
      {caption && <p className="text-xs text-ink-soft m-0">{caption}</p>}
    </div>
  );
}
