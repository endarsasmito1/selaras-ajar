import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getPerformaSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { PerformaSiswaView } from "@/components/PerformaSiswaView";

export default async function PerformaSayaPage() {
  const session = await getSession();
  if (!session) return null;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;
  const performa = await getPerformaSiswa(siswa.id);
  if (!performa) return null;

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/performa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Performa Saya"
      pageSubtitle="Progress belajarmu sejauh ini"
    >
      <PerformaSiswaView
        performa={performa}
        ringkas
        hrefKehadiran="/murid/kehadiran"
        hrefTugas="/murid/tugas"
        hrefUjianList="/murid/ujian"
      />
    </AppShell>
  );
}
