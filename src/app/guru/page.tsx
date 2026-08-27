import { getSession } from "@/lib/auth";
import { getDashboardGuru, getRemindersGuru, getCatatanSupervisiUntukGuru } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Card, CardHead, StatCard } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PengumumanWidget } from "@/components/PengumumanWidget";
import { getSalam, formatTanggal } from "@/lib/utils";

export default async function GuruDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [dashboard, reminders, catatanSupervisi] = await Promise.all([
    getDashboardGuru(session.userId, session.sekolahId),
    getRemindersGuru(session.userId),
    getCatatanSupervisiUntukGuru(session.userId),
  ]);
  const { jumlahKelas, jumlahMurid, jadwalHariIni, tugasBelumDinilai, esaiPerluDinilai, persenHadirHariIni, penugasan } = dashboard;

  return (
    <AppShell
      showBack={false}
      groups={NAV_GURU}
      activeHref="/guru"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${getSalam(new Date(), session.jenisKelamin)} ${session.nama}`}
      pageSubtitle="Kumpulan data informatif dari kelas & muridmu hari ini (D-1, 1.6)"
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      <div className="mb-4"><PengumumanWidget sekolahId={session.sekolahId} /></div>
      {reminders.length > 0 && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Perlu ditindaklanjuti (X-7)</h3>
          <div className="flex flex-col gap-2">
            {reminders.map((r, i) => (
              <a key={i} href={r.href}>
                <Callout tone="warn">{r.pesan}</Callout>
              </a>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Kelas diampu" value={String(jumlahKelas)} />
        <StatCard label="Murid diajar" value={String(jumlahMurid)} />
        <StatCard label="Kehadiran hari ini" value={persenHadirHariIni !== null ? `${persenHadirHariIni}%` : "belum diisi"} tone={persenHadirHariIni !== null && persenHadirHariIni < 80 ? "warn" : "good"} />
        <StatCard label="Tugas belum dinilai" value={String(tugasBelumDinilai)} tone={tugasBelumDinilai > 0 ? "warn" : "default"} />
      </div>

      {esaiPerluDinilai > 0 && (
        <div className="mb-5">
          <Callout tone="warn">
            ⚠ Ada <b>{esaiPerluDinilai} jawaban esai</b> yang perlu dinilai manual di ujian yang sudah dikerjakan murid. <a href="/guru/ujian" className="underline font-semibold">Buka Kelola Ujian →</a>
          </Callout>
        </div>
      )}

      <Card className="mb-5">
        <h3 className="text-sm font-semibold mb-3">Jadwal mengajar hari ini</h3>
        {jadwalHariIni.length === 0 && <p className="text-xs text-ink-soft">Tidak ada jadwal hari ini, atau belum diisi — atur di menu Jadwal Mengajar.</p>}
        <div className="flex flex-col gap-1.5">
          {jadwalHariIni.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-1.5">
              <span className="tabnum text-ink-soft w-28 shrink-0">{e.jamMulai}–{e.jamSelesai}</span>
              <span className="flex-1">{e.mapel.nama} — Kelas {e.kelas.nama}</span>
              <a href={`/guru/absensi`} className="text-xs font-semibold text-primary-deep hover:underline">Absensi →</a>
            </div>
          ))}
        </div>
      </Card>

      <h3 className="text-sm font-semibold mb-2">Kelas & mapel yang diampu</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {penugasan.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[15px]">
                  {p.mapel.nama} — Kelas {p.kelas.nama}
                </h3>
                <p className="text-xs text-ink-soft mt-1">KKM {p.mapel.kkm}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <LinkButton href="/guru/absensi" variant="ghost" size="sm">
                  Absensi
                </LinkButton>
                <LinkButton href="/guru/nilai" variant="ghost" size="sm">
                  Nilai
                </LinkButton>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {catatanSupervisi.length > 0 && (
        <Card className="mt-5">
          <CardHead title="Catatan supervisi dari kepala sekolah" subtitle="Penilaian kualitatif — hal yang tak terukur angka" />
          <div className="flex flex-col gap-2">
            {catatanSupervisi.map((c) => (
              <div key={c.id} className="bg-paper border border-rule rounded-lg p-3 text-sm">
                <p>{c.catatan}</p>
                <p className="text-xs text-ink-soft mt-1.5">— {c.kepsek.nama}, {formatTanggal(c.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
