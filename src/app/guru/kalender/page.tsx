import { getSession } from "@/lib/auth";
import { getAgendaAkademik } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { KalenderView } from "@/components/KalenderView";

export default async function KalenderGuruPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const agenda = await getAgendaAkademik(session.sekolahId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/kalender"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kalender Akademik"
      pageSubtitle="Hari libur, ujian, dan kegiatan sekolah (F-7)"
    >
      <KalenderView agenda={agenda} bulanParam={sp.bulan} kelola={false} />
    </AppShell>
  );
}
