import { getSession } from "@/lib/auth";
import { getPerformaSiswa, getAnakDariOrtu, getCatatanSiswaVisibleTo, getPrestasiSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_ORTU, ROLE_LABEL } from "@/lib/nav";
import { PerformaSiswaView } from "@/components/PerformaSiswaView";
import { Card } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { formatTanggal } from "@/lib/utils";

export default async function PerformaMuridOrtuPage({ params }: { params: Promise<{ siswaId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { siswaId } = await params;

  const anakList = await getAnakDariOrtu(session.userId);
  const berhak = anakList.some((a) => a.id === siswaId);
  if (!berhak) {
    return (
      <AppShell groups={NAV_ORTU} activeHref="/ortu" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Performa Anak">
        <Callout tone="warn">Data ini bukan milik anak Anda.</Callout>
      </AppShell>
    );
  }

  const performa = await getPerformaSiswa(siswaId);
  if (!performa) return null;

  const [catatan, prestasi] = await Promise.all([
    getCatatanSiswaVisibleTo(siswaId, { penggunaId: session.userId, peran: session.peran, isWaliKelasSiswa: false }),
    getPrestasiSiswa(siswaId),
  ]);

  return (
    <AppShell
      groups={NAV_ORTU}
      activeHref="/ortu"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Performa Anak"
      pageSubtitle="Versi ringkas — sama sumber datanya dengan yang dilihat guru"
    >
      <PerformaSiswaView
        performa={performa}
        ringkas
        basePath="/ortu/ujian"
        hrefKehadiran={`/ortu/performa/${siswaId}/kehadiran`}
      />

      <Card className="mt-4">
        <h3 className="text-sm font-semibold mb-3">Prestasi & Penghargaan</h3>
        {prestasi.length === 0 && <p className="text-xs text-ink-soft">Belum ada catatan prestasi.</p>}
        <div className="flex flex-col gap-2">
          {prestasi.map((p) => (
            <div key={p.id} className="border-b border-rule last:border-0 pb-2">
              <div className="text-sm font-semibold">{p.judul}</div>
              <div className="text-xs text-ink-soft">{formatTanggal(p.tanggal)}</div>
              {p.keterangan && <p className="text-xs mt-1">{p.keterangan}</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h3 className="text-sm font-semibold mb-1">Catatan dari Guru</h3>
        <p className="text-xs text-ink-soft mb-3">
          Gabungan catatan dari semua guru yang mengajar {performa.siswa.nama} — bahan evaluasi & pembelajaran, bukan untuk anak lihat.
        </p>
        {catatan.length === 0 && <p className="text-xs text-ink-soft">Belum ada catatan dari guru.</p>}
        <div className="flex flex-col gap-2">
          {catatan.map((c) => (
            <div key={c.id} className="bg-paper border border-rule rounded-lg p-3">
              <span className="text-xs font-semibold">
                {c.penulis.nama}{c.mapelKonteks ? ` — ${c.mapelKonteks}` : ""} <span className="text-ink-soft font-normal">· {formatTanggal(c.createdAt)}</span>
              </span>
              <p className="text-sm mt-1">{c.isi}</p>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
