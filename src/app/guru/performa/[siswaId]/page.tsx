import { getSession } from "@/lib/auth";
import { getPerformaSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { PerformaSiswaView } from "@/components/PerformaSiswaView";

export default async function PerformaMuridGuruPage({ params }: { params: Promise<{ siswaId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { siswaId } = await params;

  const performa = await getPerformaSiswa(siswaId);
  if (!performa) return null;

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/performa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Performa Murid"
      pageSubtitle="Halaman ini juga bisa diakses orang tua siswa (versi sama, sumber kebenaran tunggal)"
    >
      <PerformaSiswaView performa={performa} />
    </AppShell>
  );
}
