import { getSession } from "@/lib/auth";
import { getTugasDetail, getKomentar } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { DiskusiPanel } from "@/components/DiskusiPanel";
import { renderMarkdownLite } from "@/lib/markdown-lite";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

function fmtWaktu(d: Date) {
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function TugasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const tugas = await getTugasDetail(id, session.sekolahId);
  if (!tugas) notFound();
  const komentar = await getKomentar({ tugasId: tugas.id });

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/tugas"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={tugas.judul}
      pageSubtitle={`${tugas.mapel.nama} · ${tugas.kelas.nama} · tenggat ${formatTanggal(tugas.tenggat)}`}
    >
      <div className="text-sm bg-paper-raised border border-rule rounded-xl p-4 mb-6">
        {renderMarkdownLite(tugas.instruksi)}
        {(tugas.lampiranUrl || tugas.tautanUrl) && (
          <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-rule">
            {tugas.lampiranUrl && <a href={tugas.lampiranUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary-deep hover:underline">📎 Lampiran</a>}
            {tugas.tautanUrl && <a href={tugas.tautanUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary-deep hover:underline">🔗 Tautan</a>}
          </div>
        )}
      </div>

      <h3 className="text-sm font-semibold mb-2">Terkumpul ({tugas.pengumpulan.length}) — klik nama untuk koreksi</h3>
      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Nama</th>
              <th className="text-left px-4 py-2.5 font-bold">Waktu submit</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {tugas.pengumpulan.map((p) => (
              <tr key={p.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 font-semibold">
                  <a href={`/guru/tugas/${tugas.id}/murid/${p.id}`} className="text-primary-deep hover:underline">{p.siswa.nama}</a>
                </td>
                <td className="px-4 py-2.5 text-ink-soft text-xs tabnum">{fmtWaktu(p.submitAt)}</td>
                <td className="px-4 py-2.5">{p.terlambat ? <Pill tone="warn">Terlambat</Pill> : <Pill tone="ok">Tepat waktu</Pill>}</td>
                <td className="px-4 py-2.5 tabnum">{p.nilai !== null ? p.nilai : <span className="text-ink-soft">belum dinilai</span>}</td>
              </tr>
            ))}
            {tugas.pengumpulan.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-4 text-center text-ink-soft text-xs">Belum ada yang mengumpulkan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {tugas.belumKumpul.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-2">Belum mengumpulkan ({tugas.belumKumpul.length})</h3>
          <div className="bg-paper-raised border border-rule rounded-xl p-4 flex flex-wrap gap-2 mb-6">
            {tugas.belumKumpul.map((s) => (
              <Pill key={s.id} tone="neutral">{s.nama}</Pill>
            ))}
          </div>
        </>
      )}

      <div className="bg-paper-raised border border-rule rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Diskusi & Tanya Jawab</h3>
        <DiskusiPanel komentar={komentar} targetType="tugas" targetId={tugas.id} canModerate={tugas.penggunaId === session.userId} />
      </div>
    </AppShell>
  );
}
