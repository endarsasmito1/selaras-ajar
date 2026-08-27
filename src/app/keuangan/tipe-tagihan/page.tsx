import { getSession } from "@/lib/auth";
import { getSemuaTagihanTipe, getSemuaKelas, getDaftarSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, NAV_KEUANGAN, ROLE_LABEL } from "@/lib/nav";
import { Card, CardHead } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TargetTagihanFields } from "./TargetTagihanFields";

export default async function TipeTagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tipe_dibuat?: string; tagihan_dibuat?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [tipeList, kelasList, siswaList] = await Promise.all([
    getSemuaTagihanTipe(session.sekolahId),
    getSemuaKelas(session.sekolahId),
    getDaftarSiswa(session.sekolahId),
  ]);
  const jenjangOpsi = Array.from(new Set(kelasList.map((k) => k.tingkat)))
    .sort((a, b) => a - b)
    .map((t) => ({ value: String(t), label: `Tingkat ${t}` }));
  const kelasOpsi = kelasList.map((k) => ({ value: k.id, label: `Kelas ${k.nama}` }));
  const muridOpsi = siswaList.map((s) => ({ value: s.id, label: `${s.nama} — ${s.kelas.nama}` }));

  const groups = session.peran === "KEPALA_SEKOLAH" ? NAV_KEPSEK : NAV_KEUANGAN;

  return (
    <AppShell
      groups={groups}
      activeHref="/keuangan"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Jenis Tagihan & Buat Tagihan Baru"
      pageSubtitle="Bukan cuma SPP — buku, seragam, study tour, dsb bisa ditagihkan lewat sini"
      headerAction={<LinkButton href="/keuangan" variant="ghost" size="sm">← Kembali ke Keuangan</LinkButton>}
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.tipe_dibuat && <div className="mb-4"><Callout>✓ Jenis tagihan &quot;{sp.tipe_dibuat}&quot; ditambahkan.</Callout></div>}
      {sp.tagihan_dibuat && <div className="mb-4"><Callout>✓ {sp.tagihan_dibuat} tagihan baru dibuat.</Callout></div>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHead title="Jenis tagihan" subtitle="SPP, Uang Gedung, Buku, Seragam, Study Tour, dll" />
          <div className="flex flex-col gap-1.5 mb-4">
            {tipeList.map((t) => (
              <div key={t.id} className="text-sm border-b border-rule last:border-0 py-1.5">{t.nama}</div>
            ))}
            {tipeList.length === 0 && <p className="text-xs text-ink-soft">Belum ada jenis tagihan.</p>}
          </div>
          <form action="/api/tagihan-tipe" method="POST" className="flex items-center gap-2">
            <input name="nama" required placeholder="mis. Study Tour Kelas 6" className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            <Button type="submit" size="sm">+ Tambah</Button>
          </form>
        </Card>

        <Card>
          <CardHead title="Buat tagihan baru" subtitle="Sasar semua siswa, jenjang, kelas, atau murid tertentu (bisa pilih lebih dari satu)" />
          {tipeList.length === 0 ? (
            <p className="text-xs text-ink-soft">Tambah jenis tagihan dulu di sebelah kiri.</p>
          ) : (
            <form action="/api/tagihan/buat" method="POST" className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Jenis tagihan</label>
                <select name="tipeId" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                  {tipeList.map((t) => (<option key={t.id} value={t.id}>{t.nama}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Nominal</label>
                  <input type="number" name="nominal" required min={0} placeholder="mis. 250000" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Jatuh tempo</label>
                  <input type="date" name="jatuhTempo" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Periode (label bebas)</label>
                <input name="periode" required placeholder="mis. Study Tour 2026" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              </div>
              <TargetTagihanFields jenjangOpsi={jenjangOpsi} kelasOpsi={kelasOpsi} muridOpsi={muridOpsi} />
              <Button type="submit" className="self-start mt-1">Buat tagihan</Button>
            </form>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
