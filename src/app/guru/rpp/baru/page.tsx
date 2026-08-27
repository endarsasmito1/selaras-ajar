import { getSession } from "@/lib/auth";
import { getKelasDiampu, getCapaianBank } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export default async function RPPBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { error } = await searchParams;

  const [penugasan, capaianList] = await Promise.all([
    getKelasDiampu(session.userId),
    getCapaianBank(session.sekolahId),
  ]);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/rpp"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Buat RPP"
      pageSubtitle="RPP-1..RPP-4"
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <form action="/api/rpp" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-2xl flex flex-col gap-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Kelas + mapel</label>
            <select name="penugasan" id="penugasan-rpp" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              {penugasan.map((p) => (
                <option key={p.id} value={`${p.kelas.id}|${p.mapel.id}`}>{p.kelas.nama} — {p.mapel.nama}</option>
              ))}
            </select>
            <input type="hidden" name="kelasId" id="kelasId-rpp" />
            <input type="hidden" name="mapelId" id="mapelId-rpp" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Judul / topik pertemuan</label>
            <input name="judul" required placeholder="mis. Pecahan Senilai — Pertemuan 1" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">Isi RPP</label>
          <RichTextEditor name="isi" required rows={6} placeholder="Tujuan pembelajaran, langkah kegiatan, penilaian…" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Lampiran (tautan berkas RPP dari luar sistem, opsional)</label>
          <input name="lampiranUrl" type="url" placeholder="https://…" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">Capaian Pembelajaran terkait</label>
          <div className="bg-paper border border-rule rounded-lg p-3 max-h-48 overflow-y-auto flex flex-col gap-1.5">
            {capaianList.length === 0 && (
              <p className="text-xs text-ink-soft">
                Belum ada CP/TP di bank. <a href="/guru/rpp/capaian" className="text-primary-deep hover:underline">Tambah dulu di sini.</a>
              </p>
            )}
            {capaianList.map((c) => (
              <label key={c.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="capaianIds" value={c.id} className="mt-1" />
                <span>{c.kode && <b>{c.kode}</b>} {c.deskripsi} <span className="text-ink-soft text-xs">({c.mapel.nama})</span></span>
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" className="self-start">Simpan RPP</Button>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            function syncRpp(){
              var sel = document.getElementById('penugasan-rpp');
              if (!sel || !sel.value) return;
              var parts = sel.value.split('|');
              document.getElementById('kelasId-rpp').value = parts[0];
              document.getElementById('mapelId-rpp').value = parts[1];
            }
            document.getElementById('penugasan-rpp')?.addEventListener('change', syncRpp);
            syncRpp();
          `,
        }}
      />
    </AppShell>
  );
}
