import { getSession } from "@/lib/auth";
import { getTugasByGuru, getKelasDiampu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

export default async function TugasPage() {
  const session = await getSession();
  if (!session) return null;

  const [tugasList, penugasan] = await Promise.all([
    getTugasByGuru(session.userId),
    getKelasDiampu(session.userId),
  ]);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/tugas"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Tugas / PR"
      pageSubtitle={`${tugasList.length} tugas dibuat`}
    >
      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Buat tugas baru</summary>
        <form action="/api/tugas" method="POST" className="mt-4">
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
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-xs font-semibold">Instruksi</label>
            <textarea name="instruksi" required rows={2} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="Kerjakan soal halaman 24…" />
          </div>
          <Button type="submit" size="sm">Publikasikan tugas</Button>
        </form>
      </details>

      <div className="flex flex-col gap-2.5">
        {tugasList.length === 0 && <p className="text-sm text-ink-soft">Belum ada tugas dibuat.</p>}
        {tugasList.map((t) => {
          const dinilai = t.pengumpulan.filter((p) => p.nilai !== null).length;
          return (
            <a key={t.id} href={`/guru/tugas/${t.id}`} className="block bg-paper-raised border border-rule rounded-xl px-5 py-4 hover:border-primary">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-sm">{t.judul}</div>
                  <div className="text-xs text-ink-soft mt-0.5">{t.mapel.nama} · {t.kelas.nama} · tenggat {formatTanggal(t.tenggat)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="info">{t.pengumpulan.length} terkumpul</Pill>
                  <Pill tone={dinilai === t.pengumpulan.length && t.pengumpulan.length > 0 ? "ok" : "warn"}>{dinilai} dinilai</Pill>
                </div>
              </div>
            </a>
          );
        })}
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
