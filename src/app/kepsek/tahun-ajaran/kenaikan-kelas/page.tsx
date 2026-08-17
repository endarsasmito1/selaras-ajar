import { getSession } from "@/lib/auth";
import { getTahunAjaranAktif, getDaftarSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export default async function KenaikanKelasPage() {
  const session = await getSession();
  if (!session) return null;

  const [tahunAktif, siswa] = await Promise.all([
    getTahunAjaranAktif(session.sekolahId),
    getDaftarSiswa(session.sekolahId),
  ]);
  const totalAktif = siswa.filter((s) => s.aktif).length;

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/tahun-ajaran"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kenaikan Kelas & Tahun Ajaran Baru"
      pageSubtitle="Pindahkan seluruh siswa ke kelas berikutnya sekaligus"
    >
      <Callout tone="warn">
        ⚠ Tindakan ini membuat tahun ajaran baru, menonaktifkan tahun ajaran <b>{tahunAktif?.label}</b> saat ini, dan memindahkan seluruh {totalAktif} siswa aktif ke tingkat berikutnya. Siswa di tingkat tertinggi akan ditandai lulus/alumni.
      </Callout>

      <form action="/api/tahun-ajaran/kenaikan-kelas" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-lg mt-5">
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Label tahun ajaran baru</label>
          <input name="label" required placeholder="2027/2028" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Semester</label>
            <select name="semester" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tingkat tertinggi (lulus setelah ini)</label>
            <input type="number" name="tingkatMaks" defaultValue={6} className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Mulai</label>
            <input type="date" name="mulai" required className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Selesai</label>
            <input type="date" name="selesai" required className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
          </div>
        </div>
        <Button type="submit">Jalankan kenaikan kelas</Button>
      </form>
    </AppShell>
  );
}
