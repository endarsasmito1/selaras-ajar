import { getSession } from "@/lib/auth";
import { getKurikulumDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { notFound } from "next/navigation";

export default async function KurikulumDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;

  const kurikulum = await getKurikulumDetail(id);
  if (!kurikulum) notFound();

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/kurikulum"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={kurikulum.nama}
      pageSubtitle={`Jenjang ${kurikulum.jenjang} · dibuat oleh ${kurikulum.dibuatOleh.nama}`}
      headerAction={<LinkButton href="/superadmin/kurikulum" variant="ghost" size="sm">← Semua kurikulum</LinkButton>}
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}

      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Mata Pelajaran</th>
              <th className="text-left px-4 py-2.5 font-bold">KKM default</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {kurikulum.mapel.map((m) => (
              <tr key={m.id} className="border-t border-rule">
                <td className="px-4 py-2.5 font-semibold">{m.nama}</td>
                <td className="px-4 py-2.5 tabnum">{m.kkm}</td>
                <td className="px-4 py-2.5">
                  <form action="/api/superadmin/kurikulum-mapel/hapus" method="POST">
                    <input type="hidden" name="kurikulumMapelId" value={m.id} />
                    <input type="hidden" name="kurikulumId" value={kurikulum.id} />
                    <ConfirmSubmitLink confirmMessage={`Hapus mapel "${m.nama}" dari kurikulum ini?`} className="text-xs text-danger hover:underline">Hapus</ConfirmSubmitLink>
                  </form>
                </td>
              </tr>
            ))}
            {kurikulum.mapel.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-soft text-xs">Belum ada mapel di kurikulum ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl p-5 max-w-md">
        <h3 className="text-sm font-semibold mb-3">+ Tambah mapel ke kurikulum</h3>
        <form action="/api/superadmin/kurikulum-mapel" method="POST" className="flex flex-col gap-2.5">
          <input type="hidden" name="kurikulumId" value={kurikulum.id} />
          <input name="nama" required placeholder="mis. Bahasa Inggris" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <input type="number" name="kkm" defaultValue={70} min={0} max={100} placeholder="KKM default" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <Button type="submit" size="sm" className="self-start">Tambah mapel</Button>
        </form>
      </div>
    </AppShell>
  );
}
