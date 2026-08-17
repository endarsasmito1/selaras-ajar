import { getSession } from "@/lib/auth";
import { getAgendaAkademik } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

const JENIS_TONE: Record<string, "warn" | "info" | "ok"> = {
  Libur: "warn",
  Ujian: "info",
  Kegiatan: "ok",
};

export default async function KalenderPage() {
  const session = await getSession();
  if (!session) return null;

  const agenda = await getAgendaAkademik(session.sekolahId);
  const akanDatang = agenda.filter((a) => new Date(a.tanggal) >= new Date());
  const lampau = agenda.filter((a) => new Date(a.tanggal) < new Date());

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/kalender"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kalender Akademik"
      pageSubtitle="Satu sumber kebenaran hari libur, ujian, dan kegiatan untuk semua peran"
    >
      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Tambah agenda</summary>
        <form action="/api/agenda" method="POST" className="mt-4 grid md:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold">Judul</label>
            <input name="judul" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tanggal</label>
            <input type="date" name="tanggal" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Jenis</label>
            <select name="jenis" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              <option value="Kegiatan">Kegiatan</option>
              <option value="Ujian">Ujian</option>
              <option value="Libur">Libur</option>
            </select>
          </div>
          <Button type="submit" size="sm" className="md:col-span-4 w-fit">Tambah agenda</Button>
        </form>
      </details>

      <h3 className="text-sm font-semibold mb-2">Akan datang</h3>
      <div className="flex flex-col gap-2 mb-6">
        {akanDatang.length === 0 && <p className="text-sm text-ink-soft">Tidak ada agenda mendatang.</p>}
        {akanDatang.map((a) => (
          <div key={a.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-medium text-sm">{a.judul}</span>
              <span className="text-xs text-ink-soft ml-2">{formatTanggal(a.tanggal)}</span>
            </div>
            <Pill tone={JENIS_TONE[a.jenis] ?? "neutral"}>{a.jenis}</Pill>
          </div>
        ))}
      </div>

      {lampau.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-2">Sudah lewat</h3>
          <div className="flex flex-col gap-2 opacity-60">
            {lampau.map((a) => (
              <div key={a.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{a.judul}</span>
                  <span className="text-xs text-ink-soft ml-2">{formatTanggal(a.tanggal)}</span>
                </div>
                <Pill tone="neutral">{a.jenis}</Pill>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
