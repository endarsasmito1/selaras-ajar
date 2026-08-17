import { getSession } from "@/lib/auth";
import { getRingkasanKeuangan } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, NAV_KEUANGAN, ROLE_LABEL } from "@/lib/nav";
import { StatCard } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const PERIODE = "Agustus 2026";

export default async function KeuanganPage() {
  const session = await getSession();
  if (!session) return null;

  const { tagihan, terkumpul, target, belumBayarCount } = await getRingkasanKeuangan(
    session.sekolahId,
    PERIODE
  );

  const groups = session.peran === "KEPALA_SEKOLAH" ? NAV_KEPSEK : NAV_KEUANGAN;

  return (
    <AppShell
      groups={groups}
      activeHref="/keuangan"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Keuangan / SPP"
      pageSubtitle={`Periode ${PERIODE} — rekonsiliasi otomatis, tak perlu cek mutasi manual`}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-6">
        <StatCard label="Terkumpul" value={formatRupiah(terkumpul)} tone="good" />
        <StatCard label="Target periode ini" value={formatRupiah(target)} />
        <StatCard label="Belum bayar" value={String(belumBayarCount)} tone="warn" sub="siswa" />
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Siswa</th>
              <th className="text-left px-4 py-2.5 font-bold">Kelas</th>
              <th className="text-left px-4 py-2.5 font-bold">Tagihan</th>
              <th className="text-left px-4 py-2.5 font-bold">Metode</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {tagihan.map((t) => (
              <tr key={t.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 font-semibold">{t.siswa.nama}</td>
                <td className="px-4 py-2.5">{t.siswa.kelas.nama}</td>
                <td className="px-4 py-2.5 tabnum">{formatRupiah(t.nominal)}</td>
                <td className="px-4 py-2.5 text-ink-soft text-xs">
                  {t.metodeBayar ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Pill tone={t.status === "LUNAS" ? "ok" : t.status === "CICILAN" ? "info" : "warn"}>
                    {t.status === "LUNAS" ? "Lunas" : t.status === "CICILAN" ? "Cicilan" : "Belum bayar"}
                  </Pill>
                </td>
                <td className="px-4 py-2.5">
                  {t.status === "BELUM_BAYAR" && (
                    <form action="/api/tagihan/lunas" method="POST">
                      <input type="hidden" name="tagihanId" value={t.id} />
                      <input type="hidden" name="metode" value="Tunai (dicatat manual)" />
                      <Button type="submit" size="sm" variant="ghost">
                        Tandai lunas
                      </Button>
                    </form>
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
