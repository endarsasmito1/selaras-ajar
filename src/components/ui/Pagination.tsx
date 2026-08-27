import { cn } from "@/lib/utils";

function daftarHalaman(halaman: number, total: number): (number | "...")[] {
  const tampil = new Set<number>([1, total, halaman - 1, halaman, halaman + 1]);
  const hasil: (number | "...")[] = [];
  let sebelumnya = 0;
  for (let h = 1; h <= total; h++) {
    if (!tampil.has(h)) continue;
    if (h - sebelumnya > 1) hasil.push("...");
    hasil.push(h);
    sebelumnya = h;
  }
  return hasil;
}

/**
 * Pagination bernomor dgn pemangkasan elipsis (1 2 3 … 12 13 14 … 28 29) — dibuat supaya
 * total halaman besar (mis. mutasi siswa 29 halaman) tak lagi dump semua nomor & overflow.
 * Server component murni (link biasa), konsisten dgn pola app ini yg tak pakai client state
 * utk navigasi halaman.
 */
export function Pagination({ halaman, totalHalaman, hrefHalaman }: { halaman: number; totalHalaman: number; hrefHalaman: (h: number) => string }) {
  if (totalHalaman <= 1) return null;
  const list = daftarHalaman(halaman, totalHalaman);
  const tautanClass = (aktif: boolean, nonaktif: boolean) =>
    cn(
      "px-2.5 py-1 rounded border text-xs tabnum",
      aktif ? "bg-primary text-white border-primary font-semibold" : "border-rule hover:bg-paper-raised",
      nonaktif && "pointer-events-none opacity-40"
    );

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 mt-3 text-xs">
      <a href={hrefHalaman(1)} className={tautanClass(false, halaman <= 1)}>«</a>
      <a href={hrefHalaman(Math.max(1, halaman - 1))} className={tautanClass(false, halaman <= 1)}>‹</a>
      {list.map((h, i) =>
        h === "..." ? (
          <span key={`e${i}`} className="px-1.5 text-ink-soft">…</span>
        ) : (
          <a key={h} href={hrefHalaman(h)} className={tautanClass(h === halaman, false)}>
            {h}
          </a>
        )
      )}
      <a href={hrefHalaman(Math.min(totalHalaman, halaman + 1))} className={tautanClass(false, halaman >= totalHalaman)}>›</a>
      <a href={hrefHalaman(totalHalaman)} className={tautanClass(false, halaman >= totalHalaman)}>»</a>
    </div>
  );
}
