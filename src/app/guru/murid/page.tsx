import { getSession } from "@/lib/auth";
import { getMuridDiampuGuru, getTingkatTersedia, getRankingParalel, cariMuridDiampuGuru } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export default async function MuridGuruPage({
  searchParams,
}: {
  searchParams: Promise<{ tingkat?: string; halaman?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const perKelas = await getMuridDiampuGuru(session.userId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/murid"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Murid"
      pageSubtitle="Ranking paralel per tingkat, cari nama, atau pilih kelas untuk lihat daftar & ranking murid (1.6)"
    >
      <form method="GET" className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama murid…"
          className="bg-paper-raised border border-rule rounded-lg px-3.5 py-2 text-sm w-80"
        />
      </form>

      {q ? (
        <HasilPencarian guruPenggunaId={session.userId} q={q} />
      ) : (
        <>
          <RankingParalel sekolahId={session.sekolahId} sp={sp} />

          <h3 className="text-sm font-semibold mb-2 mt-6">Kelas yang diampu</h3>
          <div className="grid md:grid-cols-3 gap-3.5">
            {perKelas.map(({ kelas, siswa }) => (
              <a key={kelas.id} href={`/guru/murid/kelas/${kelas.id}`}>
                <Card className="hover:border-primary">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-semibold">Kelas {kelas.nama}</h3>
                    <Pill tone="info">{siswa.length} murid</Pill>
                  </div>
                  <p className="text-xs text-ink-soft">Lihat daftar & ranking murid kelas ini</p>
                </Card>
              </a>
            ))}
            {perKelas.length === 0 && <p className="text-sm text-ink-soft">Belum ada kelas yang diampu.</p>}
          </div>
        </>
      )}
    </AppShell>
  );
}

async function RankingParalel({ sekolahId, sp }: { sekolahId: string; sp: { tingkat?: string; halaman?: string } }) {
  const tingkatList = await getTingkatTersedia(sekolahId);
  if (tingkatList.length === 0) return null;
  const tingkatAktif = sp.tingkat ? Number(sp.tingkat) : tingkatList[0];
  const halaman = Number(sp.halaman) || 1;
  const { data, total, totalHalaman, halaman: halamanAman } = await getRankingParalel(sekolahId, tingkatAktif, halaman);

  return (
    <div className="bg-paper-raised border border-rule rounded-xl p-4 mb-2">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold">Ranking paralel — Kelas {tingkatAktif} ({total} murid)</h3>
        <form method="GET" className="flex items-center gap-1.5">
          <label className="text-xs text-ink-soft">Tingkat:</label>
          <select name="tingkat" defaultValue={tingkatAktif} className="bg-paper border border-rule rounded-lg px-2 py-1.5 text-xs">
            {tingkatList.map((t) => (
              <option key={t} value={t}>Kelas {t}</option>
            ))}
          </select>
          <button type="submit" className="text-xs font-semibold text-primary-deep">Tampilkan</button>
        </form>
      </div>
      <div className="bg-paper border border-rule rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-3 py-2 font-bold w-10">#</th>
              <th className="text-left px-3 py-2 font-bold">Nama</th>
              <th className="text-left px-3 py-2 font-bold">Kelas</th>
              <th className="text-left px-3 py-2 font-bold">Rata-rata</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.siswa.id} className="border-t border-rule">
                <td className="px-3 py-2 tabnum text-ink-soft">{(halamanAman - 1) * 10 + i + 1}</td>
                <td className="px-3 py-2 font-semibold">
                  <a href={`/guru/performa/${d.siswa.id}`} className="hover:underline text-primary-deep">{d.siswa.nama}</a>
                </td>
                <td className="px-3 py-2">{d.siswa.kelas.nama}</td>
                <td className="px-3 py-2 tabnum">{d.rata ?? "—"}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-ink-soft text-xs">Belum ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalHalaman > 1 && (
        <div className="flex items-center justify-between mt-2 text-xs text-ink-soft">
          <span>Halaman {halamanAman} / {totalHalaman}</span>
          <div className="flex gap-1.5">
            <a href={`?tingkat=${tingkatAktif}&halaman=${Math.max(1, halamanAman - 1)}`} className={"px-2 py-1 rounded border border-rule " + (halamanAman <= 1 ? "pointer-events-none opacity-40" : "hover:bg-paper-raised")}>← Sebelumnya</a>
            <a href={`?tingkat=${tingkatAktif}&halaman=${Math.min(totalHalaman, halamanAman + 1)}`} className={"px-2 py-1 rounded border border-rule " + (halamanAman >= totalHalaman ? "pointer-events-none opacity-40" : "hover:bg-paper-raised")}>Berikutnya →</a>
          </div>
        </div>
      )}
    </div>
  );
}

async function HasilPencarian({ guruPenggunaId, q }: { guruPenggunaId: string; q: string }) {
  const hasil = await cariMuridDiampuGuru(guruPenggunaId, q);
  return (
    <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
            <th className="text-left px-4 py-2.5 font-bold">Nama</th>
            <th className="text-left px-4 py-2.5 font-bold">Kelas</th>
            <th className="text-left px-4 py-2.5 font-bold"></th>
          </tr>
        </thead>
        <tbody>
          {hasil.map((s) => (
            <tr key={s.id} className="border-t border-rule hover:bg-paper">
              <td className="px-4 py-2.5 font-semibold">{s.nama}</td>
              <td className="px-4 py-2.5">{s.kelasNama}</td>
              <td className="px-4 py-2.5">
                <a href={`/guru/performa/${s.id}`} className="text-xs font-semibold text-primary-deep hover:underline">Lihat performa</a>
              </td>
            </tr>
          ))}
          {hasil.length === 0 && (
            <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-soft text-xs">Tidak ada murid yang cocok.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
