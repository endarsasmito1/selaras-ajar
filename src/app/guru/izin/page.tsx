import { getSession } from "@/lib/auth";
import { getKelasDiampu, getPengajuanIzinKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  DISETUJUI: "ok",
  DITOLAK: "warn",
  MENUNGGU: "neutral",
};

export default async function IzinGuruPage() {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const kelasIds = Array.from(new Set(penugasan.map((p) => p.kelasId)));
  const semuaPengajuan = (await Promise.all(kelasIds.map((k) => getPengajuanIzinKelas(k)))).flat();
  const menunggu = semuaPengajuan.filter((p) => p.status === "MENUNGGU");
  const sudahDiputuskan = semuaPengajuan.filter((p) => p.status !== "MENUNGGU");

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/izin"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Pengajuan Izin"
      pageSubtitle={`${menunggu.length} pengajuan menunggu keputusan`}
    >
      <h3 className="text-sm font-semibold mb-2">Menunggu keputusan</h3>
      <div className="flex flex-col gap-2 mb-6">
        {menunggu.length === 0 && <p className="text-sm text-ink-soft">Tidak ada pengajuan menunggu.</p>}
        {menunggu.map((p) => (
          <div key={p.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-medium">{p.siswa.nama} — {p.jenis === "SAKIT" ? "Sakit" : "Izin"}</div>
              <div className="text-xs text-ink-soft">{formatTanggal(p.tanggal)} · diajukan {p.diajukanOleh.nama} · {p.keterangan}</div>
            </div>
            <div className="flex gap-2">
              <form action="/api/izin/putuskan" method="POST">
                <input type="hidden" name="pengajuanId" value={p.id} />
                <input type="hidden" name="keputusan" value="DISETUJUI" />
                <Button type="submit" size="sm">Setujui</Button>
              </form>
              <form action="/api/izin/putuskan" method="POST">
                <input type="hidden" name="pengajuanId" value={p.id} />
                <input type="hidden" name="keputusan" value="DITOLAK" />
                <Button type="submit" size="sm" variant="ghost">Tolak</Button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold mb-2">Riwayat</h3>
      <div className="flex flex-col gap-2">
        {sudahDiputuskan.map((p) => (
          <div key={p.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">{p.siswa.nama} — {p.jenis === "SAKIT" ? "Sakit" : "Izin"} · {formatTanggal(p.tanggal)}</div>
            <Pill tone={STATUS_TONE[p.status]}>{p.status === "DISETUJUI" ? "Disetujui" : "Ditolak"}</Pill>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
