import { getSession } from "@/lib/auth";
import { getGradeScale, getSemuaMapel } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";

const KOMPONEN = ["Ulangan Harian", "Tugas", "UTS", "UAS"];

export default async function NilaiPengaturanPage() {
  const session = await getSession();
  if (!session) return null;

  const [gradeScale, mapelList] = await Promise.all([
    getGradeScale(session.sekolahId),
    getSemuaMapel(session.sekolahId),
  ]);

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/nilai-pengaturan"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Pengaturan Nilai"
      pageSubtitle="Pembobotan komponen & rentang predikat — dipakai di seluruh rapor & tampilan nilai"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHead title="Pembobotan nilai akhir" subtitle="Bobot komponen untuk hitung nilai akhir, per mapel" />
          {mapelList.map((m) => {
            const bobotMap = new Map(m.bobot.map((b) => [b.komponen, b.persentase]));
            const total = KOMPONEN.reduce((s, k) => s + (bobotMap.get(k) ?? 0), 0);
            return (
              <details key={m.id} className="mb-3 border-t border-rule pt-3 first:border-0 first:pt-0">
                <summary className="cursor-pointer text-sm font-semibold">{m.nama} <span className="text-ink-soft font-normal text-xs">({total}%)</span></summary>
                <form action="/api/nilai-config/bobot" method="POST" className="mt-3 flex flex-col gap-2.5">
                  <input type="hidden" name="mapelId" value={m.id} />
                  {KOMPONEN.map((k) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-xs w-32">{k}</span>
                      <input type="number" name={`bobot_${k}`} defaultValue={bobotMap.get(k) ?? 0} min={0} max={100} className="w-20 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum" />
                      <span className="text-xs text-ink-soft">%</span>
                    </div>
                  ))}
                  <Button type="submit" size="sm" className="self-start mt-1">Simpan bobot {m.nama}</Button>
                </form>
              </details>
            );
          })}
        </Card>

        <Card>
          <CardHead title="Rentang nilai → predikat" subtitle="Angka berapa masuk predikat apa" />
          <form action="/api/nilai-config/predikat" method="POST" className="flex flex-col gap-3">
            {gradeScale.map((g) => (
              <div key={g.id} className="flex items-center gap-2">
                <input type="hidden" name="scaleId" value={g.id} />
                <input type="number" name={`min_${g.id}`} defaultValue={g.minSkor} className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum" />
                <span className="text-ink-soft text-xs">–</span>
                <input type="number" name={`max_${g.id}`} defaultValue={g.maxSkor} className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum" />
                <input name={`label_${g.id}`} defaultValue={g.label} className="flex-1 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
              </div>
            ))}
            <div className="border-t border-rule pt-3 mt-1">
              <p className="text-xs font-semibold mb-2">+ Tambah rentang baru</p>
              <div className="flex items-center gap-2">
                <input type="number" name="minBaru" placeholder="min" className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
                <span className="text-ink-soft text-xs">–</span>
                <input type="number" name="maxBaru" placeholder="maks" className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
                <input name="labelBaru" placeholder="Label predikat" className="flex-1 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
              </div>
            </div>
            <Button type="submit" size="sm" className="self-start">Simpan rentang predikat</Button>
          </form>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHead title="KKM per mata pelajaran" subtitle="Batas ketuntasan — menentukan status tuntas/remedial otomatis" />
        <div className="flex flex-col gap-2">
          {mapelList.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-2">
              <span>{m.nama}</span>
              <span className="tabnum font-semibold">{m.kkm}</span>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
