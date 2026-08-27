import { getRiwayatAbsensi } from "@/lib/data";
import { Card, StatCard } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

const STATUS_TONE: Record<string, "ok" | "warn" | "info" | "danger"> = {
  HADIR: "ok",
  SAKIT: "warn",
  IZIN: "info",
  ALPA: "danger",
};

/** 1.9 — riwayat kehadiran satu murid, dipakai lintas peran (murid/guru/ortu/kepsek) dari card "Kehadiran" di PerformaSiswaView. */
export async function RiwayatKehadiranSiswa({ kelasId, siswaId }: { kelasId: string; siswaId: string }) {
  const riwayat = await getRiwayatAbsensi(kelasId, { siswaId });
  const hadir = riwayat.filter((r) => r.status === "HADIR").length;
  const persenHadir = riwayat.length > 0 ? Math.round((hadir / riwayat.length) * 100) : null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-5">
        <StatCard label="Persen hadir" value={persenHadir !== null ? `${persenHadir}%` : "—"} tone="good" />
        <StatCard label="Total data" value={String(riwayat.length)} />
        <StatCard label="Sakit/Izin/Alpa" value={String(riwayat.length - hadir)} tone={riwayat.length - hadir > 0 ? "warn" : "default"} />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Tanggal</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {riwayat.map((r) => (
              <tr key={r.id} className="border-t border-rule">
                <td className="px-4 py-2.5 text-ink-soft">{formatTanggal(r.tanggal)}</td>
                <td className="px-4 py-2.5"><Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill></td>
                <td className="px-4 py-2.5 text-ink-soft">{r.catatan ?? "—"}</td>
              </tr>
            ))}
            {riwayat.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-soft text-xs">Belum ada data.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
