import { getSession } from "@/lib/auth";
import { getKelasDiampu, getSiswaKelas, getNilaiKelasMapel } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";

export default async function NilaiPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; mapel?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const params = await searchParams;

  const penugasanAktif =
    penugasan.find((p) => p.kelas.id === params.kelas && p.mapel.id === params.mapel) ??
    penugasan[0];

  if (!penugasanAktif) {
    return (
      <AppShell
        groups={NAV_GURU}
        activeHref="/guru/nilai"
        userName={session.nama}
        userRoleLabel={ROLE_LABEL[session.peran]}
        pageTitle="Nilai & Rapor"
      >
        <p className="text-sm text-ink-soft">Belum ada kelas yang diampu.</p>
      </AppShell>
    );
  }

  const [siswa, nilaiTersimpan] = await Promise.all([
    getSiswaKelas(penugasanAktif.kelas.id),
    getNilaiKelasMapel(penugasanAktif.kelas.id, penugasanAktif.mapel.id),
  ]);

  const rataRata =
    nilaiTersimpan.length > 0
      ? Math.round(
          (nilaiTersimpan.reduce((sum, n) => sum + n.skor, 0) / nilaiTersimpan.length) * 10
        ) / 10
      : null;

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/nilai"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Input Nilai"
      pageSubtitle={`${penugasanAktif.mapel.nama} — Kelas ${penugasanAktif.kelas.nama} · KKM ${penugasanAktif.mapel.kkm}`}
    >
      {penugasan.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {penugasan.map((p) => (
            <a
              key={p.id}
              href={`/guru/nilai?kelas=${p.kelas.id}&mapel=${p.mapel.id}`}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (p.id === penugasanAktif.id
                  ? "bg-primary text-white border-primary font-semibold"
                  : "border-rule text-ink-soft hover:bg-paper-raised")
              }
            >
              {p.mapel.nama} · {p.kelas.nama}
            </a>
          ))}
        </div>
      )}

      <form
        action="/api/nilai"
        method="POST"
        className="bg-paper-raised border border-rule rounded-xl p-5 mb-6"
      >
        <input type="hidden" name="kelasId" value={penugasanAktif.kelas.id} />
        <input type="hidden" name="mapelId" value={penugasanAktif.mapel.id} />
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Komponen</label>
            <select
              name="komponen"
              className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
            >
              <option value="Ulangan Harian">Ulangan Harian</option>
              <option value="Tugas">Tugas</option>
              <option value="UTS">UTS</option>
              <option value="UAS">UAS</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold">Judul penilaian</label>
            <input
              name="judul"
              required
              placeholder="mis. UH 2 - Pecahan"
              className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-rule mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-3 py-2 font-bold w-10">No</th>
                <th className="text-left px-3 py-2 font-bold">Nama Siswa</th>
                <th className="text-left px-3 py-2 font-bold w-32">Nilai (0–100)</th>
              </tr>
            </thead>
            <tbody>
              {siswa.map((s, i) => (
                <tr key={s.id} className="border-t border-rule bg-paper">
                  <td className="px-3 py-2 tabnum">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{s.nama}</td>
                  <td className="px-3 py-2">
                    <input type="hidden" name="siswaId" value={s.id} />
                    <input
                      name={`skor_${s.id}`}
                      type="number"
                      min={0}
                      max={100}
                      className="w-16 text-center bg-paper-raised border border-rule rounded-md px-2 py-1.5 text-sm tabnum"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="submit">Simpan nilai</Button>
      </form>

      <div className="bg-paper-raised border border-rule rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Riwayat nilai tersimpan</h3>
          {rataRata !== null && (
            <span className="text-sm text-ink-soft">
              Rata-rata: <b className="text-ink tabnum">{rataRata}</b>
            </span>
          )}
        </div>
        {nilaiTersimpan.length === 0 ? (
          <p className="text-sm text-ink-soft">Belum ada nilai tersimpan.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {nilaiTersimpan.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-1.5"
              >
                <span>
                  {n.siswa.nama} — <span className="text-ink-soft">{n.judul}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabnum font-semibold">{n.skor}</span>
                  <Pill tone={n.skor >= penugasanAktif.mapel.kkm ? "ok" : "warn"}>
                    {n.skor >= penugasanAktif.mapel.kkm ? "Tuntas" : "Remedial"}
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
