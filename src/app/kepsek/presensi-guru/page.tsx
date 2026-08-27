import { getSession } from "@/lib/auth";
import { getSesiBelumTerisiHariIni, getDaftarGuru, getRekapPresensiGuru, getTahunAjaranAktif } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";

export default async function PresensiGuruPage() {
  const session = await getSession();
  if (!session) return null;

  const [sesiBelumTerisi, guruList, tahunAktif] = await Promise.all([
    getSesiBelumTerisiHariIni(session.sekolahId),
    getDaftarGuru(session.sekolahId),
    getTahunAjaranAktif(session.sekolahId),
  ]);

  const rekapGuru = tahunAktif
    ? await Promise.all(
        guruList
          .filter((g) => g.guruProfil)
          .map(async (g) => ({ guru: g, rekap: await getRekapPresensiGuru(g.guruProfil!.id, tahunAktif.id) }))
      )
    : [];

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/presensi-guru"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Presensi Guru Mengajar"
      pageSubtitle="AG-3/AG-4 — kehadiran mengajar sesuai jadwal"
    >
      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-3">Sesi hari ini yang belum terisi</h3>
        {sesiBelumTerisi.length === 0 ? (
          <Callout>Semua sesi hari ini sudah tercatat.</Callout>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sesiBelumTerisi.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-1.5">
                <span>{e.mapel.nama} — {e.kelas.nama} · {e.guru.pengguna.nama}</span>
                <span className="text-xs text-ink-soft tabnum">{e.jamMulai}–{e.jamSelesai}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Rekap kehadiran mengajar — {tahunAktif?.label}</h3>
        <div className="bg-paper border border-rule rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2 font-bold">Guru</th>
                <th className="text-left px-4 py-2 font-bold">Sesi terjadwal</th>
                <th className="text-left px-4 py-2 font-bold">Sesi diajar</th>
                <th className="text-left px-4 py-2 font-bold">%</th>
              </tr>
            </thead>
            <tbody>
              {rekapGuru.map(({ guru, rekap }) => {
                const persen = rekap.totalSesiTerjadwal > 0 ? Math.round((rekap.totalHadir / rekap.totalSesiTerjadwal) * 100) : null;
                return (
                  <tr key={guru.id} className="border-t border-rule">
                    <td className="px-4 py-2 font-semibold">{guru.nama}</td>
                    <td className="px-4 py-2 tabnum">{rekap.totalSesiTerjadwal}</td>
                    <td className="px-4 py-2 tabnum">{rekap.totalHadir}</td>
                    <td className="px-4 py-2">
                      {persen !== null ? <Pill tone={persen >= 90 ? "ok" : persen >= 75 ? "warn" : "danger"}>{persen}%</Pill> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
