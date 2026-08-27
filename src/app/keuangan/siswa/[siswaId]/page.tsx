import { getSession } from "@/lib/auth";
import { getRiwayatTagihanSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, NAV_KEUANGAN, ROLE_LABEL } from "@/lib/nav";
import { Card, StatCard } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function RiwayatTagihanSiswaPage({ params }: { params: Promise<{ siswaId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { siswaId } = await params;

  const data = await getRiwayatTagihanSiswa(siswaId, session.sekolahId);
  if (!data) notFound();
  const { siswa, tagihan } = data;

  const lunas = tagihan.filter((t) => t.status === "LUNAS");
  const totalTerbayar = lunas.reduce((s, t) => s + t.nominal, 0);
  const totalTagihan = tagihan.reduce((s, t) => s + t.nominal, 0);
  const belumBayar = tagihan.filter((t) => t.status === "BELUM_BAYAR");

  const groups = session.peran === "KEPALA_SEKOLAH" ? NAV_KEPSEK : NAV_KEUANGAN;

  return (
    <AppShell
      groups={groups}
      activeHref="/keuangan"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Riwayat Pembayaran — ${siswa.nama}`}
      pageSubtitle={`Kelas ${siswa.kelas.nama} · NISN ${siswa.nisn}`}
      headerAction={<LinkButton href="/keuangan" variant="ghost" size="sm">← Kembali</LinkButton>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Total tagihan" value={formatRupiah(totalTagihan)} />
        <StatCard label="Sudah terbayar" value={formatRupiah(totalTerbayar)} tone="good" />
        <StatCard label="Belum bayar" value={String(belumBayar.length)} tone={belumBayar.length > 0 ? "warn" : "default"} sub="tagihan" />
        <StatCard label="Total riwayat" value={String(tagihan.length)} sub="tagihan" />
      </div>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Seluruh riwayat tagihan (semua periode & jenis)</h3>
        <div className="flex flex-col gap-1.5">
          {tagihan.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-2">
              <div>
                <span className="font-semibold">{t.tipe.nama}</span>
                <span className="text-ink-soft"> — {t.periode}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabnum">{formatRupiah(t.nominal)}</span>
                <Pill tone={t.status === "LUNAS" ? "ok" : t.status === "CICILAN" ? "info" : "warn"}>
                  {t.status === "LUNAS" ? "Lunas" : t.status === "CICILAN" ? "Cicilan" : "Belum bayar"}
                </Pill>
                {t.dibayarPada && <span className="text-xs text-ink-soft w-28 text-right">{formatTanggal(t.dibayarPada)}</span>}
              </div>
            </div>
          ))}
          {tagihan.length === 0 && <p className="text-xs text-ink-soft">Belum ada tagihan untuk siswa ini.</p>}
        </div>
      </Card>
    </AppShell>
  );
}
