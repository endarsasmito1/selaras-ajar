import { getSession } from "@/lib/auth";
import { getRingkasanSekolah } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { StatCard } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/utils";

export default async function KepsekDashboard() {
  const session = await getSession();
  if (!session) return null;

  const ringkasan = await getRingkasanSekolah(session.sekolahId);

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ringkasan Sekolah"
      pageSubtitle={
        ringkasan.tahunAjaran
          ? `${ringkasan.tahunAjaran.label} — Semester ${ringkasan.tahunAjaran.semester}`
          : undefined
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Total Siswa" value={String(ringkasan.totalSiswa)} sub={`${ringkasan.totalKelas} kelas`} />
        <StatCard
          label="Kehadiran hari ini"
          value={ringkasan.persenHadir !== null ? `${ringkasan.persenHadir}%` : "—"}
          sub={ringkasan.persenHadir === null ? "belum ada absensi" : undefined}
          tone="good"
        />
        <StatCard label="SPP terkumpul (Agu 2026)" value={formatRupiah(ringkasan.terkumpul)} />
        <StatCard
          label="Tunggakan aktif"
          value={String(ringkasan.tunggakanCount)}
          sub={formatRupiah(ringkasan.tunggakanTotal)}
          tone="warn"
        />
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl p-5">
        <h3 className="text-base font-semibold mb-1">Selamat datang, {session.nama}</h3>
        <p className="text-sm text-ink-soft">
          Ini prototype Selaras Ajar dengan data dummy — jelajahi menu di kiri untuk lihat data
          siswa, guru, tahun ajaran, dan keuangan sekolah.
        </p>
      </div>
    </AppShell>
  );
}
