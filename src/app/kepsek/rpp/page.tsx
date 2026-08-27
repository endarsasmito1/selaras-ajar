import { getSession } from "@/lib/auth";
import { getKelengkapanRPP } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";

export default async function KelengkapanRPPPage() {
  const session = await getSession();
  if (!session) return null;

  const matrix = await getKelengkapanRPP(session.sekolahId);
  const belum = matrix.filter((m) => !m.adaRPP).length;

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/rpp"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kelengkapan RPP"
      pageSubtitle={`RPP-5 — ${belum} dari ${matrix.length} kombinasi guru×mapel×kelas belum punya RPP periode ini`}
    >
      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Guru</th>
              <th className="text-left px-4 py-2.5 font-bold">Mapel</th>
              <th className="text-left px-4 py-2.5 font-bold">Kelas</th>
              <th className="text-left px-4 py-2.5 font-bold">Status RPP</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((m, i) => (
              <tr key={i} className="border-t border-rule">
                <td className="px-4 py-2.5 font-semibold">{m.guru.nama}</td>
                <td className="px-4 py-2.5">{m.mapel.nama}</td>
                <td className="px-4 py-2.5">{m.kelas.nama}</td>
                <td className="px-4 py-2.5">
                  <Pill tone={m.adaRPP ? "ok" : "warn"}>{m.adaRPP ? "Ada" : "Belum"}</Pill>
                </td>
              </tr>
            ))}
            {matrix.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-soft text-xs">Belum ada penugasan guru.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
