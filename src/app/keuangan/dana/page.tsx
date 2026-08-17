import { getSession } from "@/lib/auth";
import { getDanaAlokasi } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, NAV_KEUANGAN, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/utils";

export default async function TransparansiDanaBendaharaPage() {
  const session = await getSession();
  if (!session) return null;

  const { data, total } = await getDanaAlokasi(session.sekolahId);
  const groups = session.peran === "KEPALA_SEKOLAH" ? NAV_KEPSEK : NAV_KEUANGAN;

  return (
    <AppShell
      groups={groups}
      activeHref="/keuangan/dana"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Transparansi Pemakaian Dana"
      pageSubtitle="Diferensiator — orang tua bisa lihat ke mana dana dipakai, bukan cuma status bayar"
    >
      <div className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <div className="text-xs text-ink-soft mb-1">Total dana dialokasikan</div>
        <div className="font-serif text-3xl text-primary-deep tabnum">{formatRupiah(total)}</div>
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Periode</th>
              <th className="text-left px-4 py-2.5 font-bold">Kategori</th>
              <th className="text-left px-4 py-2.5 font-bold">Nominal</th>
              <th className="text-left px-4 py-2.5 font-bold">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id} className="border-t border-rule">
                <td className="px-4 py-2.5 text-ink-soft">{d.periode}</td>
                <td className="px-4 py-2.5 font-medium">{d.kategori}</td>
                <td className="px-4 py-2.5 tabnum">{formatRupiah(d.nominal)}</td>
                <td className="px-4 py-2.5 tabnum text-ink-soft">{total > 0 ? Math.round((d.nominal / total) * 100) : 0}%</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-ink-soft text-xs">Belum ada alokasi dicatat.</td></tr>}
          </tbody>
        </table>
      </div>

      <details className="bg-paper-raised border border-rule rounded-xl p-5">
        <summary className="cursor-pointer font-semibold text-sm">+ Catat alokasi dana</summary>
        <form action="/api/dana" method="POST" className="mt-4 grid md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Periode</label>
            <input name="periode" required placeholder="Semester Ganjil 2026/2027" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Kategori</label>
            <input name="kategori" required placeholder="mis. Gaji guru & staf" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Nominal (Rp)</label>
            <input name="nominal" type="number" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <Button type="submit" size="sm" className="self-start md:col-span-3 w-fit">Tambah</Button>
        </form>
      </details>
    </AppShell>
  );
}
