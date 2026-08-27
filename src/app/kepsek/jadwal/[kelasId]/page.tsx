import { getSession } from "@/lib/auth";
import { getJadwalKelas, getTahunAjaranAktif } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
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
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      {penugasan.length === 0 && (
        <Callout tone="warn">Belum ada guru ditugaskan ke kelas ini — tetapkan penugasan guru dulu di menu Data Guru.</Callout>
      )}

      <div className="grid md:grid-cols-3 gap-3.5 mt-4">
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
                      <details>
                        <summary className="cursor-pointer text-primary-deep text-[10px] font-semibold">Edit jam</summary>
                        <form action="/api/jadwal" method="POST" className="mt-1.5 flex flex-col gap-1.5 bg-paper-raised border border-rule rounded-lg p-2">
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input type="hidden" name="kelasId" value={kelasId} />
                          <input type="hidden" name="hari" value={hari} />
                          <input type="hidden" name="tahunAjaranId" value={tahunAktif.id} />
                          <input type="hidden" name="penugasan" value={`${entry.mapelId}|${entry.guruId}`} />
                          <div className="flex gap-1.5">
                            <input type="time" name="jamMulai" defaultValue={entry.jamMulai} required className="flex-1 bg-paper border border-rule rounded px-1.5 py-1 text-[11px]" />
                            <input type="time" name="jamSelesai" defaultValue={entry.jamSelesai} required className="flex-1 bg-paper border border-rule rounded px-1.5 py-1 text-[11px]" />
                          </div>
                          <button type="submit" className="text-primary-deep font-semibold text-[10px] self-start">Simpan perubahan</button>
                        </form>
                      </details>
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
                <details className="mt-2.5">
                  <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Tambah sesi</summary>
                  <form action="/api/jadwal" method="POST" className="mt-2 flex flex-col gap-1.5">
                    <input type="hidden" name="kelasId" value={kelasId} />
                    <input type="hidden" name="hari" value={hari} />
                    <input type="hidden" name="tahunAjaranId" value={tahunAktif.id} />
                    <div className="flex gap-1.5">
                      <input type="time" name="jamMulai" required className="flex-1 bg-paper border border-rule rounded px-2 py-1 text-xs" />
                      <input type="time" name="jamSelesai" required className="flex-1 bg-paper border border-rule rounded px-2 py-1 text-xs" />
                    </div>
                    <select name="penugasan" className="bg-paper border border-rule rounded px-2 py-1 text-xs">
                      {penugasan.map((p) => (
                        <option key={p.id} value={`${p.mapelId}|${p.guruId}`}>{p.mapel.nama} — {p.guru.pengguna.nama}</option>
                      ))}
                    </select>
                    <button type="submit" className="text-primary-deep font-semibold text-xs self-start">Simpan sesi</button>
                  </form>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
