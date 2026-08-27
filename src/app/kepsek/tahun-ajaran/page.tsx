import { getSession } from "@/lib/auth";
import { getDaftarTahunAjaran } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { formatTanggal } from "@/lib/utils";

export default async function TahunAjaranPage({
  searchParams,
}: {
  searchParams: Promise<{ promosi?: string; lulus?: string; pindah?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;

  const daftar = await getDaftarTahunAjaran(session.sekolahId);

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/tahun-ajaran"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Tahun Ajaran & Semester"
      pageSubtitle="Periode aktif menopang semua data — nilai, absensi, tagihan, kelas"
      headerAction={<LinkButton href="/kepsek/tahun-ajaran/kenaikan-kelas" size="sm">Naik kelas / Tahun ajaran baru →</LinkButton>}
    >
      {params.promosi && (
        <Callout>✓ Kenaikan kelas selesai — {params.promosi} siswa naik kelas, {params.lulus} siswa lulus, {params.pindah ?? 0} siswa pindah sekolah. Lihat detailnya di Riwayat Siswa.</Callout>
      )}

      <div className="flex flex-col gap-3 mt-4">
        {daftar.map((ta) => (
          <Card key={ta.id} className={ta.aktif ? "border-primary" : undefined}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-serif text-lg flex items-center gap-2">
                  {ta.label}
                  {ta.aktif && <Pill tone="ok">Aktif</Pill>}
                </div>
                <div className="text-xs text-ink-soft mt-1">
                  Semester {ta.semester} · {ta._count.kelas} kelas · mulai{" "}
                  {formatTanggal(ta.mulai)}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <LinkButton href={`/kepsek/tahun-ajaran/${ta.id}`} variant="ghost" size="sm">
                Lihat kelas, guru, absensi & riwayat pembayaran tahun ajaran ini (K-8) →
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
