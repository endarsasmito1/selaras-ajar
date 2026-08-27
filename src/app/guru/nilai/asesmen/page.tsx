import { getSession } from "@/lib/auth";
import { getKelasDiampu, getSiswaKelas } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { formatTanggal } from "@/lib/utils";

export default async function AsesmenDeskriptifPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const penugasan = await getKelasDiampu(session.userId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());
  const kelasAktifId = sp.kelas ?? kelasUnik[0]?.id;
  const kelasAktif = kelasUnik.find((k) => k.id === kelasAktifId) ?? kelasUnik[0];
  const mapelUntukKelas = penugasan.filter((p) => p.kelasId === kelasAktif?.id);

  if (!kelasAktif) {
    return (
      <AppShell groups={NAV_GURU} activeHref="/guru/nilai" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Asesmen Deskriptif">
        <Callout tone="warn">Belum ada kelas yang diampu.</Callout>
      </AppShell>
    );
  }

  const [siswaList, catatanTerbaruList] = await Promise.all([
    getSiswaKelas(kelasAktif.id),
    prisma.catatanAsesmen.findMany({
      where: { siswa: { kelasId: kelasAktif.id }, penggunaId: session.userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const terbaruPerSiswa = new Map<string, (typeof catatanTerbaruList)[number]>();
  for (const c of catatanTerbaruList) {
    if (!terbaruPerSiswa.has(c.siswaId)) terbaruPerSiswa.set(c.siswaId, c);
  }

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/nilai"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Asesmen Deskriptif"
      pageSubtitle="N-5 — catatan naratif per murid, pelengkap nilai angka. Riwayat lengkap ada di halaman detail murid."
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}

      {kelasUnik.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {kelasUnik.map((k) => (
            <a
              key={k.id}
              href={`/guru/nilai/asesmen?kelas=${k.id}`}
              className={"text-xs px-3 py-1.5 rounded-full border " + (k.id === kelasAktif.id ? "bg-primary text-white border-primary font-semibold" : "border-rule text-ink-soft hover:bg-paper-raised")}
            >
              Kelas {k.nama}
            </a>
          ))}
        </div>
      )}

      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Murid</th>
              <th className="text-left px-4 py-2.5 font-bold">Catatan terbaru darimu</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {siswaList.map((s) => {
              const terbaru = terbaruPerSiswa.get(s.id);
              return (
                <tr key={s.id} className="border-t border-rule">
                  <td className="px-4 py-2.5 font-semibold">
                    <a href={`/guru/performa/${s.id}`} className="hover:underline">{s.nama}</a>
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft text-xs max-w-xs">
                    {terbuka(terbaru?.isi) ?? <span className="italic">Belum ada catatan</span>}
                    {terbaru && <div className="text-[10px] mt-0.5">{formatTanggal(terbaru.createdAt)}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <ConfirmDialog triggerLabel="+ Nilai/Masukan" title={`Asesmen — ${s.nama}`}>
                      <form action="/api/nilai/asesmen" method="POST" className="flex flex-col gap-3">
                        <input type="hidden" name="siswaId" value={s.id} />
                        <input type="hidden" name="kelasId" value={kelasAktif.id} />
                        <input type="hidden" name="periode" value={new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })} />
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold">Mata pelajaran</label>
                          <select name="mapelId" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                            {Array.from(new Map(mapelUntukKelas.map((p) => [p.mapelId, p.mapel])).values()).map((m) => (
                              <option key={m.id} value={m.id}>{m.nama}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold">Catatan / masukan / pujian</label>
                          <textarea name="isi" required rows={3} placeholder="mis. Sudah baik dalam operasi hitung, perlu latihan lebih pada soal cerita." className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <Button type="submit" size="sm" className="self-start">Simpan</Button>
                      </form>
                    </ConfirmDialog>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function terbuka(isi?: string) {
  if (!isi) return null;
  return isi.length > 80 ? isi.slice(0, 80) + "…" : isi;
}
