import { getSession } from "@/lib/auth";
import { getDetailTahunAjaran } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Card, CardHead, StatCard } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function DetailTahunAjaranPage({ params }: { params: Promise<{ tahunAjaranId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { tahunAjaranId } = await params;

  const data = await getDetailTahunAjaran(tahunAjaranId, session.sekolahId);
  if (!data) notFound();
  const { tahunAjaran, kelasList, guruList, persenHadir, totalAbsensi } = data;

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/tahun-ajaran"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${tahunAjaran.label} — ${tahunAjaran.semester}`}
      pageSubtitle={`${formatTanggal(tahunAjaran.mulai)} – ${formatTanggal(tahunAjaran.selesai)}${tahunAjaran.aktif ? " · Aktif" : ""}`}
      headerAction={<LinkButton href="/kepsek/tahun-ajaran" variant="ghost" size="sm">← Semua Tahun Ajaran</LinkButton>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Kelas" value={String(kelasList.length)} />
        <StatCard label="Siswa" value={String(kelasList.reduce((s, k) => s + k._count.siswa, 0))} />
        <StatCard label="Guru mengajar" value={String(guruList.length)} />
        <StatCard label="Kehadiran keseluruhan" value={persenHadir !== null ? `${persenHadir}%` : "—"} tone="good" sub={`${totalAbsensi} data`} />
      </div>

      <Card className="mb-6">
        <CardHead title="Kelas & wali kelas" subtitle="Klik nama kelas untuk lihat performa & nilai per mapel" />
        <div className="bg-paper border border-rule rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-3 py-2 font-bold">Kelas</th>
                <th className="text-left px-3 py-2 font-bold">Wali kelas</th>
                <th className="text-left px-3 py-2 font-bold">Jumlah siswa</th>
                <th className="text-left px-3 py-2 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {kelasList.map((k) => (
                <tr key={k.id} className="border-t border-rule">
                  <td className="px-3 py-2 font-semibold">{k.nama}</td>
                  <td className="px-3 py-2">{k.waliKelas?.nama ?? "—"}</td>
                  <td className="px-3 py-2 tabnum">{k._count.siswa}</td>
                  <td className="px-3 py-2">
                    <a href={`/kepsek/siswa/kelas/${k.id}`} className="text-xs font-semibold text-primary-deep hover:underline">
                      Performa & nilai →
                    </a>
                  </td>
                </tr>
              ))}
              {kelasList.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-ink-soft text-xs">Belum ada kelas di tahun ajaran ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHead title="Guru pengampu" subtitle="Semua guru yang mengajar pada tahun ajaran ini, lintas kelas & mapel" />
        {guruList.length === 0 ? (
          <p className="text-sm text-ink-soft">Belum ada penugasan guru tercatat.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {guruList.map((g) => (
              <div key={g.nama} className="text-sm border-b border-rule last:border-0 py-2">
                <span className="font-semibold">{g.nama}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {g.mapelKelas.map((mk) => (
                    <Pill key={mk} tone="neutral">{mk}</Pill>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHead title="Riwayat pembayaran" subtitle="Semua tagihan (SPP & non-SPP) yang tercatat pada tahun ajaran ini" />
        <LinkButton href={`/keuangan/riwayat?tahunAjaranId=${tahunAjaranId}`} variant="ghost" size="sm">
          Lihat riwayat pembayaran →
        </LinkButton>
      </Card>
    </AppShell>
  );
}
