import { getSession } from "@/lib/auth";
import { getSemuaMapel } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export default async function ImporSoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { error } = await searchParams;

  const semuaMapel = await getSemuaMapel(session.sekolahId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Impor Soal via CSV"
      pageSubtitle="BS-7 — untuk soal yang sudah ada di Excel, tak perlu input satu-satu"
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}

      <div className="bg-paper-raised border border-rule rounded-xl p-6 max-w-lg flex flex-col gap-4">
        <Callout tone="info">
          Kolom CSV: <code>jenis</code> (PILIHAN_GANDA/JAWABAN_SINGKAT/ESAI), <code>pertanyaan</code>,{" "}
          <code>opsi_a..opsi_d</code> (khusus PG), <code>kunci</code> (huruf A-D untuk PG, teks jawaban
          untuk jawaban singkat), <code>topik</code> (opsional).
        </Callout>
        <a href="/api/soal/impor/template" className="text-xs font-semibold text-primary-deep hover:underline">
          Unduh contoh template CSV
        </a>
        <form action="/api/soal/impor/preview" method="POST" encType="multipart/form-data" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Mata pelajaran tujuan</label>
            <select name="mapelId" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              {semuaMapel.map((m) => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">File CSV</label>
            <input type="file" name="file" accept=".csv" required className="text-sm" />
          </div>
          <Button type="submit" size="sm">Unggah & pratinjau</Button>
        </form>
      </div>
    </AppShell>
  );
}
