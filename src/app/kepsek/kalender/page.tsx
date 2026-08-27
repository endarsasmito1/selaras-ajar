import { getSession } from "@/lib/auth";
import { getAgendaAkademik } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { KalenderView } from "@/components/KalenderView";

export default async function KalenderPage({
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
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/kalender"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kalender Akademik"
      pageSubtitle="Satu sumber kebenaran hari libur, ujian, dan kegiatan untuk semua peran (F-7)"
    >
      <KalenderView agenda={agenda} bulanParam={sp.bulan} kelola={session.peran === "KEPALA_SEKOLAH"} />
    </AppShell>
  );
}
