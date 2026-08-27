import { formatTanggal } from "@/lib/utils";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";

export type KomentarTampil = {
  id: string;
  isi: string;
  createdAt: Date;
  penulis: { id: string; nama: string; peran: string };
  balasan: { id: string; isi: string; createdAt: Date; penulis: { id: string; nama: string; peran: string } }[];
};

/**
 * Kolom komentar/tanya-jawab (DK-1..DK-4) — server component, form POST biasa konsisten
 * dgn pola app ini. Thread cuma 1 level (balasan tak punya balasan lagi).
 */
export function DiskusiPanel({
  komentar,
  targetType,
  targetId,
  canModerate,
}: {
  komentar: KomentarTampil[];
  targetType: "materi" | "tugas";
  targetId: string;
  canModerate: boolean;
}) {
  const hiddenField = targetType === "materi" ? "materiId" : "tugasId";

  return (
    <div className="flex flex-col gap-3">
      {komentar.length === 0 && (
        <p className="text-xs text-ink-soft">Belum ada komentar/pertanyaan.</p>
      )}
      {komentar.map((k) => (
        <div key={k.id} className="bg-paper border border-rule rounded-lg p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold">
              {k.penulis.nama} <span className="text-ink-soft font-normal">· {formatTanggal(k.createdAt)}</span>
            </div>
            {canModerate && (
              <form action="/api/diskusi/hapus" method="POST">
                <input type="hidden" name="komentarId" value={k.id} />
                <ConfirmSubmitLink confirmMessage="Hapus komentar ini?" className="text-[11px] text-danger hover:underline">
                  Hapus
                </ConfirmSubmitLink>
              </form>
            )}
          </div>
          <p className="text-sm mt-1">{k.isi}</p>

          {k.balasan.map((b) => (
            <div key={b.id} className="ml-4 mt-2 pl-3 border-l-2 border-rule">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold">
                  {b.penulis.nama} <span className="text-ink-soft font-normal">· {formatTanggal(b.createdAt)}</span>
                </div>
                {canModerate && (
                  <form action="/api/diskusi/hapus" method="POST">
                    <input type="hidden" name="komentarId" value={b.id} />
                    <ConfirmSubmitLink confirmMessage="Hapus balasan ini?" className="text-[11px] text-danger hover:underline">
                      Hapus
                    </ConfirmSubmitLink>
                  </form>
                )}
              </div>
              <p className="text-sm mt-1">{b.isi}</p>
            </div>
          ))}

          <details className="mt-2">
            <summary className="text-xs text-primary-deep font-semibold cursor-pointer">Balas</summary>
            <form action="/api/diskusi" method="POST" className="flex gap-2 mt-2">
              <input type="hidden" name={hiddenField} value={targetId} />
              <input type="hidden" name="parentId" value={k.id} />
              <input
                type="text"
                name="isi"
                required
                placeholder="Tulis balasan..."
                className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
              />
              <button type="submit" className="text-xs font-semibold text-primary-deep px-3">
                Kirim
              </button>
            </form>
          </details>
        </div>
      ))}

      <form action="/api/diskusi" method="POST" className="flex gap-2 pt-1">
        <input type="hidden" name={hiddenField} value={targetId} />
        <input
          type="text"
          name="isi"
          required
          placeholder="Tulis pertanyaan/komentar baru..."
          className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" className="text-xs font-semibold text-primary-deep px-3">
          Kirim
        </button>
      </form>
    </div>
  );
}
