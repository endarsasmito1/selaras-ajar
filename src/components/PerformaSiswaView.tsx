import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { getPerformaSiswa } from "@/lib/data";

type Performa = NonNullable<Awaited<ReturnType<typeof getPerformaSiswa>>>;

export function PerformaSiswaView({ performa, ringkas = false }: { performa: Performa; ringkas?: boolean }) {
  const { siswa, perMapel, rataKeseluruhan, predikat, persenHadir, totalAbsensi, tugasSelesai, tugasTotal, ujianSelesai } = performa;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-primary-tint text-primary-deep flex items-center justify-center font-serif font-bold text-xl shrink-0">
          {siswa.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>
        <div>
          <h2 className="text-xl">{siswa.nama}</h2>
          <p className="text-xs text-ink-soft mt-0.5">Kelas {siswa.kelas.nama} · NISN {siswa.nisn}</p>
        </div>
        {predikat !== "-" && (
          <div className="ml-auto text-right">
            <Pill tone="ok">Predikat: {predikat}</Pill>
            <div className="text-xs text-ink-soft mt-1">Rata-rata {rataKeseluruhan}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <Card>
          <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Rata-rata nilai</div>
          <div className="font-serif text-2xl mt-1.5 text-primary-deep tabnum">{rataKeseluruhan ?? "—"}</div>
        </Card>
        <Card>
          <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Kehadiran</div>
          <div className="font-serif text-2xl mt-1.5 tabnum">{persenHadir !== null ? `${persenHadir}%` : "—"}</div>
          <div className="text-xs text-ink-soft mt-1">{totalAbsensi} data tercatat</div>
        </Card>
        <Card>
          <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Tugas selesai</div>
          <div className="font-serif text-2xl mt-1.5 tabnum">{tugasSelesai}<span className="text-sm">/{tugasTotal}</span></div>
        </Card>
        <Card>
          <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Ujian diikuti</div>
          <div className="font-serif text-2xl mt-1.5 tabnum">{ujianSelesai.length}</div>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Nilai per mata pelajaran</h3>
        {perMapel.length === 0 && <p className="text-xs text-ink-soft">Belum ada data nilai.</p>}
        <div className="flex flex-col gap-2">
          {perMapel.map((m) => (
            <div key={m.nama} className="flex items-center gap-3 border-b border-rule last:border-0 py-2">
              <span className="w-36 text-sm">{m.nama}</span>
              <span className="font-serif text-lg tabnum w-10">{m.rata}</span>
              <div className="flex-1 h-2 bg-paper-sunken rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, m.rata)}%` }} />
              </div>
              <span className={"text-xs font-semibold " + (m.tren > 1 ? "text-success" : m.tren < -1 ? "text-warning" : "text-ink-soft")}>
                {m.tren > 1 ? "▲" : m.tren < -1 ? "▼" : "→"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {!ringkas && (
        <Card className="mt-4">
          <h3 className="text-sm font-semibold mb-3">Riwayat ujian</h3>
          {ujianSelesai.length === 0 && <p className="text-xs text-ink-soft">Belum ada ujian.</p>}
          {ujianSelesai.map((u) => (
            <div key={u.id} className="flex justify-between text-sm border-b border-rule last:border-0 py-1.5">
              <span className="text-ink-soft">{u.ujian.judul} — {u.ujian.mapel.nama}</span>
              <span className="tabnum font-semibold">{u.nilaiTotal ?? "—"}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
