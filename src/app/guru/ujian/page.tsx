import { getSession } from "@/lib/auth";
import { getUjianKelasCards, getEsaiPerluDinilai, getUjianByGuru } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Card, StatCard } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SemuaUjianTable } from "./SemuaUjianTable";

export default async function KelolaUjianPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ujian_diterbitkan?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;
  const tab = sp.tab === "semua" ? "semua" : "kelas";

  const [kelasCards, esaiPerlu] = await Promise.all([
    getUjianKelasCards(session.userId),
    getEsaiPerluDinilai(session.userId),
  ]);

  const totalDraft = kelasCards.reduce((s, c) => s + c.draft, 0);
  const totalBerlangsung = kelasCards.reduce((s, c) => s + c.berlangsung, 0);
  const totalSelesai = kelasCards.reduce((s, c) => s + c.selesai, 0);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ujian & Latihan"
      pageSubtitle="Pilih kelas untuk lihat daftar ujiannya (1.6), atau lihat semua ujianmu lintas kelas"
      headerAction={<LinkButton href="/guru/ujian/baru" size="sm">+ Buat ujian baru</LinkButton>}
    >
      {sp.ujian_diterbitkan && (
        <div className="mb-4">
          <Callout>✓ Ujian berhasil diterbitkan — sudah tampil ke murid sesuai jadwal.</Callout>
        </div>
      )}
      {esaiPerlu.length > 0 && (
        <div className="mb-4">
          <Callout tone="warn">
            ⚠ Ada <b>{esaiPerlu.length} jawaban esai</b> yang perlu dinilai manual. Buka detail ujian terkait untuk menilai.
          </Callout>
        </div>
      )}

      <h3 className="text-[11px] uppercase tracking-wider text-ink-soft font-bold mb-2.5">Ringkasan seluruh kelas</h3>
      <div className="grid grid-cols-3 gap-3.5 mb-6 pb-6 border-b border-rule">
        <StatCard label="Draft" value={String(totalDraft)} />
        <StatCard label="Sedang berlangsung" value={String(totalBerlangsung)} tone="good" />
        <StatCard label="Selesai" value={String(totalSelesai)} />
      </div>

      <div className="flex gap-1 mb-5 border-b border-rule">
        <a href="?tab=kelas" className={"text-sm px-3 py-2 font-semibold " + (tab === "kelas" ? "border-b-2 border-primary text-primary-deep" : "text-ink-soft")}>
          Per Kelas
        </a>
        <a href="?tab=semua" className={"text-sm px-3 py-2 font-semibold " + (tab === "semua" ? "border-b-2 border-primary text-primary-deep" : "text-ink-soft")}>
          Semua Ujian
        </a>
      </div>

      {tab === "semua" ? (
        <SemuaUjianList guruId={session.userId} />
      ) : (
        <div className="grid md:grid-cols-3 gap-3.5">
          {kelasCards.map(({ kelas, count, draft, berlangsung, selesai }) => (
            <a key={kelas.id} href={`/guru/ujian/kelas/${kelas.id}`}>
              <Card className="hover:border-primary !p-0 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-semibold">Kelas {kelas.nama}</h3>
                    <Pill tone="info">{count} ujian</Pill>
                  </div>
                  <p className="text-xs text-ink-soft">Lihat daftar & hasil ujian kelas ini</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-rule border-t border-rule bg-paper-sunken">
                  <div className="px-3 py-2.5 text-center">
                    <div className="font-serif text-lg tabnum">{draft}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Draft</div>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <div className="font-serif text-lg tabnum text-success">{berlangsung}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Berlangsung</div>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <div className="font-serif text-lg tabnum">{selesai}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Selesai</div>
                  </div>
                </div>
              </Card>
            </a>
          ))}
          {kelasCards.length === 0 && <p className="text-sm text-ink-soft">Belum ada kelas yang diampu.</p>}
        </div>
      )}
    </AppShell>
  );
}

async function SemuaUjianList({ guruId }: { guruId: string }) {
  const ujianList = await getUjianByGuru(guruId);
  return <SemuaUjianTable ujianList={ujianList} />;
}
