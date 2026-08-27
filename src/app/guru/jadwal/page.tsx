import { getSession } from "@/lib/auth";
import { getKelasDiampu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";

export default async function JadwalGuruListPage() {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/jadwal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Jadwal Mengajar"
      pageSubtitle="Pilih kelas untuk lihat/atur jadwal mingguanmu di kelas itu"
    >
      <div className="grid md:grid-cols-3 gap-3.5">
        {kelasUnik.map((k) => (
          <a key={k.id} href={`/guru/jadwal/${k.id}`}>
            <Card className="hover:border-primary">
              <h3 className="text-base font-semibold">Kelas {k.nama}</h3>
              <p className="text-xs text-ink-soft mt-1">Lihat & atur jadwal</p>
            </Card>
          </a>
        ))}
        {kelasUnik.length === 0 && <p className="text-sm text-ink-soft">Belum ada kelas yang diampu.</p>}
      </div>
    </AppShell>
  );
}
