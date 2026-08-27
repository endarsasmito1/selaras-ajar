import { getSession } from "@/lib/auth";
import { getRingkasanSekolah } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { StatCard, Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PengumumanWidget } from "@/components/PengumumanWidget";
import { formatRupiah, getSalam } from "@/lib/utils";

export default async function KepsekDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const ringkasan = await getRingkasanSekolah(session.sekolahId);

  return (
    <AppShell
      showBack={false}
      groups={NAV_KEPSEK}
      activeHref="/kepsek"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={ringkasan.sekolah?.nama ?? "Ringkasan Sekolah"}
      pageSubtitle={
        [
          ringkasan.sekolah?.alamat || "Alamat belum diisi",
          ringkasan.tahunAjaran ? `${ringkasan.tahunAjaran.label} — Semester ${ringkasan.tahunAjaran.semester}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      }
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      <details className="mb-4">
        <summary className="cursor-pointer text-xs font-semibold text-primary-deep">Ubah alamat sekolah</summary>
        <form action="/api/sekolah/profil" method="POST" className="mt-2 flex items-center gap-2 max-w-md">
          <input name="alamat" defaultValue={ringkasan.sekolah?.alamat ?? ""} placeholder="mis. Jl. Merdeka No. 12, Jakarta" className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
          <Button type="submit" size="sm">Simpan</Button>
        </form>
      </details>

      <div className="mb-4"><PengumumanWidget sekolahId={session.sekolahId} /></div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        <StatCard label="Total Siswa" value={String(ringkasan.totalSiswa)} sub={`${ringkasan.totalKelas} kelas`} />
        <StatCard label="Total Guru" value={String(ringkasan.totalGuru)} />
        <StatCard
          label="Kehadiran hari ini"
          value={ringkasan.persenHadir !== null ? `${ringkasan.persenHadir}%` : "—"}
          sub={ringkasan.persenHadir === null ? "belum ada absensi" : undefined}
          tone="good"
        />
        <StatCard label="SPP terkumpul (bulan ini)" value={formatRupiah(ringkasan.terkumpul)} />
        <StatCard
          label="Tunggakan aktif"
          value={String(ringkasan.tunggakanCount)}
          sub={formatRupiah(ringkasan.tunggakanTotal)}
          tone="warn"
        />
      </div>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-3">Ringkasan per kelas (K-1)</h3>
        <div className="bg-paper border border-rule rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2 font-bold">Kelas</th>
                <th className="text-left px-4 py-2 font-bold">Siswa</th>
                <th className="text-left px-4 py-2 font-bold">Kehadiran hari ini</th>
                <th className="text-left px-4 py-2 font-bold">Rata-rata nilai</th>
                <th className="text-left px-4 py-2 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {ringkasan.breakdownKelas.map((b) => (
                <tr key={b.kelas.id} className="border-t border-rule hover:bg-paper-sunken">
                  <td className="px-4 py-2 font-semibold">{b.kelas.nama}</td>
                  <td className="px-4 py-2 tabnum">{b.jumlahSiswa}</td>
                  <td className="px-4 py-2">
                    {b.persenHadirKelas !== null ? (
                      <Pill tone={b.persenHadirKelas >= 90 ? "ok" : b.persenHadirKelas >= 75 ? "warn" : "danger"}>{b.persenHadirKelas}%</Pill>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabnum">{b.rataNilai ?? "—"}</td>
                  <td className="px-4 py-2">
                    <a href={`/kepsek/siswa/kelas/${b.kelas.id}`} className="text-xs font-semibold text-primary-deep hover:underline">Detail</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="bg-paper-raised border border-rule rounded-xl p-5">
        <h3 className="text-base font-semibold mb-1">{getSalam(new Date(), session.jenisKelamin)} {session.nama}</h3>
        <p className="text-sm text-ink-soft">
          Ini prototype Selaras Ajar dengan data dummy — jelajahi menu di kiri untuk lihat data
          siswa, guru, tahun ajaran, dan keuangan sekolah.
        </p>
      </div>
    </AppShell>
  );
}
