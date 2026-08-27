import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getTugasSiswaDetail, getKomentar } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Pill } from "@/components/ui/Pill";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { DiskusiPanel } from "@/components/DiskusiPanel";
import { CountdownTenggat } from "@/components/ui/CountdownTenggat";
import { renderMarkdownLite } from "@/lib/markdown-lite";
import { formatTanggal } from "@/lib/utils";

export default async function KerjakanTugasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const { error } = await searchParams;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const hasil = await getTugasSiswaDetail(id, siswa.id);
  if (!hasil) return null;
  const { tugas, pengumpulan } = hasil;
  const komentar = await getKomentar({ tugasId: tugas.id });

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
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}

      <div className="text-sm bg-paper-raised border border-rule rounded-xl p-4 mb-5">
        {renderMarkdownLite(tugas.instruksi)}
        {(tugas.lampiranUrl || tugas.tautanUrl) && (
          <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-rule">
            {tugas.lampiranUrl && (
              <a href={tugas.lampiranUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary-deep hover:underline">
                📎 Lihat lampiran
              </a>
            )}
            {tugas.tautanUrl && (
              <a href={tugas.tautanUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary-deep hover:underline">
                🔗 Tautan rujukan
              </a>
            )}
          </div>
        )}
      </div>

      {pengumpulan && (
        <p className="text-xs text-ink-soft mb-3">
          Dikumpulkan {formatTanggal(pengumpulan.submitAt)}
          {pengumpulan.terlambat && <span className="text-warning font-semibold"> · terlambat</span>}
        </p>
      )}

      {pengumpulan?.nilai !== null && pengumpulan?.nilai !== undefined && (
        <Callout>
          ✓ Sudah dinilai — <b>{pengumpulan.nilai}</b>
          {pengumpulan.catatanGuru && <> · Catatan guru: {pengumpulan.catatanGuru}</>}
        </Callout>
      )}

      {!pengumpulan && (
        <p className="text-xs mb-3">
          <CountdownTenggat tenggat={tugas.tenggat.toISOString()} />
        </p>
      )}

      {lewatTenggat && !pengumpulan && <Callout tone="warn">⚠ Tenggat sudah lewat — pengumpulan akan ditandai terlambat.</Callout>}

      <form action="/api/tugas/kumpul" method="POST" encType="multipart/form-data" className="mt-4">
        <input type="hidden" name="tugasId" value={tugas.id} />
        <div className="mb-3">
          <label className="text-xs font-semibold block mb-1.5">Jawabanmu (teks)</label>
          <RichTextEditor name="isiJawaban" defaultValue={pengumpulan?.isiJawaban ?? ""} placeholder="Tulis jawaban di sini…" />
        </div>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Lampiran (unggah berkas, opsional)</label>
            <input name="lampiranFile" type="file" className="text-sm" />
            {pengumpulan?.lampiranUrl && (
              <a href={pengumpulan.lampiranUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-deep hover:underline">📎 Lampiran saat ini — unggah baru utk ganti</a>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tautan (opsional)</label>
            <input
              name="tautanUrl"
              type="url"
              defaultValue={pengumpulan?.tautanUrl ?? ""}
              placeholder="https://…"
              className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit">{pengumpulan ? "Perbarui jawaban" : "Kumpulkan tugas"}</Button>
          {pengumpulan && <Pill tone={pengumpulan.terlambat ? "warn" : "ok"}>{pengumpulan.terlambat ? "Terlambat" : "Tepat waktu"}</Pill>}
        </div>
      </form>

      <div className="bg-paper-raised border border-rule rounded-xl p-5 mt-6">
        <h3 className="text-sm font-semibold mb-3">Diskusi & Tanya Jawab</h3>
        <DiskusiPanel komentar={komentar} targetType="tugas" targetId={tugas.id} canModerate={false} />
      </div>
    </AppShell>
  );
}
