import { getSession } from "@/lib/auth";
import { getCapaianBank, getKelasDiampu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export default async function CapaianBankPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { error } = await searchParams;

  const [capaianList, penugasan] = await Promise.all([
    getCapaianBank(session.sekolahId),
    getKelasDiampu(session.userId),
  ]);
  const mapelUnik = Array.from(new Map(penugasan.map((p) => [p.mapel.id, p.mapel])).values());

  const perMapel = new Map<string, { nama: string; items: typeof capaianList }>();
  for (const c of capaianList) {
    const cur = perMapel.get(c.mapelId) ?? { nama: c.mapel.nama, items: [] };
    cur.items.push(c);
    perMapel.set(c.mapelId, cur);
  }

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/rpp"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Bank Capaian Pembelajaran"
      pageSubtitle="RPP-2 — bisa diisi/disesuaikan sekolah, tak terikat satu struktur kurikulum baku"
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <a href="/guru/rpp" className="text-xs font-semibold text-primary-deep hover:underline mb-4 inline-block">← RPP saya</a>

      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Tambah Capaian Pembelajaran</summary>
        <form action="/api/capaian" method="POST" className="mt-4 grid md:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Mapel</label>
            <select name="mapelId" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              {mapelUnik.map((m) => (<option key={m.id} value={m.id}>{m.nama}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Kode (opsional)</label>
            <input name="kode" placeholder="mis. CP.5.1" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold">Deskripsi</label>
            <input name="deskripsi" required placeholder="mis. Siswa mampu menjumlahkan pecahan berpenyebut sama" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <Button type="submit" size="sm" className="md:col-span-4 w-fit">Simpan</Button>
        </form>
      </details>

      <div className="flex flex-col gap-3">
        {Array.from(perMapel.values()).map((grup) => (
          <details key={grup.nama} open className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5">
            <summary className="cursor-pointer font-semibold text-sm">{grup.nama} ({grup.items.length})</summary>
            <div className="flex flex-col gap-1.5 mt-3">
              {grup.items.map((c) => (
                <div key={c.id} className="text-sm border-b border-rule last:border-0 py-1.5">
                  {c.kode && <span className="font-semibold mr-2">{c.kode}</span>}
                  {c.deskripsi}
                </div>
              ))}
            </div>
          </details>
        ))}
        {perMapel.size === 0 && <p className="text-sm text-ink-soft">Belum ada Capaian Pembelajaran.</p>}
      </div>
    </AppShell>
  );
}
