import { getSession } from "@/lib/auth";
import { getKelasDiampu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";

export default async function BuatUjianPage() {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Buat Ujian Baru"
      pageSubtitle="Pilih konteks dulu — soal disusun di langkah berikutnya"
    >
      <form action="/api/ujian" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-lg">
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Judul ujian</label>
          <input name="judul" required placeholder="mis. UTS Matematika" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Kelas + mapel</label>
            <select name="penugasan" id="penugasan" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
              {penugasan.map((p) => (
                <option key={p.id} value={`${p.kelas.id}|${p.mapel.id}`}>
                  {p.kelas.nama} — {p.mapel.nama}
                </option>
              ))}
            </select>
            <input type="hidden" name="kelasId" id="kelasId" />
            <input type="hidden" name="mapelId" id="mapelId" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Jenis</label>
            <select name="jenis" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
              <option value="UJIAN">Ujian (dinilai)</option>
              <option value="LATIHAN">Latihan Soal (boleh diulang)</option>
            </select>
          </div>
        </div>
        <Button type="submit">Lanjut susun soal →</Button>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            function syncPenugasan(){
              var sel = document.getElementById('penugasan');
              if (!sel || !sel.value) return;
              var parts = sel.value.split('|');
              document.getElementById('kelasId').value = parts[0];
              document.getElementById('mapelId').value = parts[1];
            }
            document.getElementById('penugasan')?.addEventListener('change', syncPenugasan);
            syncPenugasan();
          `,
        }}
      />
    </AppShell>
  );
}
