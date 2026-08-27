import { getSession } from "@/lib/auth";
import { getProfilSiswa360 } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { RiwayatKehadiranSiswa } from "@/components/RiwayatKehadiranSiswa";
import { notFound } from "next/navigation";

export default async function RiwayatKehadiranKepsekPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const profil = await getProfilSiswa360(id, session.sekolahId);
  if (!profil) notFound();

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/siswa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Riwayat Kehadiran — ${profil.siswa.nama}`}
    >
      <a href={`/kepsek/siswa/${id}`} className="text-xs font-semibold text-primary-deep hover:underline mb-4 inline-block">
        ← Profil {profil.siswa.nama}
      </a>
      <RiwayatKehadiranSiswa kelasId={profil.siswa.kelasId} siswaId={id} />
    </AppShell>
  );
}
