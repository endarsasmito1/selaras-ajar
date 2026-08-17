import { getSession } from "@/lib/auth";
import { getInboxPengguna, getKontakUntukPesan } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { formatTanggal } from "@/lib/utils";

export default async function PesanGuruPage() {
  const session = await getSession();
  if (!session) return null;

  const [inbox, kontak] = await Promise.all([
    getInboxPengguna(session.userId),
    getKontakUntukPesan(session),
  ]);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/pesan"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Pesan"
      pageSubtitle="Komunikasi ke orang tua lewat sistem — nomor pribadi tetap aman"
    >
      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Kirim pesan baru</summary>
        <form action="/api/pesan" method="POST" className="mt-4">
          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-semibold">Kepada</label>
            <select name="penerimaId" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              {kontak.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-semibold">Judul</label>
            <input name="judul" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-xs font-semibold">Pesan</label>
            <textarea name="isi" required rows={3} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <Button type="submit" size="sm">Kirim</Button>
        </form>
      </details>

      <div className="flex flex-col gap-3">
        {inbox.length === 0 && <p className="text-sm text-ink-soft">Belum ada pesan.</p>}
        {inbox.map((p) => (
          <div key={p.id} className="bg-paper-raised border border-rule rounded-xl p-4">
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <span className="font-semibold text-sm">{p.judul}</span>
                <span className="text-xs text-ink-soft ml-2">
                  {p.pengirimId === session.userId ? `Ke: ${p.penerima?.nama}` : `Dari: ${p.pengirim.nama}`}
                </span>
              </div>
              <span className="text-xs text-ink-soft">{formatTanggal(p.createdAt)}</span>
            </div>
            <p className="text-sm">{p.isi}</p>
            {p.balasan.length > 0 && (
              <div className="mt-3 pl-4 border-l-2 border-rule flex flex-col gap-2">
                {p.balasan.map((b) => (
                  <div key={b.id} className="text-sm">
                    <b className="text-xs text-ink-soft">{b.pengirim.nama}:</b> {b.isi}
                  </div>
                ))}
              </div>
            )}
            <form action="/api/pesan" method="POST" className="mt-3 flex gap-2">
              <input type="hidden" name="parentId" value={p.id} />
              <input type="hidden" name="penerimaId" value={p.pengirimId === session.userId ? p.penerimaId ?? "" : p.pengirimId} />
              <input type="hidden" name="judul" value={`Re: ${p.judul}`} />
              <input name="isi" placeholder="Balas…" className="flex-1 bg-paper border border-rule rounded-lg px-3 py-1.5 text-sm" />
              <Button type="submit" size="sm" variant="ghost">Balas</Button>
            </form>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
