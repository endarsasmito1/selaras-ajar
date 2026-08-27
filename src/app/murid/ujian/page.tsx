import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getUjianAktifUntukMurid } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { DaftarUjianMuridClient } from "./DaftarUjianMuridClient";

export default async function DaftarUjianMuridPage() {
  const session = await getSession();
  if (!session) return null;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const daftar = await getUjianAktifUntukMurid(siswa.kelasId, siswa.id);

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ujian & Latihan"
      pageSubtitle="Kerjakan sesuai jadwal yang ditentukan guru"
    >
      <DaftarUjianMuridClient daftar={daftar} now={new Date()} />
    </AppShell>
  );
}
