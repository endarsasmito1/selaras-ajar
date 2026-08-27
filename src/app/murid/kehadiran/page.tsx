import { getSession } from "@/lib/auth";
import { getSiswaByAkun } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { RiwayatKehadiranSiswa } from "@/components/RiwayatKehadiranSiswa";

export default async function KehadiranSayaPage() {
  const session = await getSession();
  if (!session) return null;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/performa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Riwayat Kehadiran"
      pageSubtitle="Semua catatan kehadiranmu"
    >
      <RiwayatKehadiranSiswa kelasId={siswa.kelasId} siswaId={siswa.id} />
    </AppShell>
  );
}
