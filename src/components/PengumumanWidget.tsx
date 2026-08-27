import { getPengumumanTerbaru } from "@/lib/data";
import { Card, CardHead } from "@/components/ui/Card";
import { formatTanggal } from "@/lib/utils";

/** Widget "Pengumuman terbaru" (1.20) — dipakai di dashboard guru/murid/ortu/TU/kepsek. */
export async function PengumumanWidget({ sekolahId }: { sekolahId: string }) {
  const pengumuman = await getPengumumanTerbaru(sekolahId, 3);
  if (pengumuman.length === 0) return null;

  return (
    <Card>
      <CardHead title="📣 Pengumuman terbaru" />
      <div className="flex flex-col gap-3">
        {pengumuman.map((p) => (
          <div key={p.id} className="border-b border-rule last:border-0 pb-2.5 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="font-semibold text-sm">{p.judul}</h4>
              <span className="text-[11px] text-ink-soft shrink-0">{formatTanggal(p.createdAt)}</span>
            </div>
            <p className="text-xs text-ink-soft mt-1 line-clamp-2 whitespace-pre-line">{p.isi}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
