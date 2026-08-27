import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getTugasSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { CountdownTenggat } from "@/components/ui/CountdownTenggat";
import { formatTanggal } from "@/lib/utils";

export default async function TugasMuridPage() {
  const session = await getSession();
  if (!session) return null;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const daftar = await getTugasSiswa(siswa.kelasId, siswa.id);

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/tugas"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Tugas"
      pageSubtitle="Semua tugas dari guru — jangan sampai lewat tenggat"
    >
      <h3 className="text-sm font-semibold mb-3">Tugas</h3>
      <div className="flex flex-col gap-2.5">
        {daftar.length === 0 && <p className="text-sm text-ink-soft">Belum ada tugas.</p>}
        {daftar.map((t) => {
          const p = t.pengumpulan[0];
          return (
            <div key={t.id} className="bg-paper-raised border border-rule rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-sm">{t.judul}</div>
                <div className="text-xs text-ink-soft mt-0.5">{t.mapel.nama} · tenggat {formatTanggal(t.tenggat)}</div>
                {p ? (
                  <div className="text-xs text-ink-soft mt-0.5">Dikumpulkan {formatTanggal(p.submitAt)}</div>
                ) : (
                  <div className="text-xs mt-0.5">
                    <CountdownTenggat tenggat={t.tenggat.toISOString()} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {p ? (
                  <>
                    {p.terlambat && <Pill tone="warn">Terlambat</Pill>}
                    <Pill tone={p.nilai !== null ? "ok" : "info"}>{p.nilai !== null ? `Nilai: ${p.nilai}` : "Terkumpul"}</Pill>
                    {/* T-6 — murid tetap bisa buka kembali tugas yang sudah dikumpulkan/dinilai kapan saja. */}
                    <LinkButton href={`/murid/tugas/${t.id}`} size="sm" variant="ghost">Lihat</LinkButton>
                  </>
                ) : (
                  <LinkButton href={`/murid/tugas/${t.id}`} size="sm" variant="accent">Kerjakan</LinkButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
