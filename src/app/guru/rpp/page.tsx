import { getSession } from "@/lib/auth";
import { getRPPByGuru } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { LinkButton } from "@/components/ui/Button";
import { formatTanggal } from "@/lib/utils";

export default async function RPPListPage() {
  const session = await getSession();
  if (!session) return null;

  const rppList = await getRPPByGuru(session.userId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/rpp"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="RPP & Capaian Pembelajaran"
      pageSubtitle={`${rppList.length} RPP tersimpan (§4.16)`}
      headerAction={
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/guru/rpp/capaian" variant="ghost" size="sm">Bank CP/TP</LinkButton>
          <LinkButton href="/guru/rpp/baru" size="sm">+ Buat RPP</LinkButton>
        </div>
      }
    >
      <div className="flex flex-col gap-2.5">
        {rppList.length === 0 && <p className="text-sm text-ink-soft">Belum ada RPP dibuat.</p>}
        {rppList.map((r) => (
          <a key={r.id} href={`/guru/rpp/${r.id}/edit`} className="block bg-paper-raised border border-rule rounded-xl px-5 py-4 hover:border-primary">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-semibold text-sm">{r.judul}</div>
                <div className="text-xs text-ink-soft mt-0.5">{r.mapel.nama} · {r.kelas.nama} · {formatTanggal(r.createdAt)}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.capaianTerkait.map((c) => (
                  <span key={c.id} className="text-[11px] bg-primary-tint text-primary-deep px-2 py-0.5 rounded-full font-semibold">
                    {c.capaian.kode ?? c.capaian.deskripsi.slice(0, 20)}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
