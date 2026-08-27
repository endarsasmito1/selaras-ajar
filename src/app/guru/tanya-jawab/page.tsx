import { getSession } from "@/lib/auth";
import { getKelasDiampu, getTanyaJawabKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { TanyaJawabPanel } from "@/components/TanyaJawabPanel";

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
        <p className="text-sm text-ink-soft">Belum ada kelas yang diampu.</p>
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
        <div className="flex flex-wrap gap-2 mb-3">
          {kelasUnik.map((k) => (
            <a
              key={k.id}
              href={`/guru/tanya-jawab?kelas=${k.id}`}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (k.id === kelasAktif.id
                  ? "bg-primary text-white border-primary font-semibold"
                  : "border-rule text-ink-soft hover:bg-paper-raised")
              }
            >
              Kelas {k.nama}
            </a>
          ))}
        </div>
      )}

      {mapelUnik.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {mapelUnik.map((m) => (
            <a
              key={m.id}
              href={`/guru/tanya-jawab?kelas=${kelasAktif.id}&mapel=${m.id}`}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (m.id === mapelAktif?.id
                  ? "bg-primary-tint text-primary-deep border-primary font-semibold"
                  : "border-rule text-ink-soft hover:bg-paper-raised")
              }
            >
              {m.nama}
            </a>
          ))}
        </div>
      )}

      {mapelAktif ? (
        <TanyaJawabPanel pertanyaan={pertanyaan} kelasId={kelasAktif.id} mapelId={mapelAktif.id} canModerate />
      ) : (
        <p className="text-sm text-ink-soft">Belum ada mata pelajaran yang diampu di kelas ini.</p>
      )}
    </AppShell>
  );
}
