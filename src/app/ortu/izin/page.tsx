import { getSession } from "@/lib/auth";
import { getAnakDariOrtu, getPengajuanIzinOrtu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_ORTU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  DISETUJUI: "ok",
  DITOLAK: "warn",
  MENUNGGU: "neutral",
};

export default async function AjukanIzinPage() {
  const session = await getSession();
  if (!session) return null;

  const [anakList, riwayat] = await Promise.all([
    getAnakDariOrtu(session.userId),
    getPengajuanIzinOrtu(session.userId),
  ]);

  return (
    <AppShell
      groups={NAV_ORTU}
      activeHref="/ortu/izin"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ajukan Izin / Sakit"
      pageSubtitle="Menggantikan surat kertas & chat WA — wali kelas menerima & menyetujui di sistem"
    >
      <form action="/api/izin" method="POST" className="bg-paper-raised border border-rule rounded-xl p-5 mb-6 max-w-lg">
        <div className="flex flex-col gap-1.5 mb-3">
          <label className="text-xs font-semibold">Anak</label>
          <select name="siswaId" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
            {anakList.map((a) => (
              <option key={a.id} value={a.id}>{a.nama} — Kelas {a.kelas.nama}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tanggal</label>
            <input type="date" name="tanggal" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Jenis</label>
            <select name="jenis" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              <option value="SAKIT">Sakit</option>
              <option value="IZIN">Izin</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Keterangan</label>
          <textarea name="keterangan" required rows={2} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. Demam sejak semalam" />
        </div>
        <Button type="submit" size="sm">Kirim pengajuan</Button>
      </form>

      <h3 className="text-sm font-semibold mb-2">Riwayat pengajuan</h3>
      <div className="flex flex-col gap-2">
        {riwayat.length === 0 && <p className="text-sm text-ink-soft">Belum ada pengajuan.</p>}
        {riwayat.map((r) => (
          <div key={r.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm font-medium">{r.siswa.nama} — {r.jenis === "SAKIT" ? "Sakit" : "Izin"}</div>
              <div className="text-xs text-ink-soft">{formatTanggal(r.tanggal)} · {r.keterangan}</div>
            </div>
            <Pill tone={STATUS_TONE[r.status]}>{r.status === "MENUNGGU" ? "Menunggu" : r.status === "DISETUJUI" ? "Disetujui" : "Ditolak"}</Pill>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
