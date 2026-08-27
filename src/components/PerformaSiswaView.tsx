import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { getPerformaSiswa } from "@/lib/data";

type Performa = NonNullable<Awaited<ReturnType<typeof getPerformaSiswa>>>;

/**
 * 1.9 — card jadi link kalau href tersedia, kalau tidak tetap card statis (Card biasa).
 * 1.11, diperbaiki (ditemukan saat testing): keempat kartu ringkasan terlihat identik meski cuma
 * sebagian yang bisa diklik — tambah label "Lihat detail →" persisten (bukan cuma hover) supaya
 * kartu yang bisa diklik jelas beda dari yang statis, termasuk di layar sentuh.
 */
function StatBox({ href, children }: { href?: string; children: React.ReactNode }) {
  if (href) {
    return (
      <a
        href={href}
        className="block bg-paper-raised border border-rule rounded-xl p-5 shadow-sm hover:border-primary hover:shadow-md transition-shadow"
      >
        {children}
        <div className="text-[10px] font-semibold text-primary-deep mt-2">Lihat detail →</div>
      </a>
    );
  }
  return <Card>{children}</Card>;
}

export function PerformaSiswaView({
  performa,
  ringkas = false,
  basePath = "/guru/ujian",
  hrefKehadiran,
  hrefTugas,
  hrefUjianList,
}: {
  performa: Performa;
  ringkas?: boolean;
  /** Prefix href riwayat ujian — "/guru/ujian", "/murid/ujian", atau "/ortu/ujian" (butuh siswaId di path). */
  basePath?: string;
  /** 1.9 — kalau diisi, card ringkasan terkait jadi bisa diklik ke halaman riwayat. */
  hrefKehadiran?: string;
  hrefTugas?: string;
  hrefUjianList?: string;
}) {
  const { siswa, perMapel, rataKeseluruhan, predikat, persenHadir, totalAbsensi, tugasSelesai, tugasTotal, ujianSelesai, ujianTotal } = performa;
  const hrefUjian = (ujianId: string) =>
    basePath === "/ortu/ujian" ? `${basePath}/${siswa.id}/${ujianId}` : `${basePath}/${ujianId}`;

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
        <StatBox href={hrefKehadiran}>
          <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Kehadiran</div>
          <div className="font-serif text-2xl mt-1.5 tabnum">{persenHadir !== null ? `${persenHadir}%` : "—"}</div>
          <div className="text-xs text-ink-soft mt-1">{totalAbsensi} data tercatat</div>
        </StatBox>
        <StatBox href={hrefTugas}>
          <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Tugas selesai</div>
          <div className="font-serif text-2xl mt-1.5 tabnum">{tugasSelesai}<span className="text-sm">/{tugasTotal}</span></div>
        </StatBox>
        <StatBox href={hrefUjianList}>
          <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Ujian diikuti</div>
          <div className="font-serif text-2xl mt-1.5 tabnum">{ujianSelesai.length}<span className="text-sm">/{ujianTotal}</span></div>
        </StatBox>
      </div>

      <Card>
        <h3 className="text-sm font-semibold mb-1">Nilai per mata pelajaran</h3>
        <p className="text-xs text-ink-soft mb-3">Klik satu mapel untuk lihat riwayat ujiannya (1.6 — tak lagi section terpisah)</p>
        {perMapel.length === 0 && <p className="text-xs text-ink-soft">Belum ada data nilai.</p>}
        <div className="flex flex-col gap-1">
          {perMapel.map((m) => {
            const ujianMapel = ujianSelesai.filter((u) => u.ujian.mapel.nama === m.nama);
            return (
              <details key={m.nama} className="border-b border-rule last:border-0 py-2">
                <summary className="flex items-center gap-3 cursor-pointer list-none">
                  <span className="w-36 text-sm">{m.nama}</span>
                  <span className="font-serif text-lg tabnum w-10">{m.rata}</span>
                  <div className="flex-1 h-2 bg-paper-sunken rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, m.rata)}%` }} />
                  </div>
                  <span className={"text-xs font-semibold " + (m.tren > 1 ? "text-success" : m.tren < -1 ? "text-warning" : "text-ink-soft")}>
                    {m.tren > 1 ? "▲" : m.tren < -1 ? "▼" : "→"}
                  </span>
                  <span className="text-[10px] text-ink-soft">{ujianMapel.length} ujian</span>
                </summary>
                <div className="pl-1 mt-2 flex flex-col gap-1">
                  {ujianMapel.length === 0 && <p className="text-xs text-ink-soft">Belum ada ujian {m.nama}.</p>}
                  {ujianMapel.slice(0, ringkas ? 5 : undefined).map((u) => (
                    <a
                      key={u.id}
                      href={hrefUjian(u.ujian.id)}
                      className="flex justify-between text-xs border-b border-rule last:border-0 py-1.5 hover:bg-paper -mx-1 px-1 rounded"
                    >
                      <span className="text-ink-soft">{u.ujian.judul}</span>
                      <span className="tabnum font-semibold text-primary-deep">
                        {ringkas && !u.koreksiDikonfirmasi ? "menunggu koreksi" : (u.nilaiTotal ?? "—")}
                      </span>
                    </a>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
