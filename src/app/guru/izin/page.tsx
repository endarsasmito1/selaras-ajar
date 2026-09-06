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

// Padanan `SA.statusPillClass()` di prototipe (assets/app.js) — Sakit=warn, Izin=blue (bukan
// "info"/primary, biar gak ketuker sama warna brand — lihat catatan --info-blue di globals.css).
const JENIS_TONE: Record<string, "warn" | "blue"> = { SAKIT: "warn", IZIN: "blue" };

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
              <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                {p.siswa.nama}
                <Pill tone={JENIS_TONE[p.jenis]}>{p.jenis === "SAKIT" ? "Sakit" : "Izin"}</Pill>
              </div>
              <div className="text-xs text-ink-soft mt-0.5">
                {formatTanggal(p.tanggal)} · diajukan {p.diajukanOleh.nama} · {p.keterangan}
                {p.lampiranUrl && (
                  <>
                    {" "}·{" "}
                    <a href={p.lampiranUrl} target="_blank" rel="noopener noreferrer" className="text-primary-deep hover:underline">
                      Lihat lampiran
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
            {/* Riwayat sengaja pakai tone "info" (bukan JENIS_TONE) utk pill jenis — beda dari
                daftar "Menunggu" di atas, konsisten dgn prototipe (guru/izin.html & ortu/izin.html
                sama-sama pakai `pill info` di tabel riwayat, `statusPillClass` cuma di daftar aktif). */}
            <div className="text-sm flex items-center gap-2 flex-wrap">
              {p.siswa.nama}
              <Pill tone="info">{p.jenis === "SAKIT" ? "Sakit" : "Izin"}</Pill>
              <span className="text-ink-soft">· {formatTanggal(p.tanggal)}</span>
            </div>
            <Pill tone={STATUS_TONE[p.status]}>{p.status === "DISETUJUI" ? "Disetujui" : "Ditolak"}</Pill>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
