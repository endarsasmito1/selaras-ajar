import { getSession } from "@/lib/auth";
import { getTahunAjaranAktif, getDaftarSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export default async function KenaikanKelasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { error } = await searchParams;

  const [tahunAktif, siswa] = await Promise.all([
    getTahunAjaranAktif(session.sekolahId),
    getDaftarSiswa(session.sekolahId),
  ]);
  const totalAktif = siswa.filter((s) => s.aktif).length;

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/tahun-ajaran"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kenaikan Kelas & Tahun Ajaran Baru"
      pageSubtitle="Langkah 1/2 — buat tahun ajaran baru, lalu tinjau rombel tujuan per siswa"
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <Callout tone="warn">
        ⚠ Setelah ini, kamu akan diarahkan ke halaman <b>peninjauan</b> untuk memilih rombel tujuan tiap siswa (bisa dipecah ke lebih dari satu rombel, mis. sebagian 4A ke 5B & sebagian ke 5C) sebelum benar-benar dieksekusi — tahun ajaran <b>{tahunAktif?.label}</b> ({totalAktif} siswa aktif) belum berubah apa pun di langkah ini.
      </Callout>

      <form action="/api/tahun-ajaran/kenaikan-kelas/mulai" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-lg mt-5">
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
        <Button type="submit">Lanjut ke peninjauan rombel tujuan →</Button>
      </form>
    </AppShell>
  );
}
