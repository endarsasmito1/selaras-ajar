import { getSession } from "@/lib/auth";
import { getDashboardGuru, getRemindersGuru, getCatatanSupervisiUntukGuru } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Card, CardHead, StatCard } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PengumumanBanner } from "@/components/PengumumanWidget";
import { getSalam, formatTanggal } from "@/lib/utils";

export default async function GuruDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tingkat?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [dashboard, reminders, catatanSupervisi] = await Promise.all([
    getDashboardGuru(session.userId, session.sekolahId),
    getRemindersGuru(session.userId),
    getCatatanSupervisiUntukGuru(session.userId),
  ]);
  const { jumlahKelas, jumlahMurid, jadwalHariIni, tugasBelumDinilai, esaiPerluDinilai, persenHadirHariIni, penugasan, jumlahMuridPerKelas } = dashboard;

  // Padanan `SA.kelasGridByTingkat()` prototipe — grid "Kelas & mapel yang diampu" difilter per
  // TINGKAT (dropdown), bukan ditumpuk flat semua kelas sekaligus (guru yg ngajar lintas banyak
  // kelas/tingkat bisa keteteran liat puluhan kartu tanpa filter). Default ke tingkat kelas yang
  // dia jadi wali kelasnya (kalau ada), sama persis fallback di prototipe.
  const tingkatSet = Array.from(new Set(penugasan.map((p) => p.kelas.tingkat))).sort((a, b) => a - b);
  const waliKelasPenugasan = penugasan.find((p) => p.kelas.waliKelasId === session.userId);
  const tingkatFallback = waliKelasPenugasan ? waliKelasPenugasan.kelas.tingkat : tingkatSet[0];
  const tingkatAktif = sp.tingkat && tingkatSet.includes(Number(sp.tingkat)) ? Number(sp.tingkat) : tingkatFallback;
  const penugasanTingkatIni = penugasan.filter((p) => p.kelas.tingkat === tingkatAktif);

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
      <div className="mb-4"><PengumumanBanner sekolahId={session.sekolahId} /></div>
      {reminders.length > 0 && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Perlu ditindaklanjuti (X-7)</h3>
          <div className="flex flex-col gap-2">
            {reminders.map((r) => (
              <a
                key={r.id}
                href={r.href}
                className="flex items-center justify-between gap-2 bg-warning-tint text-warning rounded-lg px-3.5 py-3 text-sm font-semibold hover:brightness-95"
              >
                <span>{r.pesan}</span>
                <span className="opacity-80">→</span>
              </a>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard icon="▦" label="Kelas diampu" value={String(jumlahKelas)} />
        <StatCard icon="◔" label="Murid diajar" value={String(jumlahMurid)} />
        <StatCard icon="✓" label="Kehadiran hari ini" value={persenHadirHariIni !== null ? `${persenHadirHariIni}%` : "belum diisi"} tone={persenHadirHariIni !== null && persenHadirHariIni < 80 ? "warn" : "good"} />
        <StatCard icon="▧" label="Tugas belum dinilai" value={String(tugasBelumDinilai)} tone={tugasBelumDinilai > 0 ? "warn" : "default"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="text-sm font-semibold mb-3">Jadwal mengajar hari ini</h3>
            {jadwalHariIni.length === 0 && <p className="text-xs text-ink-soft">Tidak ada jadwal hari ini, atau belum diisi — atur di menu Jadwal Mengajar.</p>}
            <div className="flex flex-col gap-1.5">
              {jadwalHariIni.map((e) => (
                <div key={e.id} className="flex items-center gap-3.5 flex-wrap border-b border-rule-soft last:border-0 py-2.5">
                  <span className="tabnum bg-primary-tint text-primary-deep rounded-lg px-2.5 py-1 text-[11.5px] font-bold text-center shrink-0 min-w-16">{e.jamMulai}–{e.jamSelesai}</span>
                  <span className="flex-1 text-[13.5px] font-semibold">{e.mapel.nama} — Kelas {e.kelas.nama}</span>
                  <a href={`/guru/absensi`} className="text-xs font-semibold text-primary-deep hover:underline">Absensi →</a>
                </div>
              ))}
            </div>
          </Card>

          <div>
            <h3 className="text-sm font-semibold mb-2">Kelas & mapel yang diampu</h3>
            {tingkatSet.length > 1 && (
              <form method="GET" className="flex items-center gap-2 mb-3">
                <select name="tingkat" defaultValue={tingkatAktif} className="bg-paper-raised border border-rule rounded-lg px-3 py-1.5 text-xs">
                  {tingkatSet.map((t) => (
                    <option key={t} value={t}>Tingkat {t}</option>
                  ))}
                </select>
                <button type="submit" className="text-xs font-semibold text-primary-deep">Tampilkan</button>
              </form>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {penugasanTingkatIni.map((p) => (
                <Card key={p.id}>
                  <h4 className="font-semibold text-[13.5px]">
                    {p.mapel.nama} — {p.kelas.nama}
                    {p.kelas.waliKelasId === session.userId && " (Wali)"}
                  </h4>
                  <p className="text-xs text-ink-soft mt-1 mb-2.5">
                    KKM {p.mapel.kkm} · {jumlahMuridPerKelas[p.kelasId] ?? 0} murid
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <LinkButton href="/guru/absensi" size="sm">Absensi</LinkButton>
                    <LinkButton href="/guru/nilai" variant="accent" size="sm">Nilai</LinkButton>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="text-sm font-semibold mb-1">Bank Soal & Ujian/CBT</h3>
            {esaiPerluDinilai > 0 && (
              <p className="text-xs text-ink-soft mb-3">{esaiPerluDinilai} esai menunggu penilaian manual</p>
            )}
            {esaiPerluDinilai > 0 && (
              <LinkButton href="/guru/ujian" className="w-full justify-center mb-2">Nilai jawaban esai</LinkButton>
            )}
            <LinkButton href="/guru/bank-soal" variant="ghost" className="w-full justify-center">Kelola Bank Soal</LinkButton>
          </Card>

          {catatanSupervisi.length > 0 && (
            <Card>
              <CardHead title="Catatan supervisi" subtitle="Penilaian kualitatif dari kepala sekolah" />
              <div className="flex flex-col gap-4">
                {catatanSupervisi.map((c) => (
                  <div key={c.id} className="text-[13px] italic leading-relaxed">
                    &ldquo;{c.catatan}&rdquo;
                    <p className="not-italic text-[11.5px] text-ink-soft mt-2">— {c.kepsek.nama}, {formatTanggal(c.createdAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
