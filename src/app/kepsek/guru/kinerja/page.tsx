import { getSession } from "@/lib/auth";
import { getDaftarGuru } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";

export default async function PilihKinerjaGuruPage() {
  const session = await getSession();
  if (!session) return null;

  const guru = await getDaftarGuru(session.sekolahId);

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/guru/kinerja"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kinerja Guru"
      pageSubtitle="Pilih guru untuk lihat laporan lengkap"
    >
      <div className="grid md:grid-cols-3 gap-2.5">
        {guru.map((g) => (
          <a key={g.id} href={`/kepsek/guru/kinerja/${g.id}`} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5 hover:border-primary">
            <div className="font-semibold text-sm">{g.nama}</div>
            <div className="text-xs text-ink-soft mt-0.5">{g.guruProfil?.mapelUtama ?? "-"}</div>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
