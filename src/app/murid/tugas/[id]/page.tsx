import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getTugasSiswaDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

export default async function KerjakanTugasPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const hasil = await getTugasSiswaDetail(id, siswa.id);
  if (!hasil) return null;
  const { tugas, pengumpulan } = hasil;

  const lewatTenggat = new Date() > new Date(tugas.tenggat);

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/tugas"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={tugas.judul}
      pageSubtitle={`${tugas.mapel.nama} · tenggat ${formatTanggal(tugas.tenggat)}`}
    >
      <p className="text-sm bg-paper-raised border border-rule rounded-xl p-4 mb-5">{tugas.instruksi}</p>

      {pengumpulan?.nilai !== null && pengumpulan?.nilai !== undefined && (
        <Callout>
          ✓ Sudah dinilai — <b>{pengumpulan.nilai}</b>
          {pengumpulan.catatanGuru && <> · Catatan guru: {pengumpulan.catatanGuru}</>}
        </Callout>
      )}

      {lewatTenggat && !pengumpulan && <Callout tone="warn">⚠ Tenggat sudah lewat — pengumpulan akan ditandai terlambat.</Callout>}

      <form action="/api/tugas/kumpul" method="POST" className="mt-4">
        <input type="hidden" name="tugasId" value={tugas.id} />
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Jawabanmu</label>
          <textarea
            name="isiJawaban"
            rows={6}
            defaultValue={pengumpulan?.isiJawaban ?? ""}
            className="bg-paper-raised border border-rule rounded-lg px-3.5 py-3 text-sm"
            placeholder="Tulis jawaban di sini…"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit">{pengumpulan ? "Perbarui jawaban" : "Kumpulkan tugas"}</Button>
          {pengumpulan && <Pill tone={pengumpulan.terlambat ? "warn" : "ok"}>{pengumpulan.terlambat ? "Terlambat" : "Tepat waktu"}</Pill>}
        </div>
      </form>
    </AppShell>
  );
}
