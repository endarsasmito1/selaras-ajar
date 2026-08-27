import { getSession } from "@/lib/auth";
import { getJadwalKelas, getTahunAjaranAktif } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { LinkButton } from "@/components/ui/Button";
import { PrintButton } from "@/components/ui/PrintButton";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { notFound } from "next/navigation";

const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function tanggalUntukHari(hari: number) {
  const now = new Date();
  const dow = now.getDay(); // 0=Minggu..6=Sabtu
  const offsetKeSenin = dow === 0 ? -6 : 1 - dow;
  const senin = new Date(now);
  senin.setDate(now.getDate() + offsetKeSenin);
  const target = new Date(senin);
  target.setDate(senin.getDate() + (hari - 1));
  return target;
}
function fmtTanggalPendek(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default async function JadwalGuruKelasPage({
  params,
  searchParams,
}: {
  params: Promise<{ kelasId: string }>;
  searchParams: Promise<{ error?: string; hadir_disimpan?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { kelasId } = await params;
  const { error, hadir_disimpan } = await searchParams;

  const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } });
  if (!kelas) notFound();

  const guruProfil = await prisma.guruProfil.findUnique({ where: { penggunaId: session.userId } });
  const tahunAktif = await getTahunAjaranAktif(session.sekolahId);
  if (!guruProfil || !tahunAktif) {
    return (
      <AppShell groups={NAV_GURU} activeHref="/guru/jadwal" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Jadwal">
        <Callout tone="warn">Belum ada tahun ajaran aktif.</Callout>
      </AppShell>
    );
  }

  const [entries, penugasanSendiri] = await Promise.all([
    getJadwalKelas(kelasId, tahunAktif.id),
    prisma.penugasanGuru.findMany({ where: { kelasId, guruId: guruProfil.id }, include: { mapel: true } }),
  ]);

  const today = new Date();
  const hariIni = today.getDay() === 0 ? 7 : today.getDay();
  const tanggalOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const entryIdsHariIni = entries.filter((e) => e.hari === hariIni && e.guru.penggunaId === session.userId).map((e) => e.id);
  const presensiHariIni = entryIdsHariIni.length
    ? await prisma.presensiGuru.findMany({ where: { jadwalEntryId: { in: entryIdsHariIni }, tanggal: tanggalOnly } })
    : [];
  const presensiMap = new Map(presensiHariIni.map((p) => [p.jadwalEntryId, p]));

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/jadwal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Jadwal Kelas ${kelas.nama}`}
      pageSubtitle={`Minggu ini · ${tahunAktif.label} — isi jam mulai/selesai sendiri untuk mapel yang kamu ampu (G-4, jam asli mirip kalender)`}
      headerAction={<div className="flex flex-wrap gap-2"><LinkButton href="/guru/jadwal" variant="ghost" size="sm">← Semua kelas</LinkButton><PrintButton /></div>}
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      {hadir_disimpan && <div className="mb-4"><Callout>Kehadiran mengajar tercatat.</Callout></div>}
      {penugasanSendiri.length === 0 && (
        <Callout tone="warn">Kamu tidak mengampu mapel apa pun di kelas ini — cuma bisa lihat, tidak bisa mengisi jadwal.</Callout>
      )}

      <div className="grid md:grid-cols-3 gap-3.5 mt-4">
        {HARI.slice(1).map((h, i) => {
          const hari = i + 1;
          const sesiHari = entries.filter((e) => e.hari === hari).sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
          return (
            <div key={hari} className="bg-paper-raised border border-rule rounded-xl p-3.5">
              <h3 className={"text-sm font-semibold mb-2 " + (hari === hariIni ? "text-primary-deep" : "")}>
                {h} <span className="font-normal text-ink-soft tabnum text-xs">{fmtTanggalPendek(tanggalUntukHari(hari))}</span>
              </h3>
              <div className="flex flex-col gap-2">
                {sesiHari.map((entry) => {
                  const milikSendiri = entry.guru.penggunaId === session.userId;
                  const presensi = hari === hariIni ? presensiMap.get(entry.id) : undefined;
                  return (
                    <div key={entry.id} className={"rounded-lg p-2 border text-xs " + (milikSendiri ? "bg-primary-tint border-primary/30" : "bg-paper border-rule")}>
                      <div className="tabnum text-ink-soft">{entry.jamMulai}–{entry.jamSelesai}</div>
                      <div className={"font-semibold " + (milikSendiri ? "text-primary-deep" : "")}>{entry.mapel.nama}</div>
                      <div className="text-ink-soft">{entry.guru.pengguna.nama}</div>
                      {milikSendiri && (
                        <>
                          <div className="flex items-center gap-2 mt-1">
                            <details>
                              <summary className="cursor-pointer text-primary-deep text-[10px] font-semibold">Edit jam</summary>
                              <form action="/api/jadwal" method="POST" className="mt-1.5 flex flex-col gap-1.5 bg-paper-raised border border-rule rounded-lg p-2">
                                <input type="hidden" name="entryId" value={entry.id} />
                                <input type="hidden" name="kelasId" value={kelasId} />
                                <input type="hidden" name="hari" value={hari} />
                                <input type="hidden" name="tahunAjaranId" value={tahunAktif.id} />
                                <input type="hidden" name="penugasan" value={`${entry.mapelId}|${guruProfil.id}`} />
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
                          {hari === hariIni && (
                            presensi ? (
                              <div className="text-[10px] mt-1 font-semibold">{presensi.hadir ? "✓ Hadir" : "Berhalangan"}</div>
                            ) : (
                              <form action="/api/presensi-guru/manual" method="POST" className="mt-1">
                                <input type="hidden" name="jadwalEntryId" value={entry.id} />
                                <button type="submit" className="text-[10px] text-primary-deep hover:underline">Tandai hadir</button>
                              </form>
                            )
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                {sesiHari.length === 0 && <p className="text-xs text-ink-soft">Belum ada sesi.</p>}
              </div>

              {penugasanSendiri.length > 0 && (
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
                      {penugasanSendiri.map((p) => (
                        <option key={p.id} value={`${p.mapelId}|${guruProfil.id}`}>{p.mapel.nama}</option>
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
