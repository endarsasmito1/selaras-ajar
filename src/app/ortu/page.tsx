import { getSession } from "@/lib/auth";
import { getAnakDariOrtu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_ORTU, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { ToastFromQuery } from "@/components/ui/ToastFromQuery";
import { formatRupiah, formatTanggal, getSalam } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  HADIR: "Hadir",
  SAKIT: "Sakit",
  IZIN: "Izin",
  ALPA: "Alpa",
};

export default async function OrtuDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const anakList = await getAnakDariOrtu(session.userId);

  // NTF-terkait, F-ortu (padanan ortu/index.html prototipe) — kalau >1 anak nunggak sekaligus,
  // konsolidasi jadi SATU banner emas "Bayar Semua Tagihan" drpd N tombol emas terpisah per anak
  // (aturan "1 CTA emas per layar"). Tombol per-anak turun jadi ghost begitu konsolidasi aktif —
  // lihat prop `redup` di bawah, dipasang ke tiap tombol "Bayar" individual.
  const anakNunggak = anakList.filter((a) => a.tagihan.some((t) => t.status === "BELUM_BAYAR"));
  const semuaTagihanBelumBayar = anakList.flatMap((a) => a.tagihan.filter((t) => t.status === "BELUM_BAYAR"));
  const totalTunggakan = semuaTagihanBelumBayar.reduce((s, t) => s + t.nominal, 0);
  const konsolidasi = anakNunggak.length > 1;

  return (
    <AppShell
      showBack={false}
      groups={NAV_ORTU}
      activeHref="/ortu"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${getSalam(new Date(), session.jenisKelamin)} ${session.nama}`}
      pageSubtitle={`Memantau ${anakList.length} anak`}
    >
      <ToastFromQuery />
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {/* ortu/index.html prototipe SENGAJA gak punya elemen pengumuman di beranda sama sekali
          (fokus penuh ke tagihan SPP per anak) — beda dari guru/murid/kepsek. Dihapus dari sini
          biar konsisten, bukan kelewat. */}
      {konsolidasi && (
        <div
          className="rounded-xl border border-[#e6d3a4] px-5 py-4 mb-5 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: "linear-gradient(160deg, var(--accent-tint), #faf3e2)" }}
        >
          <div>
            <h3 className="text-base m-0">{anakNunggak.length} anak punya tagihan SPP belum dibayar</h3>
            <p className="text-xs text-ink-soft mt-1">
              {anakNunggak.map((a) => a.nama).join(" & ")} — total {formatRupiah(totalTunggakan)}
            </p>
          </div>
          <form action="/api/tagihan/bayar" method="POST">
            {semuaTagihanBelumBayar.map((t) => (
              <input key={t.id} type="hidden" name="tagihanId" value={t.id} />
            ))}
            <ConfirmSubmitButton
              variant="accent"
              confirmMessage={`Bayar semua tagihan (${formatRupiah(totalTunggakan)}) via QRIS? Mencakup tagihan ${anakNunggak.map((a) => a.nama).join(" & ")}.`}
              labelKonfirmasi="Lanjut bayar"
            >
              Bayar Semua Tagihan ({formatRupiah(totalTunggakan)})
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
      <div className="flex flex-col gap-6">
        {anakList.map((anak) => (
          // Padanan prototipe: header (avatar+nama+link) & grid tiga-kolom di bawahnya SATU kartu
          // utuh per anak (bukan header lepas tanpa bingkai + 3 kartu kecil terpisah) — biar begitu
          // ortu py >1 anak, jelas mana milik siapa, bukan mengambang gak ada pembatas visual.
          <Card key={anak.id}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-primary-tint text-primary-deep flex items-center justify-center font-serif font-bold text-lg shrink-0">
                {anak.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1">
                <h3 className="text-lg">{anak.nama}</h3>
                <p className="text-xs text-ink-soft">
                  Kelas {anak.kelas.nama} · NISN {anak.nisn} · {anak.hubungan}
                </p>
              </div>
              <LinkButton href={`/ortu/performa/${anak.id}`} size="sm" variant="ghost">
                Lihat performa & ujian lengkap →
              </LinkButton>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-paper shadow-none">
                <h4 className="text-sm font-semibold mb-3">Kehadiran terakhir</h4>
                <div className="flex flex-col gap-1.5">
                  {anak.absensi.length === 0 && (
                    <p className="text-xs text-ink-soft">Belum ada data.</p>
                  )}
                  {anak.absensi.map((a) => (
                    <div key={a.id} className="flex justify-between text-xs">
                      <span className="text-ink-soft">{formatTanggal(a.tanggal)}</span>
                      <Pill tone={a.status === "HADIR" ? "ok" : a.status === "ALPA" ? "danger" : "warn"}>
                        {STATUS_LABEL[a.status]}
                      </Pill>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-paper shadow-none">
                <h4 className="text-sm font-semibold mb-3">Nilai terbaru</h4>
                <div className="flex flex-col gap-1.5">
                  {anak.nilai.length === 0 && (
                    <p className="text-xs text-ink-soft">Belum ada nilai.</p>
                  )}
                  {anak.nilai.map((n) => (
                    <div key={n.id} className="flex justify-between text-xs">
                      <span className="text-ink-soft truncate pr-2">{n.mapel.nama}</span>
                      <span className="tabnum font-semibold">{n.skor}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-paper shadow-none">
                <h4 className="text-sm font-semibold mb-3">Tagihan SPP</h4>
                <div className="flex flex-col gap-3">
                  {anak.tagihan.length === 0 && (
                    <p className="text-xs text-ink-soft">Belum ada tagihan.</p>
                  )}
                  {anak.tagihan.map((t) => (
                    <div key={t.id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-ink-soft">
                          {t.tipe.nama} — {t.periode}
                        </span>
                        <Pill tone={t.status === "LUNAS" ? "ok" : t.status === "CICILAN" ? "info" : "warn"}>
                          {t.status === "LUNAS" ? "Lunas" : t.status === "CICILAN" ? "Cicilan" : "Belum bayar"}
                        </Pill>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="tabnum text-sm font-semibold">
                          {formatRupiah(t.nominal)}
                        </span>
                        {t.status === "BELUM_BAYAR" && (
                          <form action="/api/tagihan/bayar" method="POST">
                            <input type="hidden" name="tagihanId" value={t.id} />
                            {/* Turun jadi ghost begitu banner "Bayar Semua" di atas aktif — jangan
                                2 CTA emas sekaligus di 1 layar (padanan aturan yg sama di prototipe). */}
                            <Button type="submit" size="sm" variant={konsolidasi ? "ghost" : "accent"}>
                              Bayar (QRIS)
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
