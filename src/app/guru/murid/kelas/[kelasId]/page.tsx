import { getSession } from "@/lib/auth";
import { getSiswaKelasDenganRanking } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { LinkButton } from "@/components/ui/Button";
import { notFound } from "next/navigation";

export default async function MuridKelasListPage({ params }: { params: Promise<{ kelasId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { kelasId } = await params;

  const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } });
  if (!kelas) notFound();

  const ranking = await getSiswaKelasDenganRanking(kelasId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/murid"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Murid — Kelas ${kelas.nama}`}
      pageSubtitle={`${ranking.length} murid, diurutkan berdasarkan rata-rata nilai`}
      headerAction={<LinkButton href="/guru/murid" variant="ghost" size="sm">← Semua kelas</LinkButton>}
    >
      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold w-10">#</th>
              <th className="text-left px-4 py-2.5 font-bold">Nama</th>
              <th className="text-left px-4 py-2.5 font-bold">Rata-rata nilai</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((d, i) => (
              <tr key={d.siswa.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 tabnum text-ink-soft">{i + 1}</td>
                <td className="px-4 py-2.5 font-semibold">{d.siswa.nama}</td>
                <td className="px-4 py-2.5 tabnum">{d.rata ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <a href={`/guru/performa/${d.siswa.id}`} className="text-xs font-semibold text-primary-deep hover:underline">Lihat performa →</a>
                </td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-soft text-xs">Belum ada murid di kelas ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
