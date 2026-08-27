import { getSession } from "@/lib/auth";
import { getTugasByGuru, getKelasDiampu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export default async function TugasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { error } = await searchParams;

  const [tugasList, penugasan] = await Promise.all([
    getTugasByGuru(session.userId),
    getKelasDiampu(session.userId),
  ]);

  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());
  const countPerKelas = new Map<string, number>();
  for (const t of tugasList) countPerKelas.set(t.kelasId, (countPerKelas.get(t.kelasId) ?? 0) + 1);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/tugas"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Tugas / PR"
      pageSubtitle={`${tugasList.length} tugas dibuat — pilih kelas untuk lihat daftarnya (1.6)`}
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Buat tugas baru</summary>
        <form action="/api/tugas" method="POST" encType="multipart/form-data" className="mt-4">
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Kelas + mapel</label>
              <select name="penugasan" id="penugasan-tugas" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                {penugasan.map((p) => (
                  <option key={p.id} value={`${p.kelas.id}|${p.mapel.id}`}>{p.kelas.nama} — {p.mapel.nama}</option>
                ))}
              </select>
              <input type="hidden" name="kelasId" id="kelasId-tugas" />
              <input type="hidden" name="mapelId" id="mapelId-tugas" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Tenggat</label>
              <input type="datetime-local" name="tenggat" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-semibold">Judul</label>
            <input name="judul" required placeholder="mis. PR Pecahan" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-semibold">Instruksi</label>
            <RichTextEditor name="instruksi" required rows={3} placeholder="Kerjakan soal halaman 24…" />
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Lampiran (unggah berkas, opsional)</label>
              <input name="lampiranFile" type="file" className="text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Tautan rujukan (opsional)</label>
              <input name="tautanUrl" type="url" placeholder="https://youtube.com/…" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <Button type="submit" size="sm">Publikasikan tugas</Button>
        </form>
      </details>

      <div className="grid md:grid-cols-3 gap-3.5">
        {kelasUnik.map((k) => (
          <a key={k.id} href={`/guru/tugas/kelas/${k.id}`}>
            <Card className="hover:border-primary">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold">Kelas {k.nama}</h3>
                <Pill tone="info">{countPerKelas.get(k.id) ?? 0} tugas</Pill>
              </div>
              <p className="text-xs text-ink-soft">Lihat daftar tugas kelas ini</p>
            </Card>
          </a>
        ))}
        {kelasUnik.length === 0 && <p className="text-sm text-ink-soft">Belum ada kelas yang diampu.</p>}
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            function syncTugas(){
              var sel = document.getElementById('penugasan-tugas');
              if (!sel || !sel.value) return;
              var parts = sel.value.split('|');
              document.getElementById('kelasId-tugas').value = parts[0];
              document.getElementById('mapelId-tugas').value = parts[1];
            }
            document.getElementById('penugasan-tugas')?.addEventListener('change', syncTugas);
            syncTugas();
          `,
        }}
      />
    </AppShell>
  );
}
