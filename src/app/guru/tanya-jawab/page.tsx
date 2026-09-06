import { getSession } from "@/lib/auth";
import { getKelasDiampu, getTanyaJawabKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { TanyaJawabPanel } from "@/components/TanyaJawabPanel";
import { tabClass } from "@/lib/tab-style";
import { Callout } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TanyaJawabGuruPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; mapel?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());
  const params = await searchParams;
  const kelasAktifId = params.kelas ?? kelasUnik[0]?.id;
  const kelasAktif = kelasUnik.find((k) => k.id === kelasAktifId) ?? kelasUnik[0];

  if (!kelasAktif) {
    return (
      <AppShell
        groups={NAV_GURU}
        activeHref="/guru/tanya-jawab"
        userName={session.nama}
        userRoleLabel={ROLE_LABEL[session.peran]}
        pageTitle="Tanya Jawab Kelas"
      >
        <Callout tone="warn">Belum ada kelas yang diampu.</Callout>
      </AppShell>
    );
  }

  const mapelUntukKelas = penugasan.filter((p) => p.kelas.id === kelasAktif.id);
  const mapelUnik = Array.from(new Map(mapelUntukKelas.map((p) => [p.mapel.id, p.mapel])).values());
  const mapelAktifId = params.mapel && mapelUnik.some((m) => m.id === params.mapel) ? params.mapel : mapelUnik[0]?.id;
  const mapelAktif = mapelUnik.find((m) => m.id === mapelAktifId);

  const pertanyaan = mapelAktif ? await getTanyaJawabKelas(kelasAktif.id, mapelAktif.id) : [];

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/tanya-jawab"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Tanya Jawab Kelas"
      pageSubtitle={`Kelas ${kelasAktif.nama}${mapelAktif ? ` · ${mapelAktif.nama}` : ""}`}
    >
      {kelasUnik.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-rule mb-3" role="tablist">
          {kelasUnik.map((k) => (
            <a key={k.id} href={`/guru/tanya-jawab?kelas=${k.id}`} role="tab" aria-selected={k.id === kelasAktif.id} className={tabClass(k.id === kelasAktif.id)}>
              Kelas {k.nama}
            </a>
          ))}
        </div>
      )}

      {mapelUnik.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-rule mb-5" role="tablist">
          {mapelUnik.map((m) => (
            <a key={m.id} href={`/guru/tanya-jawab?kelas=${kelasAktif.id}&mapel=${m.id}`} role="tab" aria-selected={m.id === mapelAktif?.id} className={tabClass(m.id === mapelAktif?.id)}>
              {m.nama}
            </a>
          ))}
        </div>
      )}

      {mapelAktif ? (
        <TanyaJawabPanel pertanyaan={pertanyaan} kelasId={kelasAktif.id} mapelId={mapelAktif.id} canModerate />
      ) : (
        <EmptyState icon="💬" title="Belum ada mata pelajaran yang diampu di kelas ini" />
      )}
    </AppShell>
  );
}
