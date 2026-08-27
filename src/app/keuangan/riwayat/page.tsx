import { getSession } from "@/lib/auth";
import { getRiwayatTagihanSekolah } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, NAV_KEUANGAN, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { formatRupiah } from "@/lib/utils";

const PER_HALAMAN = 20;

export default async function RiwayatPembayaranPage({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string; status?: string; halaman?: string; tahunAjaranId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;
  const status = sp.status ?? "SEMUA";

  const tagihan = await getRiwayatTagihanSekolah(session.sekolahId, { cari: sp.cari, status, tahunAjaranId: sp.tahunAjaranId });

  const totalHalaman = Math.max(1, Math.ceil(tagihan.length / PER_HALAMAN));
  const halaman = Math.min(totalHalaman, Math.max(1, Number(sp.halaman) || 1));
  const tagihanHalaman = tagihan.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);
  const hrefHalaman = (h: number) =>
    `?cari=${encodeURIComponent(sp.cari ?? "")}&status=${status}&tahunAjaranId=${sp.tahunAjaranId ?? ""}&halaman=${h}`;

  const groups = session.peran === "KEPALA_SEKOLAH" ? NAV_KEPSEK : NAV_KEUANGAN;

  return (
    <AppShell
      groups={groups}
      activeHref="/keuangan"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Riwayat Pembayaran"
      pageSubtitle="Semua tagihan lintas periode & jenis — bisa difilter & dicari"
      headerAction={<LinkButton href="/keuangan" variant="ghost" size="sm">← Kembali ke Keuangan</LinkButton>}
      lebarPenuh
    >
      <form method="GET" className="mb-5 flex flex-wrap items-center gap-2">
        <input
          name="cari"
          defaultValue={sp.cari ?? ""}
          placeholder="Cari nama siswa…"
          className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm w-56"
        />
        <select name="status" defaultValue={status} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
          <option value="SEMUA">Semua status</option>
          <option value="LUNAS">Lunas</option>
          <option value="CICILAN">Cicilan</option>
          <option value="BELUM_BAYAR">Belum bayar</option>
        </select>
        <Button type="submit" size="sm" variant="ghost">Tampilkan</Button>
      </form>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Siswa</th>
              <th className="text-left px-4 py-2.5 font-bold">Kelas</th>
              <th className="text-left px-4 py-2.5 font-bold">Jenis</th>
              <th className="text-left px-4 py-2.5 font-bold">Periode</th>
              <th className="text-left px-4 py-2.5 font-bold">Tagihan</th>
              <th className="text-left px-4 py-2.5 font-bold">Tgl bayar</th>
              <th className="text-left px-4 py-2.5 font-bold">Metode</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {tagihanHalaman.map((t) => (
              <tr key={t.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 font-semibold">
                  <a href={`/keuangan/siswa/${t.siswa.id}`} className="hover:underline">{t.siswa.nama}</a>
                </td>
                <td className="px-4 py-2.5">{t.siswa.kelas.nama}</td>
                <td className="px-4 py-2.5 text-ink-soft text-xs">{t.tipe.nama}</td>
                <td className="px-4 py-2.5 text-ink-soft text-xs">{t.periode}</td>
                <td className="px-4 py-2.5 tabnum">{formatRupiah(t.nominal)}</td>
                <td className="px-4 py-2.5 text-ink-soft text-xs">
                  {t.dibayarPada ? new Date(t.dibayarPada).toLocaleDateString("id-ID") : "—"}
                </td>
                <td className="px-4 py-2.5 text-ink-soft text-xs">{t.metodeBayar ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Pill tone={t.status === "LUNAS" ? "ok" : t.status === "CICILAN" ? "info" : "warn"}>
                    {t.status === "LUNAS" ? "Lunas" : t.status === "CICILAN" ? "Cicilan" : "Belum bayar"}
                  </Pill>
                </td>
                <td className="px-4 py-2.5">
                  {t.status === "BELUM_BAYAR" && (
                    <ConfirmDialog triggerLabel="Tandai lunas" title={`Tandai lunas — ${t.siswa.nama}`}>
                      <form action="/api/tagihan/lunas" method="POST" className="flex flex-col gap-3">
                        <input type="hidden" name="tagihanId" value={t.id} />
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold">Nominal diterima</label>
                          <input
                            type="number"
                            name="nominal"
                            defaultValue={t.nominal}
                            required
                            className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold">Tanggal pembayaran</label>
                          <input
                            type="date"
                            name="tanggalBayar"
                            defaultValue={new Date().toISOString().slice(0, 10)}
                            required
                            className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold">Metode</label>
                          <select name="metode" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                            <option value="Tunai">Tunai</option>
                            <option value="Transfer manual">Transfer manual</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold">Catatan (opsional)</label>
                          <input name="catatan" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <Button type="submit" size="sm">Konfirmasi lunas</Button>
                      </form>
                    </ConfirmDialog>
                  )}
                </td>
              </tr>
            ))}
            {tagihan.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-ink-soft text-xs">{sp.cari ? "Tidak ada siswa yang cocok." : "Belum ada tagihan."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {tagihan.length > 0 && (
        <div className="text-xs text-ink-soft mt-3 text-center">
          Menampilkan {(halaman - 1) * PER_HALAMAN + 1}–{Math.min(halaman * PER_HALAMAN, tagihan.length)} dari {tagihan.length} tagihan
        </div>
      )}
      <Pagination halaman={halaman} totalHalaman={totalHalaman} hrefHalaman={hrefHalaman} />
    </AppShell>
  );
}
