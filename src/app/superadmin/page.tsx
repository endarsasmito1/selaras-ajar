import { getSession } from "@/lib/auth";
import { getSuperadminOverview, getSemuaSekolahDenganStats } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { StatCard, Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SekolahMapCard } from "./SekolahMapCard";

export default async function SuperadminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [overview, sekolahList] = await Promise.all([
    getSuperadminOverview(),
    getSemuaSekolahDenganStats(),
  ]);

  return (
    <AppShell
      showBack={false}
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ringkasan Platform"
      pageSubtitle="Semua sekolah yang memakai Selaras Ajar"
      headerAction={<LinkButton href="/superadmin/sekolah/tambah" size="sm">+ Tambah Sekolah</LinkButton>}
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Total Sekolah" value={String(overview.totalSekolah)} />
        <StatCard label="Sekolah Aktif" value={String(overview.sekolahAktif)} tone="good" />
        <StatCard label="Total Pengguna" value={String(overview.totalPengguna)} />
        <StatCard label="Total Siswa Aktif" value={String(overview.totalSiswa)} />
      </div>

      <Card className="mb-6">
        <h3 className="text-sm font-semibold mb-3">Sebaran sekolah</h3>
        <SekolahMapCard
          titik={sekolahList
            .filter((s) => s.sekolah.latitude !== null && s.sekolah.longitude !== null)
            .map((s) => ({
              id: s.sekolah.id,
              nama: s.sekolah.nama,
              jenjang: s.sekolah.jenjang,
              kabupatenKota: s.sekolah.kabupatenKota,
              provinsi: s.sekolah.provinsi,
              latitude: s.sekolah.latitude as number,
              longitude: s.sekolah.longitude as number,
            }))}
        />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Sekolah terbaru</h3>
        <div className="bg-paper border border-rule rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2 font-bold">Sekolah</th>
                <th className="text-left px-4 py-2 font-bold">Jenjang</th>
                <th className="text-left px-4 py-2 font-bold">Siswa</th>
                <th className="text-left px-4 py-2 font-bold">Guru</th>
                <th className="text-left px-4 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {sekolahList.slice(0, 8).map(({ sekolah, siswa, guru }) => (
                <tr key={sekolah.id} className="border-t border-rule hover:bg-paper-sunken">
                  <td className="px-4 py-2 font-semibold">
                    <a href={`/superadmin/sekolah/${sekolah.id}`} className="hover:underline">{sekolah.nama}</a>
                  </td>
                  <td className="px-4 py-2">{sekolah.jenjang}</td>
                  <td className="px-4 py-2 tabnum">{siswa}</td>
                  <td className="px-4 py-2 tabnum">{guru}</td>
                  <td className="px-4 py-2">
                    <Pill tone={sekolah.aktif ? "ok" : "neutral"}>{sekolah.aktif ? "Aktif" : "Nonaktif"}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
