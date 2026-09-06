import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getJadwalKelas, getTahunAjaranAktif } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { PrintButton } from "@/components/ui/PrintButton";
import { WeekCalendar, type WeekEvent } from "@/components/ui/WeekCalendar";

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

  const weekEvents: WeekEvent[] = entries.map((e) => ({
    id: e.id,
    hari: e.hari,
    jamMulai: e.jamMulai,
    jamSelesai: e.jamSelesai,
    tone: "own",
    content: (
      <div title={`${e.mapel.nama} — ${e.guru.pengguna.nama}, ${e.jamMulai}–${e.jamSelesai}`}>
        <div className="tabnum">{e.jamMulai}</div>
        <div className="truncate">{e.mapel.nama}</div>
      </div>
    ),
  }));

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/jadwal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Jadwal Kelas ${siswa.kelas.nama}`}
      pageSubtitle="JP-4"
      headerAction={<PrintButton />}
      lebarPenuh
    >
      {entries.length === 0 && <Callout tone="warn">Jadwal belum disusun sekolah.</Callout>}
      <WeekCalendar hariList={HARI.slice(1)} hariAktif={hariIni} events={weekEvents} />
    </AppShell>
  );
}
