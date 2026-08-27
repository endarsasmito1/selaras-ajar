import { getSession } from "@/lib/auth";
import { getSemuaPengumuman } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { formatTanggal } from "@/lib/utils";

export default async function PengumumanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pengumuman_dibuat?: string; pengumuman_dihapus?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const pengumuman = await getSemuaPengumuman(session.sekolahId);

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/pengumuman"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Pengumuman Sekolah"
      pageSubtitle="1.20 — tampil sbg widget di dashboard guru, murid, orang tua, dan TU"
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.pengumuman_dibuat !== undefined && (
        <div className="mb-4"><Callout>✓ Pengumuman "{sp.pengumuman_dibuat}" berhasil diterbitkan.</Callout></div>
      )}
      {sp.pengumuman_dihapus && <div className="mb-4"><Callout>✓ Pengumuman dihapus.</Callout></div>}

      <form action="/api/pengumuman" method="POST" className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <h3 className="text-base font-semibold mb-3">+ Buat pengumuman baru</h3>
        <div className="flex flex-col gap-1.5 mb-3">
          <label className="text-xs font-semibold">Judul</label>
          <input name="judul" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. Libur Semester Genap" />
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Isi pengumuman</label>
          <textarea name="isi" required rows={4} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="Tulis isi pengumuman di sini…" />
        </div>
        <Button type="submit" size="sm">Terbitkan</Button>
      </form>

      <div className="flex flex-col gap-2.5">
        {pengumuman.length === 0 && <p className="text-sm text-ink-soft">Belum ada pengumuman.</p>}
        {pengumuman.map((p) => (
          <div key={p.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-sm">{p.judul}</h4>
                <p className="text-xs text-ink-soft mt-0.5">
                  {formatTanggal(p.createdAt)} · oleh {p.dibuatOleh.nama}
                </p>
              </div>
              <form action="/api/pengumuman/hapus" method="POST">
                <input type="hidden" name="pengumumanId" value={p.id} />
                <ConfirmSubmitLink confirmMessage={`Hapus pengumuman "${p.judul}"?`} className="text-xs text-danger hover:underline shrink-0">
                  Hapus
                </ConfirmSubmitLink>
              </form>
            </div>
            <p className="text-sm mt-2 whitespace-pre-line">{p.isi}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
