import { getSession } from "@/lib/auth";
import { getPerformaSiswa, getKelasDiampu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { RiwayatKehadiranSiswa } from "@/components/RiwayatKehadiranSiswa";
import { Callout } from "@/components/ui/Callout";
import { notFound } from "next/navigation";

export default async function RiwayatKehadiranGuruPage({ params }: { params: Promise<{ siswaId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { siswaId } = await params;

  const performa = await getPerformaSiswa(siswaId, session.sekolahId);
  if (!performa) notFound();

  const penugasan = await getKelasDiampu(session.userId);
  const mengajarMuridIni = penugasan.some((p) => p.kelasId === performa.siswa.kelasId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/performa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Riwayat Kehadiran — ${performa.siswa.nama}`}
    >
      {mengajarMuridIni ? (
        <RiwayatKehadiranSiswa kelasId={performa.siswa.kelasId} siswaId={siswaId} />
      ) : (
        <Callout tone="warn">Anda tidak mengajar murid ini.</Callout>
      )}
    </AppShell>
  );
}
