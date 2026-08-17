import { getSession } from "@/lib/auth";
import { getTugasDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

export default async function TugasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const tugas = await getTugasDetail(id);
  if (!tugas) return null;

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/tugas"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={tugas.judul}
      pageSubtitle={`${tugas.mapel.nama} · ${tugas.kelas.nama} · tenggat ${formatTanggal(tugas.tenggat)}`}
    >
      <p className="text-sm bg-paper-raised border border-rule rounded-xl p-4 mb-6">{tugas.instruksi}</p>

      <form action="/api/tugas/nilai" method="POST" className="flex flex-col gap-3">
        <input type="hidden" name="tugasId" value={tugas.id} />
        <h3 className="text-sm font-semibold">Terkumpul ({tugas.pengumpulan.length})</h3>
        {tugas.pengumpulan.map((p) => (
          <div key={p.id} className="bg-paper-raised border border-rule rounded-xl p-4">
            <input type="hidden" name="pengumpulanId" value={p.id} />
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{p.siswa.nama}</span>
              <div className="flex items-center gap-2">
                {p.terlambat && <Pill tone="warn">Terlambat</Pill>}
                {p.nilai !== null && <Pill tone="ok">Nilai: {p.nilai}</Pill>}
              </div>
            </div>
            <div className="bg-paper border border-rule rounded-lg p-3 text-sm mb-3">{p.isiJawaban || <span className="text-ink-soft italic">Tidak ada jawaban teks</span>}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-semibold">Nilai:</label>
              <input type="number" name={`nilai_${p.id}`} min={0} max={100} defaultValue={p.nilai ?? ""} className="w-20 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum" />
              <label className="text-xs font-semibold ml-2">Catatan:</label>
              <input name={`catatan_${p.id}`} defaultValue={p.catatanGuru ?? ""} className="flex-1 min-w-[160px] bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
            </div>
          </div>
        ))}

        {tugas.belumKumpul.length > 0 && (
          <>
            <h3 className="text-sm font-semibold mt-2">Belum mengumpulkan ({tugas.belumKumpul.length})</h3>
            <div className="bg-paper-raised border border-rule rounded-xl p-4 flex flex-wrap gap-2">
              {tugas.belumKumpul.map((s) => (
                <Pill key={s.id} tone="neutral">{s.nama}</Pill>
              ))}
            </div>
          </>
        )}

        {tugas.pengumpulan.length > 0 && <Button type="submit" className="self-start">Simpan nilai & catatan</Button>}
      </form>
    </AppShell>
  );
}
