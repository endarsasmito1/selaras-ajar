import { getSession } from "@/lib/auth";
import { getJadwalKelas, getTahunAjaranAktif } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { Drawer } from "@/components/ui/Drawer";
import { notFound } from "next/navigation";

const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default async function JadwalKelasPage({
  params,
  searchParams,
}: {
  params: Promise<{ kelasId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { kelasId } = await params;
  const { error } = await searchParams;

  const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } });
  if (!kelas) notFound();

  const tahunAktif = await getTahunAjaranAktif(session.sekolahId);
  if (!tahunAktif) {
    return (
      <AppShell groups={groupsForPeran(session.peran)} activeHref="/kepsek/jadwal" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Jadwal">
        <Callout tone="warn">Belum ada tahun ajaran aktif.</Callout>
      </AppShell>
    );
  }

  const [entries, penugasan] = await Promise.all([
    getJadwalKelas(kelasId, tahunAktif.id),
    prisma.penugasanGuru.findMany({ where: { kelasId }, include: { guru: { include: { pengguna: true } }, mapel: true } }),
  ]);

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/jadwal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Jadwal Kelas ${kelas.nama}`}
      pageSubtitle={`${tahunAktif.label} — Semester ${tahunAktif.semester} · jam asli, bebas per sesi, diurutkan dari paling awal (1.7)`}
      headerAction={<LinkButton href="/kepsek/jadwal" variant="ghost" size="sm">← Semua kelas</LinkButton>}
      lebarPenuh
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      {penugasan.length === 0 && (
        <Callout tone="warn">Belum ada guru ditugaskan ke kelas ini — tetapkan penugasan guru dulu di menu Data Guru.</Callout>
      )}

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-4">
        {HARI.slice(1).map((h, i) => {
          const hari = i + 1;
          const sesiHari = entries.filter((e) => e.hari === hari).sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
          return (
            <div key={hari} className="bg-paper-raised border border-rule rounded-xl p-3.5">
              <h3 className="text-sm font-semibold mb-2">{h}</h3>
              <div className="flex flex-col gap-2">
                {sesiHari.map((entry) => (
                  <div key={entry.id} className="bg-primary-tint border border-primary/30 rounded-lg p-2 text-xs">
                    <div className="tabnum text-ink-soft">{entry.jamMulai}–{entry.jamSelesai}</div>
                    <div className="font-semibold text-primary-deep">{entry.mapel.nama}</div>
                    <div className="text-ink-soft">{entry.guru.pengguna.nama}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Drawer triggerLabel="Edit jam" triggerClassName="cursor-pointer text-primary-deep text-[10px] font-semibold" eyebrow="Jadwal" title="Edit jam sesi">
                        <form action="/api/jadwal" method="POST" className="flex flex-col gap-2">
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input type="hidden" name="kelasId" value={kelasId} />
                          <input type="hidden" name="hari" value={hari} />
                          <input type="hidden" name="tahunAjaranId" value={tahunAktif.id} />
                          <input type="hidden" name="penugasan" value={`${entry.mapelId}|${entry.guruId}`} />
                          <div className="flex gap-2">
                            <input type="time" name="jamMulai" defaultValue={entry.jamMulai} required className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                            <input type="time" name="jamSelesai" defaultValue={entry.jamSelesai} required className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                          </div>
                          <div className="border-b border-rule my-1" />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm">Simpan perubahan</Button>
                            <Button type="submit" formMethod="dialog" variant="ghost" size="sm">Batal</Button>
                          </div>
                        </form>
                      </Drawer>
                      <form action="/api/jadwal/hapus" method="POST">
                        <input type="hidden" name="jadwalEntryId" value={entry.id} />
                        <input type="hidden" name="kelasId" value={kelasId} />
                        <ConfirmSubmitLink confirmMessage="Hapus sesi jadwal ini?" className="text-danger text-[10px] hover:underline">Hapus</ConfirmSubmitLink>
                      </form>
                    </div>
                  </div>
                ))}
                {sesiHari.length === 0 && <p className="text-xs text-ink-soft">Belum ada sesi.</p>}
              </div>

              {penugasan.length > 0 && (
                <div className="mt-2.5">
                  <Drawer triggerLabel="+ Tambah sesi" triggerClassName="cursor-pointer text-xs font-semibold text-primary-deep" eyebrow="Jadwal" title={`Tambah sesi — ${h}`}>
                    <form action="/api/jadwal" method="POST" className="flex flex-col gap-2">
                      <input type="hidden" name="kelasId" value={kelasId} />
                      <input type="hidden" name="hari" value={hari} />
                      <input type="hidden" name="tahunAjaranId" value={tahunAktif.id} />
                      <div className="flex gap-2">
                        <input type="time" name="jamMulai" required className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                        <input type="time" name="jamSelesai" required className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <select name="penugasan" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
                        {penugasan.map((p) => (
                          <option key={p.id} value={`${p.mapelId}|${p.guruId}`}>{p.mapel.nama} — {p.guru.pengguna.nama}</option>
                        ))}
                      </select>
                      <div className="border-b border-rule my-1" />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">Simpan sesi</Button>
                        <Button type="submit" formMethod="dialog" variant="ghost" size="sm">Batal</Button>
                      </div>
                    </form>
                  </Drawer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
