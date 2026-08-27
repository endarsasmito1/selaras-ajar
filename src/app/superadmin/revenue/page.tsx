import { getSession } from "@/lib/auth";
import { getRevenuePlatform } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { StatCard, Card, CardHead } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { formatRupiah } from "@/lib/utils";

const PAKET_LABEL: Record<string, string> = { BASIC: "Basic", PRO: "Pro", ENTERPRISE: "Enterprise" };

export default async function SuperadminRevenuePage() {
  const session = await getSession();
  if (!session) return null;

  const { mrrTotal, perPaket, tren, sekolahNunggak, totalLangganan, totalAktif } = await getRevenuePlatform();
  const maxTren = Math.max(...tren.map((t) => t.total), 1);

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/revenue"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Revenue Platform"
      pageSubtitle="Pendapatan langganan Selaras Ajar dari sekolah tenant — terpisah dari SPP/tagihan sekolah ke siswanya"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="MRR (bulan ini)" value={formatRupiah(mrrTotal)} tone="good" />
        <StatCard label="ARR (proyeksi tahunan)" value={formatRupiah(mrrTotal * 12)} />
        <StatCard label="Langganan aktif" value={`${totalAktif} / ${totalLangganan}`} sub="sekolah" />
        <StatCard label="Nunggak bulan ini" value={String(sekolahNunggak.length)} tone={sekolahNunggak.length > 0 ? "warn" : "default"} sub="sekolah" />
      </div>

      <Card className="mb-6">
        <CardHead title="Breakdown per paket" subtitle="MRR & jumlah sekolah, hanya langganan berstatus aktif" />
        <div className="flex flex-col gap-1.5">
          {perPaket.map((p) => (
            <div key={p.paket} className="flex items-center gap-3 text-sm border-b border-rule last:border-0 py-2">
              <span className="flex-1 font-semibold">{PAKET_LABEL[p.paket]}</span>
              <span className="text-xs text-ink-soft">{p.jumlahSekolah} sekolah</span>
              <span className="tabnum text-xs w-40 text-right">{formatRupiah(p.mrr)} / bulan</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Tren pendapatan 6 bulan terakhir</h3>
          <span className="text-[11px] text-ink-soft">Hanya pembayaran berstatus lunas</span>
        </div>
        <div className="flex items-end gap-2 h-28 mt-3">
          {tren.map((t) => (
            <div key={t.periode} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="w-full bg-paper-sunken rounded-t relative" style={{ height: "100%" }}>
                <div className="absolute bottom-0 w-full bg-primary rounded-t" style={{ height: `${(t.total / maxTren) * 100}%` }} />
              </div>
              <span className="text-[10px] text-ink-soft text-center leading-tight">{t.periode}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead title="Sekolah yang nunggak/telat bulan ini" subtitle="Belum ada pembayaran lunas utk periode berjalan" />
        {sekolahNunggak.length === 0 ? (
          <p className="text-sm text-ink-soft">Semua sekolah aktif sudah lunas bulan ini. 🎉</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sekolahNunggak.map(({ langganan, statusBulanIni }) => (
              <div key={langganan.id} className="flex items-center gap-3 text-sm border-b border-rule last:border-0 py-2">
                <span className="flex-1 font-semibold">{langganan.sekolah.nama}</span>
                <span className="text-xs text-ink-soft">{PAKET_LABEL[langganan.paket]} — {formatRupiah(langganan.hargaPerBulan)}/bulan</span>
                <Pill tone="warn">{statusBulanIni === "TELAT" ? "Telat" : "Belum bayar"}</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
