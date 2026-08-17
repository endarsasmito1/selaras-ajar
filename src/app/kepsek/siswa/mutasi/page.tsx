import { getSession } from "@/lib/auth";
import { getDaftarSiswa, getSemuaKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export default async function MutasiSiswaPage() {
  const session = await getSession();
  if (!session) return null;

  const [siswa, kelas] = await Promise.all([
    getDaftarSiswa(session.sekolahId),
    getSemuaKelas(session.sekolahId),
  ]);
  const aktif = siswa.filter((s) => s.aktif);
  const nonaktif = siswa.filter((s) => !s.aktif);

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/siswa/mutasi"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Mutasi Siswa"
      pageSubtitle="Catat siswa pindah masuk atau keluar"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHead title="Siswa pindah masuk" subtitle="Tambah siswa baru dari sekolah lain" />
          <form action="/api/siswa/mutasi-masuk" method="POST" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">NISN</label>
              <input name="nisn" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Nama lengkap</label>
              <input name="nama" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Kelas</label>
                <select name="kelasId" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                  {kelas.map((k) => (<option key={k.id} value={k.id}>{k.nama}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Jenis kelamin</label>
                <select name="jenisKelamin" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
            </div>
            <Button type="submit" size="sm" className="self-start mt-1">Tambahkan sebagai siswa aktif</Button>
          </form>
        </Card>

        <Card>
          <CardHead title="Siswa pindah keluar" subtitle="Nonaktifkan siswa yang pindah ke sekolah lain" />
          <div className="flex flex-col gap-2 max-h-96 overflow-auto">
            {aktif.map((s) => (
              <form key={s.id} action="/api/siswa/mutasi-keluar" method="POST" className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-2">
                <input type="hidden" name="siswaId" value={s.id} />
                <span>{s.nama} <span className="text-ink-soft">— {s.kelas.nama}</span></span>
                <Button type="submit" size="sm" variant="ghost">Tandai keluar</Button>
              </form>
            ))}
          </div>
        </Card>
      </div>

      {nonaktif.length > 0 && (
        <Card className="mt-4">
          <CardHead title="Riwayat siswa nonaktif" subtitle="Sudah lulus atau pindah keluar" />
          <div className="flex flex-wrap gap-2">
            {nonaktif.map((s) => (
              <Pill key={s.id} tone="neutral">{s.nama} — {s.kelas.nama}</Pill>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
