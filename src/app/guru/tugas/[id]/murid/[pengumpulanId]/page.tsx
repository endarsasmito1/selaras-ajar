import { getSession } from "@/lib/auth";
import { getTugasDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { renderMarkdownLite } from "@/lib/markdown-lite";
import { notFound } from "next/navigation";

export default async function KoreksiPengumpulanPage({
  params,
}: {
  params: Promise<{ id: string; pengumpulanId: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id, pengumpulanId } = await params;

  const tugas = await getTugasDetail(id, session.sekolahId);
  if (!tugas) notFound();
  const p = tugas.pengumpulan.find((x) => x.id === pengumpulanId);
  if (!p) notFound();

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/tugas"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${p.siswa.nama} — ${tugas.judul}`}
      pageSubtitle={`${tugas.mapel.nama} · ${tugas.kelas.nama} · submit ${new Date(p.submitAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}${p.terlambat ? " · terlambat" : ""}`}
    >
      <a href={`/guru/tugas/${tugas.id}`} className="text-xs font-semibold text-primary-deep hover:underline mb-4 inline-block">← Kembali ke daftar pengumpulan</a>

      <div className="bg-paper-raised border border-rule rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          {p.terlambat ? <Pill tone="warn">Terlambat</Pill> : <Pill tone="ok">Tepat waktu</Pill>}
          {p.nilai !== null && <Pill tone="ok">Nilai: {p.nilai}</Pill>}
        </div>
        <div className="bg-paper border border-rule rounded-lg p-3 text-sm">
          {p.isiJawaban ? renderMarkdownLite(p.isiJawaban) : <span className="text-ink-soft italic">Tidak ada jawaban teks</span>}
          {(p.lampiranUrl || p.tautanUrl) && (
            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-rule">
              {p.lampiranUrl && <a href={p.lampiranUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary-deep hover:underline">📎 Lampiran murid</a>}
              {p.tautanUrl && <a href={p.tautanUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary-deep hover:underline">🔗 Tautan murid</a>}
            </div>
          )}
        </div>
      </div>

      <form action="/api/tugas/nilai" method="POST" className="bg-paper-raised border border-rule rounded-xl p-4 flex flex-col gap-3 max-w-sm">
        <input type="hidden" name="tugasId" value={tugas.id} />
        <input type="hidden" name="pengumpulanId" value={p.id} />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Nilai</label>
          <input type="number" name={`nilai_${p.id}`} min={0} max={100} defaultValue={p.nilai ?? ""} className="w-24 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Catatan/feedback</label>
          <textarea name={`catatan_${p.id}`} defaultValue={p.catatanGuru ?? ""} rows={3} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
        </div>
        <Button type="submit" size="sm" className="self-start">Simpan nilai & catatan</Button>
      </form>
    </AppShell>
  );
}
