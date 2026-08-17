import { getSession } from "@/lib/auth";
import { getDanaAlokasi } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_ORTU, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { formatRupiah } from "@/lib/utils";

export default async function TransparansiDanaOrtuPage() {
  const session = await getSession();
  if (!session) return null;

  const { data, total } = await getDanaAlokasi(session.sekolahId);

  return (
    <AppShell
      groups={NAV_ORTU}
      activeHref="/ortu/dana"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ke Mana SPP Dipakai"
      pageSubtitle="Bukan cuma status bayar — ini rincian pemakaian dana sekolah"
    >
      {data.length === 0 ? (
        <Callout>Rincian pemakaian dana periode ini belum tersedia dari sekolah.</Callout>
      ) : (
        <>
          <div className="bg-paper-raised border border-rule rounded-xl p-5 mb-5">
            <div className="text-xs text-ink-soft mb-1">Total dana terkumpul semester ini</div>
            <div className="font-serif text-3xl text-primary-deep tabnum">{formatRupiah(total)}</div>
          </div>
          <div className="flex flex-col gap-3">
            {data.map((d) => {
              const persen = total > 0 ? Math.round((d.nominal / total) * 100) : 0;
              return (
                <div key={d.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{d.kategori}</span>
                    <b className="tabnum">{persen}%</b>
                  </div>
                  <div className="h-2 bg-paper-sunken rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${persen}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-ink-soft text-center mt-5">Diperbarui sekolah tiap periode · {data[0]?.periode}</p>
        </>
      )}
    </AppShell>
  );
}
