import { getSession } from "@/lib/auth";
import { getKelasDiampu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export default async function GuruDashboard() {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Selamat datang, ${session.nama}`}
      pageSubtitle={`Mengampu ${kelasUnik.length} kelas`}
    >
      <div className="grid md:grid-cols-2 gap-4">
        {penugasan.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[15px]">
                  {p.mapel.nama} — Kelas {p.kelas.nama}
                </h3>
                <p className="text-xs text-ink-soft mt-1">KKM {p.mapel.kkm}</p>
              </div>
              <div className="flex gap-2">
                <LinkButton href="/guru/absensi" variant="ghost" size="sm">
                  Absensi
                </LinkButton>
                <LinkButton href="/guru/nilai" variant="ghost" size="sm">
                  Nilai
                </LinkButton>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
