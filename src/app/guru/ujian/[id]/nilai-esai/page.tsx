import { getSession } from "@/lib/auth";
import { getUjianDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";

export default async function NilaiEsaiPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const ujian = await getUjianDetail(id);
  if (!ujian) return null;

  const soalEsai = ujian.soal.filter((us) => us.soal.jenis === "ESAI");
  const jawabanEsai = ujian.pengerjaan.flatMap((p) =>
    p.jawaban
      .filter((j) => soalEsai.some((se) => se.soalId === j.soalId))
      .map((j) => ({ ...j, siswaNama: p.siswa.nama, poinMax: soalEsai.find((se) => se.soalId === j.soalId)?.poin ?? 0 }))
  );

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Nilai Esai — ${ujian.judul}`}
      pageSubtitle={`${ujian.kelas.nama} · ${jawabanEsai.filter((j) => j.skor === null).length} belum dinilai`}
    >
      <form action="/api/ujian/nilai-esai" method="POST" className="flex flex-col gap-4">
        <input type="hidden" name="ujianId" value={ujian.id} />
        {jawabanEsai.length === 0 && (
          <p className="text-sm text-ink-soft">Tidak ada jawaban esai untuk ujian ini.</p>
        )}
        {jawabanEsai.map((j) => {
          const soalTerkait = ujian.soal.find((us) => us.soalId === j.soalId)?.soal;
          return (
            <div key={j.id} className="bg-paper-raised border border-rule rounded-xl p-5">
              <input type="hidden" name="jawabanId" value={j.id} />
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{j.siswaNama}</span>
                {j.skor !== null ? (
                  <Pill tone="ok">Sudah dinilai: {j.skor}</Pill>
                ) : (
                  <Pill tone="warn">Perlu dinilai</Pill>
                )}
              </div>
              <p className="text-xs text-ink-soft mb-2">{soalTerkait?.pertanyaan}</p>
              <div className="bg-paper border border-rule rounded-lg p-3 text-sm mb-3">
                {j.jawabanTeks || <span className="text-ink-soft italic">Tidak dijawab</span>}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold">Skor (maks {j.poinMax}):</label>
                <input
                  type="number"
                  name={`skor_${j.id}`}
                  min={0}
                  max={j.poinMax}
                  defaultValue={j.skor ?? ""}
                  className="w-20 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum"
                />
              </div>
            </div>
          );
        })}
        {jawabanEsai.length > 0 && <Button type="submit" className="self-start">Simpan semua nilai</Button>}
      </form>
    </AppShell>
  );
}
