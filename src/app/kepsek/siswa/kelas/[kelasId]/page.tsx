import { getSession } from "@/lib/auth";
import { getPerformaKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Card, StatCard } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { notFound } from "next/navigation";

export default async function PerformaKelasPage({ params }: { params: Promise<{ kelasId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { kelasId } = await params;

  const data = await getPerformaKelas(kelasId, session.sekolahId);
  if (!data) notFound();
  const { kelas, jumlahSiswa, rataPerMapel, persenHadirKelas, siswaIndikator } = data;

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/siswa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Kelas ${kelas.nama}`}
      pageSubtitle="Performa kelas (D-4) — sebelum drill-down ke performa per siswa"
      headerAction={<LinkButton href={`/kepsek/siswa/kelas/${kelasId}/buku-induk`} variant="ghost" size="sm">Cetak Buku Induk Kelas</LinkButton>}
    >
      <a href="/kepsek/siswa" className="text-xs font-semibold text-primary-deep hover:underline mb-4 inline-block">← Semua kelas</a>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-6">
        <StatCard label="Jumlah siswa" value={String(jumlahSiswa)} />
        <StatCard label="Kehadiran kelas" value={persenHadirKelas !== null ? `${persenHadirKelas}%` : "—"} tone="good" />
        <StatCard label="Butuh perhatian" value={String(siswaIndikator.filter((s) => s.butuhPerhatian).length)} tone={siswaIndikator.some((s) => s.butuhPerhatian) ? "warn" : "default"} />
      </div>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-3">Rata-rata nilai per mata pelajaran</h3>
        {rataPerMapel.length === 0 && <p className="text-xs text-ink-soft">Belum ada data nilai.</p>}
        <div className="flex flex-col gap-2">
          {rataPerMapel.map((m) => (
            <div key={m.nama} className="flex items-center gap-3">
              <span className="w-36 text-sm">{m.nama}</span>
              <span className="font-serif text-lg tabnum w-10">{m.rata}</span>
              <div className="flex-1 h-2 bg-paper-sunken rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, m.rata)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Nama</th>
              <th className="text-left px-4 py-2.5 font-bold">Rata-rata</th>
              <th className="text-left px-4 py-2.5 font-bold">Kehadiran</th>
              <th className="text-left px-4 py-2.5 font-bold">Predikat</th>
              <th className="text-left px-4 py-2.5 font-bold">Indikator</th>
            </tr>
          </thead>
          <tbody>
            {siswaIndikator.map(({ siswa, rata, persenHadirSiswa, predikat, butuhPerhatian }) => (
              <tr key={siswa.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 font-semibold">
                  <a href={`/kepsek/siswa/${siswa.id}`} className="text-primary-deep hover:underline">{siswa.nama}</a>
                </td>
                <td className="px-4 py-2.5 tabnum">{rata !== null ? Math.round(rata * 10) / 10 : "—"}</td>
                <td className="px-4 py-2.5 tabnum">{persenHadirSiswa !== null ? `${persenHadirSiswa}%` : "—"}</td>
                <td className="px-4 py-2.5">{predikat}</td>
                <td className="px-4 py-2.5">
                  <Pill tone={butuhPerhatian ? "warn" : "ok"}>{butuhPerhatian ? "Perlu perhatian" : "Baik"}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
