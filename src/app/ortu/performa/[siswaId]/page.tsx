import { getSession } from "@/lib/auth";
import { getPerformaSiswa, getAnakDariOrtu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_ORTU, ROLE_LABEL } from "@/lib/nav";
import { PerformaSiswaView } from "@/components/PerformaSiswaView";
import { Callout } from "@/components/ui/Callout";

export default async function PerformaMuridOrtuPage({ params }: { params: Promise<{ siswaId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { siswaId } = await params;

  const anakList = await getAnakDariOrtu(session.userId);
  const berhak = anakList.some((a) => a.id === siswaId);
  if (!berhak) {
    return (
      <AppShell groups={NAV_ORTU} activeHref="/ortu" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Performa Anak">
        <Callout tone="warn">Data ini bukan milik anak Anda.</Callout>
      </AppShell>
    );
  }

  const performa = await getPerformaSiswa(siswaId);
  if (!performa) return null;

  return (
    <AppShell
      groups={NAV_ORTU}
      activeHref="/ortu"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Performa Anak"
      pageSubtitle="Versi ringkas — sama sumber datanya dengan yang dilihat guru"
    >
      <PerformaSiswaView performa={performa} ringkas />
    </AppShell>
  );
}
