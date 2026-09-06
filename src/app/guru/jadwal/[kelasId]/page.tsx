import { getSession } from "@/lib/auth";
import { getJadwalKelas, getTahunAjaranAktif } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { ToastFromQuery } from "@/components/ui/ToastFromQuery";
import { Button, LinkButton } from "@/components/ui/Button";
import { PrintButton } from "@/components/ui/PrintButton";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { Drawer } from "@/components/ui/Drawer";
import { WeekCalendar, type WeekEvent } from "@/components/ui/WeekCalendar";
import { notFound } from "next/navigation";

const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default async function JadwalGuruKelasPage({
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

  const weekEvents: WeekEvent[] = entries.map((entry) => {
    const milikSendiri = entry.guru.penggunaId === session.userId;
    const presensi = entry.hari === hariIni ? presensiMap.get(entry.id) : undefined;

    if (!milikSendiri) {
      return {
        id: entry.id,
        hari: entry.hari,
        jamMulai: entry.jamMulai,
        jamSelesai: entry.jamSelesai,
        tone: "other",
        content: (
          <div title={`${entry.mapel.nama} — ${entry.guru.pengguna.nama}, ${entry.jamMulai}–${entry.jamSelesai}`}>
            <div className="tabnum">{entry.jamMulai}</div>
            <div className="truncate">{entry.mapel.nama}</div>
          </div>
        ),
      };
    }

    return {
      id: entry.id,
      hari: entry.hari,
      jamMulai: entry.jamMulai,
      jamSelesai: entry.jamSelesai,
      tone: "own",
      content: (
        <Drawer
          triggerClassName="block w-full h-full text-left cursor-pointer"
          eyebrow={`${HARI[entry.hari]} — Kelas ${kelas.nama}`}
          title={`${entry.mapel.nama}, ${entry.jamMulai}–${entry.jamSelesai}`}
          triggerLabel={
            <>
              <div className="tabnum">{entry.jamMulai}{presensi?.hadir && " ✓"}</div>
              <div className="truncate">{entry.mapel.nama}</div>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            {entry.hari === hariIni && (
              presensi ? (
                <p className="text-sm font-semibold">{presensi.hadir ? "✓ Kehadiran mengajar sudah tercatat" : "Tercatat berhalangan"}</p>
              ) : (
                <form action="/api/presensi-guru/manual" method="POST">
                  <input type="hidden" name="jadwalEntryId" value={entry.id} />
                  <Button type="submit" size="sm" variant="accent" className="w-full justify-center">Tandai hadir</Button>
                </form>
              )
            )}

            <div>
              <p className="text-xs font-semibold mb-1.5">Edit jam</p>
              <form action="/api/jadwal" method="POST" className="flex flex-col gap-2">
                <input type="hidden" name="entryId" value={entry.id} />
                <input type="hidden" name="kelasId" value={kelasId} />
                <input type="hidden" name="hari" value={entry.hari} />
                <input type="hidden" name="tahunAjaranId" value={tahunAktif.id} />
                <input type="hidden" name="penugasan" value={`${entry.mapelId}|${guruProfil.id}`} />
                <div className="flex gap-2">
                  <input type="time" name="jamMulai" defaultValue={entry.jamMulai} required className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                  <input type="time" name="jamSelesai" defaultValue={entry.jamSelesai} required className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
                <Button type="submit" size="sm">Simpan perubahan</Button>
              </form>
            </div>

            <div className="border-b border-rule" />
            <form action="/api/jadwal/hapus" method="POST">
              <input type="hidden" name="jadwalEntryId" value={entry.id} />
              <input type="hidden" name="kelasId" value={kelasId} />
              <ConfirmSubmitLink confirmMessage="Hapus sesi jadwal ini?" className="text-danger text-xs font-semibold hover:underline">
                Hapus sesi ini
              </ConfirmSubmitLink>
            </form>
          </div>
        </Drawer>
      ),
    };
  });

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/jadwal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Jadwal Kelas ${kelas.nama}`}
      pageSubtitle={`Minggu ini · ${tahunAktif.label} — isi jam mulai/selesai sendiri untuk mapel yang kamu ampu (G-4, jam asli mirip kalender)`}
      headerAction={<div className="flex flex-wrap gap-2"><LinkButton href="/guru/jadwal" variant="ghost" size="sm">← Semua kelas</LinkButton><PrintButton /></div>}
      lebarPenuh
    >
      <ToastFromQuery />
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      {penugasanSendiri.length === 0 && (
        <Callout tone="warn">Kamu tidak mengampu mapel apa pun di kelas ini — cuma bisa lihat, tidak bisa mengisi jadwal.</Callout>
      )}

      {penugasanSendiri.length > 0 && (
        <div className="mb-4">
          <Drawer triggerLabel="+ Tambah sesi" eyebrow="Jadwal" title={`Tambah sesi — Kelas ${kelas.nama}`}>
            <form action="/api/jadwal" method="POST" className="flex flex-col gap-3">
              <input type="hidden" name="kelasId" value={kelasId} />
              <input type="hidden" name="tahunAjaranId" value={tahunAktif.id} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Hari</label>
                <select name="hari" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
                  {HARI.slice(1).map((h, i) => (
                    <option key={h} value={i + 1}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="time" name="jamMulai" required className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                <input type="time" name="jamSelesai" required className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
              </div>
              <select name="penugasan" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
                {penugasanSendiri.map((p) => (
                  <option key={p.id} value={`${p.mapelId}|${guruProfil.id}`}>{p.mapel.nama}</option>
                ))}
              </select>
              <Button type="submit" size="sm">Simpan sesi</Button>
            </form>
          </Drawer>
        </div>
      )}

      <WeekCalendar hariList={HARI.slice(1)} hariAktif={hariIni} events={weekEvents} />
      <p className="text-[11.5px] text-ink-soft mt-3">
        💡 Klik sesi kelas ini (warna hijau tua) untuk tandai hadir, ubah jam, atau hapus. Sesi kelas lain (abu-abu putus-putus) cuma info — kamu cuma satu orang, gak bisa ngajar 2 kelas jam yang sama.
      </p>
    </AppShell>
  );
}
