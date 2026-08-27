import { getSession } from "@/lib/auth";
import { getRPPDetail, getCapaianBank } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { notFound } from "next/navigation";

export default async function RPPEditPage({
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

  const [rpp, capaianList] = await Promise.all([getRPPDetail(id, session.sekolahId), getCapaianBank(session.sekolahId)]);
  if (!rpp) notFound();
  const capaianTerpilih = new Set(rpp.capaianTerkait.map((c) => c.capaianId));

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/rpp"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={rpp.judul}
      pageSubtitle={`${rpp.mapel.nama} · ${rpp.kelas.nama}`}
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <form action="/api/rpp/update" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-2xl flex flex-col gap-4">
        <input type="hidden" name="rppId" value={rpp.id} />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Judul / topik pertemuan</label>
          <input name="judul" defaultValue={rpp.judul} required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1.5">Isi RPP</label>
          <RichTextEditor name="isi" defaultValue={rpp.isi} required rows={6} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Lampiran</label>
          <input name="lampiranUrl" type="url" defaultValue={rpp.lampiranUrl ?? ""} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1.5">Capaian Pembelajaran terkait</label>
          <div className="bg-paper border border-rule rounded-lg p-3 max-h-48 overflow-y-auto flex flex-col gap-1.5">
            {capaianList.map((c) => (
              <label key={c.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="capaianIds" value={c.id} defaultChecked={capaianTerpilih.has(c.id)} className="mt-1" />
                <span>{c.kode && <b>{c.kode}</b>} {c.deskripsi}</span>
              </label>
            ))}
          </div>
        </div>

        {(rpp.materiTerkait.length > 0 || rpp.tugasTerkait.length > 0 || rpp.ujianTerkait.length > 0) && (
          <div>
            <label className="text-xs font-semibold block mb-1.5">Konten yang mengimplementasikan RPP ini</label>
            <div className="flex flex-wrap gap-1.5">
              {rpp.materiTerkait.map((m) => <span key={m.id} className="text-[11px] bg-primary-tint text-primary-deep px-2 py-0.5 rounded-full">📄 {m.judul}</span>)}
              {rpp.tugasTerkait.map((t) => <span key={t.id} className="text-[11px] bg-primary-tint text-primary-deep px-2 py-0.5 rounded-full">📝 {t.judul}</span>)}
              {rpp.ujianTerkait.map((u) => <span key={u.id} className="text-[11px] bg-primary-tint text-primary-deep px-2 py-0.5 rounded-full">📋 {u.judul}</span>)}
            </div>
          </div>
        )}

        <Button type="submit" className="self-start">Simpan perubahan</Button>
      </form>
    </AppShell>
  );
}
