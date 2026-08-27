import { getSession } from "@/lib/auth";
import { getSemuaKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";

export default async function JadwalKelasListPage() {
  const session = await getSession();
  if (!session) return null;

  const kelasList = await getSemuaKelas(session.sekolahId);

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/jadwal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Jadwal Pelajaran"
      pageSubtitle="JP-2/JP-3 — jam bebas per sesi (1.6), bebas bentrok otomatis"
    >
      <div className="grid md:grid-cols-3 gap-3.5">
        {kelasList.map((k) => (
          <a key={k.id} href={`/kepsek/jadwal/${k.id}`}>
            <Card className="hover:border-primary">
              <h3 className="text-base font-semibold">Kelas {k.nama}</h3>
              <p className="text-xs text-ink-soft mt-1">Susun jadwal mingguan</p>
            </Card>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
