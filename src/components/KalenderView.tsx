import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatTanggal } from "@/lib/utils";
import type { getAgendaAkademik } from "@/lib/data";

const JENIS_TONE: Record<string, "warn" | "info" | "ok"> = {
  Libur: "warn",
  Ujian: "info",
  Kegiatan: "ok",
};
const JENIS_DOT: Record<string, string> = {
  Libur: "bg-warning",
  Ujian: "bg-primary",
  Kegiatan: "bg-success",
};
const JENIS_BG: Record<string, string> = {
  Libur: "bg-warning-tint",
  Ujian: "bg-primary-tint",
  Kegiatan: "bg-success-tint",
};
const HARI_HEADER = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** F-7 (1.6/1.7) — kalender akademik dgn highlight kategori. `kelola=true` (Kepsek/TU) tambah CRUD; peran lain read-only. */
export function KalenderView({
  agenda,
  bulanParam,
  kelola,
}: {
  agenda: Awaited<ReturnType<typeof getAgendaAkademik>>;
  bulanParam?: string;
  kelola: boolean;
}) {
  const now = new Date();
  const [tahun, bulanIdx] = (bulanParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);
  const bulanAktif = new Date(tahun, bulanIdx - 1, 1);

  const agendaByDate = new Map<string, typeof agenda>();
  for (const a of agenda) {
    const key = new Date(a.tanggal).toISOString().slice(0, 10);
    const cur = agendaByDate.get(key) ?? [];
    cur.push(a);
    agendaByDate.set(key, cur);
  }

  const firstOfMonth = new Date(tahun, bulanIdx - 1, 1);
  const daysInMonth = new Date(tahun, bulanIdx, 0).getDate();
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const cells: (Date | null)[] = [...Array(startOffset).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(tahun, bulanIdx - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const bulanLabel = bulanAktif.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const bulanPrev = new Date(tahun, bulanIdx - 2, 1);
  const bulanNext = new Date(tahun, bulanIdx, 1);
  const fmtBulan = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const akanDatang = agenda.filter((a) => new Date(a.tanggal) >= new Date()).slice(0, 8);

  return (
    <div>
      {kelola && (
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
      )}

      <div className="flex items-center justify-between mb-3">
        <a href={`?bulan=${fmtBulan(bulanPrev)}`} className="text-sm font-semibold text-primary-deep hover:underline">← Bulan lalu</a>
        <h3 className="font-serif text-lg">{bulanLabel}</h3>
        <a href={`?bulan=${fmtBulan(bulanNext)}`} className="text-sm font-semibold text-primary-deep hover:underline">Bulan depan →</a>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-ink-soft">
        {Object.entries(JENIS_DOT).map(([jenis, dot]) => (
          <span key={jenis} className="flex items-center gap-1.5"><span className={"w-2 h-2 rounded-full inline-block " + dot} /> {jenis}</span>
        ))}
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden mb-6">
        <div className="grid grid-cols-7 bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
          {HARI_HEADER.map((h) => (
            <div key={h} className="text-center px-2 py-2 font-bold">{h}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-rule">
            {week.map((day, di) => {
              const key = day?.toISOString().slice(0, 10);
              const events = key ? agendaByDate.get(key) ?? [] : [];
              const isToday = day && day.toDateString() === new Date().toDateString();
              return (
                <div key={di} className={"min-h-[76px] border-l border-rule first:border-l-0 p-1.5 " + (day ? "" : "bg-paper-sunken/30")}>
                  {day && (
                    <>
                      <div className={"text-xs tabnum " + (isToday ? "font-bold text-primary-deep" : "text-ink-soft")}>{day.getDate()}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {events.slice(0, 3).map((e) => (
                          <div key={e.id} className={"text-[10px] leading-tight px-1 py-0.5 rounded flex items-center gap-1 " + (JENIS_BG[e.jenis] ?? "")}>
                            <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + JENIS_DOT[e.jenis]} />
                            <span className="line-clamp-1">{e.judul}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold mb-2">Agenda mendatang {kelola && <span className="text-ink-soft font-normal">(bisa diedit/dihapus)</span>}</h3>
      <div className="flex flex-col gap-2">
        {akanDatang.length === 0 && <p className="text-sm text-ink-soft">Tidak ada agenda mendatang.</p>}
        {akanDatang.map((a) => (
          <div key={a.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="font-medium text-sm">{a.judul}</span>
              <span className="text-xs text-ink-soft ml-2">{formatTanggal(a.tanggal)}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Pill tone={JENIS_TONE[a.jenis] ?? "neutral"}>{a.jenis}</Pill>
              {kelola && (
                <>
                  <ConfirmDialog triggerLabel="Edit" title={`Edit agenda — ${a.judul}`}>
                    <form action="/api/agenda/update" method="POST" className="flex flex-col gap-3">
                      <input type="hidden" name="id" value={a.id} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Judul</label>
                        <input name="judul" defaultValue={a.judul} required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Tanggal</label>
                        <input type="date" name="tanggal" defaultValue={new Date(a.tanggal).toISOString().slice(0, 10)} required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Jenis</label>
                        <select name="jenis" defaultValue={a.jenis} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                          <option value="Kegiatan">Kegiatan</option>
                          <option value="Ujian">Ujian</option>
                          <option value="Libur">Libur</option>
                        </select>
                      </div>
                      <Button type="submit" size="sm">Simpan perubahan</Button>
                    </form>
                  </ConfirmDialog>
                  <ConfirmDialog triggerLabel="Hapus" title={`Hapus agenda "${a.judul}"?`}>
                    <form action="/api/agenda/hapus" method="POST" className="flex flex-col gap-3">
                      <input type="hidden" name="id" value={a.id} />
                      <p className="text-sm">Agenda ini akan hilang dari kalender secara permanen.</p>
                      <Button type="submit" size="sm" variant="ghost">Ya, hapus</Button>
                    </form>
                  </ConfirmDialog>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
