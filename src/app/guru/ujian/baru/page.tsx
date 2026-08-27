import { getSession } from "@/lib/auth";
import { getKelasDiampu, getBabMapel } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export default async function BuatUjianPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { error } = await searchParams;

  const penugasan = await getKelasDiampu(session.userId);
  const mapelUnik = Array.from(new Map(penugasan.map((p) => [p.mapel.id, p.mapel])).values());
  const babPerMapelList = await Promise.all(mapelUnik.map((m) => getBabMapel(session.sekolahId, m.id)));

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Buat Ujian Baru"
      pageSubtitle="Pilih konteks dulu — soal disusun di langkah berikutnya. Bisa diterapkan ke lebih dari satu kelas (1.6)."
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <form action="/api/ujian" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-lg">
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Judul ujian</label>
          <input name="judul" required placeholder="mis. UTS Matematika" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Kelas + mapel — centang satu atau lebih (harus mapel yang sama)</label>
          <div className="flex flex-col gap-1.5 bg-paper border border-rule rounded-lg px-3 py-2.5">
            {penugasan.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="penugasan" value={`${p.kelas.id}|${p.mapel.id}`} />
                {p.kelas.nama} — {p.mapel.nama}
              </label>
            ))}
            {penugasan.length === 0 && <p className="text-xs text-ink-soft">Belum ada penugasan mengajar.</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Jenis</label>
            <select name="jenis" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
              <option value="UJIAN">Ujian (dinilai)</option>
              <option value="LATIHAN">Latihan Soal (boleh diulang)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Jenis penilaian</label>
            <select name="jenisPenilaian" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
              <option value="HARIAN">Harian</option>
              <option value="UTS">UTS</option>
              <option value="UAS">UAS</option>
            </select>
            <p className="text-[11px] text-ink-soft">Menentukan KKM mana yang dipakai kalau mapel ini punya KKM UTS/UAS berbeda.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Bab</label>
            <select name="babId" required className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
              <option value="">— Pilih bab —</option>
              {mapelUnik.map((m, i) => (
                <optgroup key={m.id} label={m.nama}>
                  {babPerMapelList[i].map((b) => (
                    <option key={b.id} value={b.id}>{b.nama}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-ink-soft">Wajib — bab harus dari mapel yang sama dengan kelas yang dicentang di atas.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Atau tambah bab baru (opsional)</label>
            <input name="babBaru" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" placeholder="mis. Bab 3 - Pecahan" />
          </div>
        </div>
        <Button type="submit">Lanjut susun soal →</Button>
      </form>
    </AppShell>
  );
}
