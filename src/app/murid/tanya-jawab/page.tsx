import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getMapelUntukKelas, getTanyaJawabKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { TanyaJawabPanel } from "@/components/TanyaJawabPanel";
import { tabClass } from "@/lib/tab-style";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TanyaJawabMuridPage({
  searchParams,
}: {
  searchParams: Promise<{ mapel?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const mapelUnik = await getMapelUntukKelas(siswa.kelasId);
  const params = await searchParams;
  const mapelAktifId = params.mapel && mapelUnik.some((m) => m.id === params.mapel) ? params.mapel : mapelUnik[0]?.id;
  const mapelAktif = mapelUnik.find((m) => m.id === mapelAktifId);

  const pertanyaan = mapelAktif ? await getTanyaJawabKelas(siswa.kelasId, mapelAktif.id) : [];

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/tanya-jawab"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Tanya Jawab Kelas"
      pageSubtitle={`Kelas ${siswa.kelas.nama}${mapelAktif ? ` · ${mapelAktif.nama}` : ""}`}
    >
      {mapelUnik.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-rule mb-5" role="tablist">
          {mapelUnik.map((m) => (
            <a key={m.id} href={`/murid/tanya-jawab?mapel=${m.id}`} role="tab" aria-selected={m.id === mapelAktif?.id} className={tabClass(m.id === mapelAktif?.id)}>
              {m.nama}
            </a>
          ))}
        </div>
      )}

      {mapelAktif ? (
        <TanyaJawabPanel pertanyaan={pertanyaan} kelasId={siswa.kelasId} mapelId={mapelAktif.id} canModerate={false} />
      ) : (
        <EmptyState icon="💬" title="Belum ada mata pelajaran untuk kelasmu" />
      )}
    </AppShell>
  );
}
