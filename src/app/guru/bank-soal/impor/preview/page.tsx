import { getSession } from "@/lib/auth";
import { ambilBatch } from "@/lib/csv";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";

export default async function ImporSoalPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { batch: batchId } = await searchParams;
  const batch = batchId ? ambilBatch(batchId) : undefined;

  if (!batch || batch.jenis !== "soal") {
    return (
      <AppShell
        groups={NAV_GURU}
        activeHref="/guru/bank-soal"
        userName={session.nama}
        userRoleLabel={ROLE_LABEL[session.peran]}
        pageTitle="Pratinjau Impor Soal"
      >
        <Callout tone="warn">Batch impor tidak ditemukan atau sudah kedaluwarsa. Unggah ulang filenya.</Callout>
      </AppShell>
    );
  }

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Pratinjau Impor Soal"
      pageSubtitle="Tinjau sebelum disimpan ke bank soal"
    >
      <div className="flex gap-2 mb-4 flex-wrap">
        <Pill tone="ok">{batch.valid.length} baris valid</Pill>
        {batch.bermasalah.length > 0 && <Pill tone="danger">{batch.bermasalah.length} bermasalah</Pill>}
      </div>

      {batch.bermasalah.length > 0 && (
        <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold">Baris</th>
                <th className="text-left px-4 py-2.5 font-bold">Pertanyaan</th>
                <th className="text-left px-4 py-2.5 font-bold">Masalah</th>
              </tr>
            </thead>
            <tbody>
              {batch.bermasalah.map((b, i) => (
                <tr key={i} className="border-t border-rule">
                  <td className="px-4 py-2.5 tabnum">{b.baris}</td>
                  <td className="px-4 py-2.5">{b.pertanyaan || "—"}</td>
                  <td className="px-4 py-2.5 text-danger">{b.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {batch.valid.length > 0 && (
        <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold">Jenis</th>
                <th className="text-left px-4 py-2.5 font-bold">Pertanyaan</th>
                <th className="text-left px-4 py-2.5 font-bold">Topik</th>
              </tr>
            </thead>
            <tbody>
              {batch.valid.slice(0, 50).map((v, i) => (
                <tr key={i} className="border-t border-rule">
                  <td className="px-4 py-2.5">{v.jenis}</td>
                  <td className="px-4 py-2.5">{v.pertanyaan}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{v.topik || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {batch.valid.length > 50 && (
            <p className="text-xs text-ink-soft px-4 py-2">…dan {batch.valid.length - 50} lagi.</p>
          )}
        </div>
      )}

      <form action="/api/soal/impor/commit" method="POST" className="flex flex-wrap gap-2">
        <input type="hidden" name="batchId" value={batchId} />
        <Button type="submit" disabled={batch.valid.length === 0}>
          Simpan {batch.valid.length} soal ke bank
        </Button>
        <a href="/guru/bank-soal" className="text-xs font-semibold text-ink-soft self-center hover:underline">
          Batal
        </a>
      </form>
    </AppShell>
  );
}
