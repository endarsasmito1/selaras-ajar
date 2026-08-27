import { getSession } from "@/lib/auth";
import { getProjekDetail, getKelasDiampu, getSiswaKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { notFound } from "next/navigation";

const CAPAIAN_OPSI = ["BB", "MB", "BSH", "SB"] as const;

export default async function ProjekDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kelas?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;

  const projek = await getProjekDetail(id, session.sekolahId);
  if (!projek) notFound();
  const dimensiList: string[] = JSON.parse(projek.dimensiP5);

  const penugasan = await getKelasDiampu(session.userId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());
  const kelasAktifId = sp.kelas ?? kelasUnik[0]?.id;
  const siswaList = kelasAktifId ? await getSiswaKelas(kelasAktifId) : [];

  const nilaiMap = new Map(projek.penilaian.map((p) => [`${p.siswaId}-${p.dimensi}`, p]));

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/projek"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={projek.tema}
      pageSubtitle="Nilai per siswa per dimensi — skala BB/MB/BSH/SB"
    >
      <form method="GET" className="mb-5">
        <select name="kelas" defaultValue={kelasAktifId} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
          {kelasUnik.map((k) => (<option key={k.id} value={k.id}>{k.nama}</option>))}
        </select>
        <Button type="submit" size="sm" variant="ghost" className="ml-2">Tampilkan</Button>
      </form>

      <form action="/api/projek/nilai" method="POST">
        <input type="hidden" name="projekId" value={projek.id} />
        {dimensiList.map((d) => (<input key={d} type="hidden" name="dimensiList" value={d} />))}
        <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2.5 font-bold">Siswa</th>
                {dimensiList.map((d) => (
                  <th key={d} className="text-left px-4 py-2.5 font-bold">{d.length > 20 ? d.slice(0, 18) + "…" : d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s) => (
                <tr key={s.id} className="border-t border-rule">
                  <td className="px-4 py-2.5 font-semibold">
                    <input type="hidden" name="siswaId" value={s.id} />
                    {s.nama}
                  </td>
                  {dimensiList.map((d) => {
                    const existing = nilaiMap.get(`${s.id}-${d}`);
                    return (
                      <td key={d} className="px-4 py-2.5">
                        <select name={`capaian_${s.id}_${d}`} defaultValue={existing?.capaian ?? ""} className="bg-paper border border-rule rounded-md px-2 py-1 text-xs">
                          <option value="">—</option>
                          {CAPAIAN_OPSI.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {siswaList.length === 0 && (
                <tr><td colSpan={dimensiList.length + 1} className="px-4 py-6 text-center text-ink-soft text-xs">Tidak ada siswa.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {siswaList.length > 0 && <Button type="submit" className="mt-4">Simpan penilaian</Button>}
      </form>
    </AppShell>
  );
}
