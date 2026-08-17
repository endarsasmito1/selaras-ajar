import { getSession } from "@/lib/auth";
import { getDaftarGuru } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";

export default async function DataGuruPage() {
  const session = await getSession();
  if (!session) return null;

  const guru = await getDaftarGuru(session.sekolahId);

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/guru"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Data Guru"
      pageSubtitle={`${guru.length} guru & staf`}
    >
      <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Nama</th>
              <th className="text-left px-4 py-2.5 font-bold">NIP</th>
              <th className="text-left px-4 py-2.5 font-bold">Mapel utama</th>
              <th className="text-left px-4 py-2.5 font-bold">Penugasan kelas</th>
              <th className="text-left px-4 py-2.5 font-bold">Peran</th>
            </tr>
          </thead>
          <tbody>
            {guru.map((g) => (
              <tr key={g.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 font-semibold">{g.nama}</td>
                <td className="px-4 py-2.5 tabnum text-ink-soft">{g.guruProfil?.nip ?? "—"}</td>
                <td className="px-4 py-2.5">{g.guruProfil?.mapelUtama ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {g.guruProfil?.penugasan.length ? (
                      g.guruProfil.penugasan.map((p) => (
                        <span
                          key={p.id}
                          className="text-[11px] bg-primary-tint text-primary-deep px-2 py-0.5 rounded-full font-semibold"
                        >
                          {p.kelas.nama} · {p.mapel.nama}
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-soft text-xs">Belum ditugaskan</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {g.waliKelasDi.length > 0 ? (
                    <Pill tone="info">Wali {g.waliKelasDi[0].nama}</Pill>
                  ) : (
                    <Pill tone="neutral">Guru mapel</Pill>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
