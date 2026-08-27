import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getMapelUntukKelas, getTanyaJawabKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { TanyaJawabPanel } from "@/components/TanyaJawabPanel";

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
        <div className="flex flex-wrap gap-2 mb-5">
          {mapelUnik.map((m) => (
            <a
              key={m.id}
              href={`/murid/tanya-jawab?mapel=${m.id}`}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (m.id === mapelAktif?.id
                  ? "bg-primary text-white border-primary font-semibold"
                  : "border-rule text-ink-soft hover:bg-paper-raised")
              }
            >
              {m.nama}
            </a>
          ))}
        </div>
      )}

      {mapelAktif ? (
        <TanyaJawabPanel pertanyaan={pertanyaan} kelasId={siswa.kelasId} mapelId={mapelAktif.id} canModerate={false} />
      ) : (
        <p className="text-sm text-ink-soft">Belum ada mata pelajaran untuk kelasmu.</p>
      )}
    </AppShell>
  );
}
