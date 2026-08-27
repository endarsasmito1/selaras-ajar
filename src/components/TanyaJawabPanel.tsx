import { formatTanggal } from "@/lib/utils";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";

export type TanyaJawabTampil = {
  id: string;
  isi: string;
  anonim: boolean;
  createdAt: Date;
  pengguna: { id: string; nama: string; peran: string };
  balasan: { id: string; isi: string; anonim: boolean; createdAt: Date; pengguna: { id: string; nama: string; peran: string } }[];
};

function namaTampil(p: { nama: string }, anonim: boolean, canModerate: boolean) {
  if (!anonim) return p.nama;
  // Guru (canModerate) tetap lihat nama asli buat keperluan moderasi — murid lain lihat "Anonim".
  return canModerate ? `${p.nama} (anonim)` : "Anonim";
}

/**
 * 1.23 — Tanya Jawab Kelas: fitur baru terpisah dari DiskusiPanel/KomentarKonten, per kelas+mapel.
 * Murid sengaja gak dikasih tombol hapus sama sekali (server pun gak punya route hapus utk murid) —
 * larangan ditegakkan lewat ketiadaan endpoint, bukan cek role di UI.
 */
export function TanyaJawabPanel({
  pertanyaan,
  kelasId,
  mapelId,
  canModerate,
}: {
  pertanyaan: TanyaJawabTampil[];
  kelasId: string;
  mapelId: string;
  canModerate: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {pertanyaan.length === 0 && (
        <p className="text-xs text-ink-soft">Belum ada pertanyaan.</p>
      )}
      {pertanyaan.map((t) => (
        <div key={t.id} className="bg-paper-raised border border-rule rounded-lg p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold">
              {namaTampil(t.pengguna, t.anonim, canModerate)}{" "}
              <span className="text-ink-soft font-normal">· {formatTanggal(t.createdAt)}</span>
            </div>
            {canModerate && (
              <form action="/api/tanya-jawab/hapus" method="POST">
                <input type="hidden" name="tanyaJawabId" value={t.id} />
                <ConfirmSubmitLink confirmMessage="Hapus pertanyaan ini?" className="text-[11px] text-danger hover:underline">
                  Hapus
                </ConfirmSubmitLink>
              </form>
            )}
          </div>
          <p className="text-sm mt-1">{t.isi}</p>

          {t.balasan.map((b) => (
            <div key={b.id} className="ml-4 mt-2 pl-3 border-l-2 border-rule">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold">
                  {namaTampil(b.pengguna, b.anonim, canModerate)}{" "}
                  <span className="text-ink-soft font-normal">· {formatTanggal(b.createdAt)}</span>
                </div>
                {canModerate && (
                  <form action="/api/tanya-jawab/hapus" method="POST">
                    <input type="hidden" name="tanyaJawabId" value={b.id} />
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
            <form action="/api/tanya-jawab" method="POST" className="flex flex-col gap-2 mt-2">
              <input type="hidden" name="kelasId" value={kelasId} />
              <input type="hidden" name="mapelId" value={mapelId} />
              <input type="hidden" name="parentId" value={t.id} />
              <div className="flex gap-2">
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
              </div>
              <label className="text-[11px] text-ink-soft flex items-center gap-1.5">
                <input type="checkbox" name="anonim" value="1" /> Kirim sebagai anonim
              </label>
            </form>
          </details>
        </div>
      ))}

      <form action="/api/tanya-jawab" method="POST" className="flex flex-col gap-2 pt-1">
        <input type="hidden" name="kelasId" value={kelasId} />
        <input type="hidden" name="mapelId" value={mapelId} />
        <div className="flex gap-2">
          <input
            type="text"
            name="isi"
            required
            placeholder="Tulis pertanyaan baru..."
            className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" className="text-xs font-semibold text-primary-deep px-3">
            Kirim
          </button>
        </div>
        <label className="text-[11px] text-ink-soft flex items-center gap-1.5">
          <input type="checkbox" name="anonim" value="1" /> Kirim sebagai anonim
        </label>
      </form>
    </div>
  );
}
