import { getSession } from "@/lib/auth";
import { getSemuaKurikulum } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { MapelRows } from "./MapelRows";

const JENJANG_LIST = ["SD", "SMP", "SMA", "SMK"];

export default async function SuperadminKurikulumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; kurikulum_dibuat?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const kurikulumList = await getSemuaKurikulum();

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/kurikulum"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kurikulum"
      pageSubtitle="Dikelola superadmin — muncul sbg pilihan dropdown di Master Data tiap sekolah, isinya tetap bisa di-custom sekolah masing-masing"
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.kurikulum_dibuat && <div className="mb-4"><Callout>✓ Kurikulum &quot;{sp.kurikulum_dibuat}&quot; ditambahkan.</Callout></div>}

      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Tambah kurikulum baru</summary>
        <form action="/api/superadmin/kurikulum" method="POST" className="mt-4 flex flex-col gap-3 max-w-md">
          <input name="nama" required placeholder="mis. Kurikulum 2013" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <select name="jenjang" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
            {JENJANG_LIST.map((j) => (<option key={j} value={j}>{j}</option>))}
          </select>
          <MapelRows />
          <Button type="submit" size="sm" className="self-start">Tambah kurikulum</Button>
        </form>
      </details>

      <div className="grid md:grid-cols-2 gap-4">
        {kurikulumList.map((k) => (
          <a key={k.id} href={`/superadmin/kurikulum/${k.id}`}>
            <Card className="hover:border-primary">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold">{k.nama}</h3>
                <span className="text-xs bg-primary-tint text-primary-deep px-2.5 py-1 rounded-full font-semibold">{k.jenjang}</span>
              </div>
              <p className="text-xs text-ink-soft">{k.mapel.length} mapel · dipakai {k.sekolahMemakai.length} sekolah</p>
            </Card>
          </a>
        ))}
        {kurikulumList.length === 0 && <p className="text-sm text-ink-soft">Belum ada kurikulum ditambahkan.</p>}
      </div>
    </AppShell>
  );
}
