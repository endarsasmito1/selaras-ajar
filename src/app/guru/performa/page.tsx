import { getSession } from "@/lib/auth";
import { getKelasDiampu, getSiswaKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";

export default async function PilihPerformaPage() {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());
  const siswaPerKelas = await Promise.all(kelasUnik.map((k) => getSiswaKelas(k.id)));

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/performa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Performa Murid"
      pageSubtitle="Pilih siswa untuk lihat progress lengkap"
    >
      {kelasUnik.map((k, i) => (
        <div key={k.id} className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Kelas {k.nama}</h3>
          <div className="grid md:grid-cols-3 gap-2">
            {siswaPerKelas[i].map((s) => (
              <a key={s.id} href={`/guru/performa/${s.id}`} className="bg-paper-raised border border-rule rounded-lg px-4 py-3 text-sm hover:border-primary">
                {s.nama}
              </a>
            ))}
          </div>
        </div>
      ))}
    </AppShell>
  );
}
