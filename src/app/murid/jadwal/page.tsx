import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getJadwalKelas, getTahunAjaranAktif } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { PrintButton } from "@/components/ui/PrintButton";

const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default async function JadwalMuridPage() {
  const session = await getSession();
  if (!session) return null;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;
  const tahunAktif = await getTahunAjaranAktif(session.sekolahId);

  const entries = tahunAktif ? await getJadwalKelas(siswa.kelasId, tahunAktif.id) : [];
  const today = new Date();
  const hariIni = today.getDay() === 0 ? 7 : today.getDay();

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/jadwal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Jadwal Kelas ${siswa.kelas.nama}`}
      pageSubtitle="JP-4"
      headerAction={<PrintButton />}
    >
      {entries.length === 0 && <Callout tone="warn">Jadwal belum disusun sekolah.</Callout>}
      <div className="grid md:grid-cols-2 gap-4">
        {HARI.slice(1).map((h, i) => {
          const hari = i + 1;
          const sesiHari = entries.filter((e) => e.hari === hari).sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
          if (sesiHari.length === 0) return null;
          return (
            <div key={hari} className="bg-paper-raised border border-rule rounded-xl p-4">
              <h3 className={"text-sm font-semibold mb-2" + (hari === hariIni ? " text-primary-deep" : "")}>
                {h}{hari === hariIni && " · Hari ini"}
              </h3>
              <div className="flex flex-col gap-1.5">
                {sesiHari.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-1.5">
                    <span>{e.mapel.nama}</span>
                    <span className="text-xs text-ink-soft tabnum">{e.jamMulai}–{e.jamSelesai}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
