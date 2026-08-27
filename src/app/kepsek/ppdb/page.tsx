import { getSession } from "@/lib/auth";
import { getPPDBList } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { formatTanggal } from "@/lib/utils";

export default async function PPDBKepsekPage() {
  const session = await getSession();
  if (!session) return null;

  const daftar = await getPPDBList(session.sekolahId);
  const baru = daftar.filter((d) => d.status === "BARU");

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/ppdb"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="PPDB / SPMB"
      pageSubtitle={`${baru.length} pendaftar baru perlu ditinjau`}
    >
      <Callout>
        Formulir pendaftaran publik ada di <code className="bg-paper-sunken px-1.5 py-0.5 rounded">/ppdb</code> — bagikan tautan itu ke calon orang tua siswa.
      </Callout>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto mt-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Calon Siswa</th>
              <th className="text-left px-4 py-2.5 font-bold">Jenjang</th>
              <th className="text-left px-4 py-2.5 font-bold">Orang Tua</th>
              <th className="text-left px-4 py-2.5 font-bold">Kontak</th>
              <th className="text-left px-4 py-2.5 font-bold">Tanggal</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((d) => (
              <tr key={d.id} className="border-t border-rule">
                <td className="px-4 py-2.5 font-semibold">{d.namaCalon}</td>
                <td className="px-4 py-2.5">{d.jenjangDaftar}</td>
                <td className="px-4 py-2.5">{d.namaOrtu}</td>
                <td className="px-4 py-2.5 text-ink-soft">{d.kontak}</td>
                <td className="px-4 py-2.5 text-ink-soft">{formatTanggal(d.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <Pill tone={d.status === "DITERIMA" ? "ok" : d.status === "DITOLAK" ? "warn" : "info"}>
                    {d.status === "BARU" ? "Baru" : d.status === "DITERIMA" ? "Diterima" : "Ditolak"}
                  </Pill>
                </td>
                <td className="px-4 py-2.5">
                  {d.status === "BARU" && (
                    <div className="flex flex-wrap gap-2">
                      <form action="/api/ppdb/putuskan" method="POST">
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="status" value="DITERIMA" />
                        <ConfirmSubmitButton size="sm" confirmMessage={`Terima pendaftaran ${d.namaCalon}?`}>Terima</ConfirmSubmitButton>
                      </form>
                      <form action="/api/ppdb/putuskan" method="POST">
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="status" value="DITOLAK" />
                        <ConfirmSubmitButton size="sm" variant="ghost" confirmMessage={`Tolak pendaftaran ${d.namaCalon}?`}>Tolak</ConfirmSubmitButton>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
