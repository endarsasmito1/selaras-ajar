import { getSession } from "@/lib/auth";
import { getRingkasanKeuangan, getDaftarPeriodeTagihan, getProyeksiKeuangan } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, NAV_KEUANGAN, ROLE_LABEL } from "@/lib/nav";
import { StatCard, Card, CardHead } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

const SATUAN_LABEL: Record<string, string> = { BULANAN: "bulanan", SEMESTER: "per semester" };

export default async function KeuanganPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const daftarPeriode = await getDaftarPeriodeTagihan(session.sekolahId);
  const periode = sp.periode || daftarPeriode[0] || new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const [{ tagihan: semuaTagihan, terkumpul, target, persentase, belumBayarCount, satuanPeriode }, proyeksi] = await Promise.all([
    getRingkasanKeuangan(session.sekolahId, periode),
    getProyeksiKeuangan(session.sekolahId),
  ]);

  // 1.21 — breakdown per jenis tagihan (SPP vs Buku vs Seragam dst) periode ini, sebelumnya cuma
  // ada tabel flat per-siswa yang menyembunyikan komposisi per jenisnya.
  const breakdownTipe = Array.from(
    semuaTagihan
      .reduce((m, t) => {
        const cur = m.get(t.tipe.nama) ?? { terkumpul: 0, target: 0, count: 0 };
        cur.target += t.nominal;
        if (t.status !== "BELUM_BAYAR") cur.terkumpul += t.nominal;
        cur.count += 1;
        m.set(t.tipe.nama, cur);
        return m;
      }, new Map<string, { terkumpul: number; target: number; count: number }>())
      .entries()
  ).map(([nama, v]) => ({ nama, ...v }));

  const groups = session.peran === "KEPALA_SEKOLAH" ? NAV_KEPSEK : NAV_KEUANGAN;

  return (
    <AppShell
      groups={groups}
      activeHref="/keuangan"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Keuangan / SPP"
      pageSubtitle={`Periode ${SATUAN_LABEL[satuanPeriode] ?? satuanPeriode} — rekonsiliasi otomatis, tak perlu cek mutasi manual`}
      headerAction={
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/keuangan/tipe-tagihan" variant="ghost" size="sm">Jenis & Buat Tagihan</LinkButton>
          <LinkButton href="/keuangan/riwayat" variant="ghost" size="sm">Riwayat Pembayaran →</LinkButton>
        </div>
      }
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      <form method="GET" className="mb-5 flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold">Periode:</label>
        <select name="periode" defaultValue={periode} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
          {daftarPeriode.length === 0 && <option value={periode}>{periode}</option>}
          {daftarPeriode.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="ghost">Tampilkan</Button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
        <StatCard label="Terkumpul" value={formatRupiah(terkumpul)} tone="good" />
        <StatCard label="Target periode ini" value={formatRupiah(target)} />
        <StatCard label="Belum bayar" value={String(belumBayarCount)} tone="warn" sub="siswa" />
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Progres pengumpulan — {periode}</h3>
          <span className="font-serif text-lg tabnum">{persentase}%</span>
        </div>
        <div className="h-3 bg-paper-sunken rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, persentase)}%` }} />
        </div>
      </Card>

      {breakdownTipe.length > 0 && (
        <Card className="mb-6">
          <CardHead title={`Breakdown per jenis tagihan — ${periode}`} subtitle="Komposisi target/terkumpul per jenis (SPP, buku, seragam, dst)" />
          <div className="flex flex-col gap-1.5">
            {breakdownTipe.map((b) => {
              const persenTipe = b.target > 0 ? Math.round((b.terkumpul / b.target) * 100) : 0;
              return (
                <div key={b.nama} className="flex items-center gap-3 text-sm border-b border-rule last:border-0 py-2">
                  <span className="flex-1 font-semibold">{b.nama}</span>
                  <span className="text-xs text-ink-soft">{b.count} tagihan</span>
                  <span className="tabnum text-xs w-40 text-right">{formatRupiah(b.terkumpul)} / {formatRupiah(b.target)}</span>
                  <span className="tabnum text-xs w-10 text-right text-ink-soft">{persenTipe}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {proyeksi.riwayat.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">Proyeksi keuangan</h3>
            <span className="text-[11px] text-ink-soft">Heuristik — rata-rata realisasi {proyeksi.riwayat.length} periode terakhir</span>
          </div>
          <div className="grid grid-cols-2 gap-3.5 mb-4 mt-3">
            <StatCard label="Proyeksi bulan depan" value={formatRupiah(proyeksi.proyeksiBulanDepan)} />
            <StatCard label="Proyeksi 12 bulan ke depan" value={formatRupiah(proyeksi.proyeksiTahunDepan)} />
          </div>
          <div className="flex items-end gap-2 h-28">
            {proyeksi.riwayat.map((r) => {
              const maxTarget = Math.max(...proyeksi.riwayat.map((x) => x.target), proyeksi.proyeksiBulanDepan, 1);
              return (
                <div key={r.periode} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-paper-sunken rounded-t relative" style={{ height: "100%" }}>
                    <div className="absolute bottom-0 w-full bg-primary/30 rounded-t" style={{ height: `${(r.target / maxTarget) * 100}%` }} />
                    <div className="absolute bottom-0 w-full bg-primary rounded-t" style={{ height: `${(r.terkumpul / maxTarget) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-ink-soft text-center leading-tight">{r.periode}</span>
                </div>
              );
            })}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="w-full bg-paper-sunken rounded-t relative border border-dashed border-primary/50" style={{ height: "100%" }}>
                <div
                  className="absolute bottom-0 w-full bg-accent/60 rounded-t"
                  style={{ height: `${(proyeksi.proyeksiBulanDepan / Math.max(...proyeksi.riwayat.map((x) => x.target), proyeksi.proyeksiBulanDepan, 1)) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-primary-deep font-semibold text-center leading-tight">Proyeksi</span>
            </div>
          </div>
          <p className="text-[11px] text-ink-soft mt-3">
            Batang gelap = terkumpul, batang muda = target periode itu, batang oranye putus-putus = perkiraan bulan depan. Bukan angka pasti — sekadar estimasi berbasis pola realisasi sebelumnya.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
