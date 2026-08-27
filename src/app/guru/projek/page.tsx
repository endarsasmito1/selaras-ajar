import { getSession } from "@/lib/auth";
import { getProjekList } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { LinkButton } from "@/components/ui/Button";
import { formatTanggal } from "@/lib/utils";

export default async function ProjekListPage() {
  const session = await getSession();
  if (!session) return null;

  const projekList = await getProjekList(session.sekolahId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/projek"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Projek Profil Pelajar Pancasila"
      pageSubtitle="N-6 — khusus sekolah yang pakai Kurikulum Merdeka"
      headerAction={<LinkButton href="/guru/projek/baru" size="sm">+ Buat Projek</LinkButton>}
    >
      <div className="flex flex-col gap-2.5">
        {projekList.length === 0 && <p className="text-sm text-ink-soft">Belum ada projek dibuat.</p>}
        {projekList.map((p) => {
          const dimensi: string[] = JSON.parse(p.dimensiP5);
          return (
            <a key={p.id} href={`/guru/projek/${p.id}`} className="block bg-paper-raised border border-rule rounded-xl px-5 py-4 hover:border-primary">
              <div className="font-semibold text-sm">{p.tema}</div>
              <div className="text-xs text-ink-soft mt-0.5">Dibuat {p.dibuatOleh.nama} · {formatTanggal(p.createdAt)}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {dimensi.map((d) => (
                  <span key={d} className="text-[11px] bg-primary-tint text-primary-deep px-2 py-0.5 rounded-full font-semibold">{d}</span>
                ))}
              </div>
            </a>
          );
        })}
      </div>
    </AppShell>
  );
}
