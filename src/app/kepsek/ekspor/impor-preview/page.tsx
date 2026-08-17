import { getSession } from "@/lib/auth";
import { ambilBatch } from "@/lib/csv";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Pill } from "@/components/ui/Pill";

export default async function ImporPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { batch: batchId } = await searchParams;

  const batch = batchId ? ambilBatch(batchId) : undefined;
  if (!batch) {
    return (
      <AppShell groups={NAV_KEPSEK} activeHref="/kepsek/ekspor" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Preview Impor">
        <Callout tone="warn">Batch impor tidak ditemukan atau sudah kedaluwarsa. Silakan unggah ulang.</Callout>
      </AppShell>
    );
  }

  const akanDibuat = batch.valid.filter((v) => v.aksi === "buat").length;
  const akanDiperbarui = batch.valid.filter((v) => v.aksi === "perbarui").length;

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/ekspor"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Preview Impor Data Siswa"
      pageSubtitle="Tinjau dulu sebelum data benar-benar masuk"
    >
      <div className="flex flex-wrap gap-2 mb-5">
        <Pill tone="ok">✓ {batch.valid.length} baris valid</Pill>
        <Pill tone="info">↻ {akanDiperbarui} akan diperbarui (NISN sudah ada)</Pill>
        <Pill tone="neutral">+ {akanDibuat} akan dibuat baru</Pill>
        {batch.bermasalah.length > 0 && <Pill tone="warn">⚠ {batch.bermasalah.length} baris bermasalah</Pill>}
      </div>

      {batch.bermasalah.length > 0 && (
        <>
          <Callout tone="warn">
            Baris di bawah ini bermasalah. Perbaiki di file lalu unggah ulang, <b>atau</b> lanjut simpan — baris valid tetap masuk, baris bermasalah dilewati &amp; bisa diperbaiki nanti lewat UI.
          </Callout>
          <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden my-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="text-left px-4 py-2 font-bold w-16">Baris</th>
                  <th className="text-left px-4 py-2 font-bold">Nama</th>
                  <th className="text-left px-4 py-2 font-bold">NISN</th>
                  <th className="text-left px-4 py-2 font-bold">Masalah</th>
                </tr>
              </thead>
              <tbody>
                {batch.bermasalah.map((b, i) => (
                  <tr key={i} className="border-t border-rule bg-warning-tint/40">
                    <td className="px-4 py-2 tabnum">{b.baris}</td>
                    <td className="px-4 py-2">{b.nama || "—"}</td>
                    <td className="px-4 py-2 tabnum">{b.nisn || "—"}</td>
                    <td className="px-4 py-2"><Pill tone="warn">{b.error}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {batch.valid.length > 0 && (
        <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden mb-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2 font-bold">Nama</th>
                <th className="text-left px-4 py-2 font-bold">NISN</th>
                <th className="text-left px-4 py-2 font-bold">Kelas</th>
                <th className="text-left px-4 py-2 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {batch.valid.slice(0, 50).map((b, i) => (
                <tr key={i} className="border-t border-rule">
                  <td className="px-4 py-2">{b.nama}</td>
                  <td className="px-4 py-2 tabnum">{b.nisn}</td>
                  <td className="px-4 py-2">{b.kelasNama}</td>
                  <td className="px-4 py-2"><Pill tone={b.aksi === "buat" ? "ok" : "info"}>{b.aksi === "buat" ? "Baru" : "Perbarui"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
          {batch.valid.length > 50 && <p className="text-xs text-ink-soft p-3">…dan {batch.valid.length - 50} baris lainnya.</p>}
        </div>
      )}

      <form action="/api/impor/siswa/commit" method="POST" className="flex items-center gap-3">
        <input type="hidden" name="batchId" value={batchId} />
        <Button type="submit" disabled={batch.valid.length === 0}>
          Simpan {batch.valid.length} baris valid
        </Button>
        <a href="/kepsek/ekspor" className="text-sm text-ink-soft hover:underline">Batal, unggah ulang file</a>
      </form>
    </AppShell>
  );
}
