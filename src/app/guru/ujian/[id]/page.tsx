import { getSession } from "@/lib/auth";
import { getUjianDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { LinkButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { StatCard } from "@/components/ui/Card";

const STATUS_LABEL: Record<string, string> = {
  BELUM_MULAI: "Belum mulai",
  MENGERJAKAN: "Mengerjakan",
  SELESAI: "Selesai",
  AUTO_SUBMIT: "Auto-submit",
};

function fmtJam(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default async function HasilUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const ujian = await getUjianDetail(id);
  if (!ujian) return null;

  const selesai = ujian.pengerjaan.filter((p) => p.status === "SELESAI" || p.status === "AUTO_SUBMIT");
  const nilaiList = selesai.filter((p) => p.nilaiTotal !== null).map((p) => p.nilaiTotal as number);
  const rata = nilaiList.length > 0 ? Math.round((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) * 10) / 10 : null;

  const esaiPerlu = ujian.pengerjaan.flatMap((p) =>
    p.jawaban.filter((j) => j.skor === null && ujian.soal.find((s) => s.soalId === j.soalId)?.soal.jenis === "ESAI")
  ).length;

  // Distribusi nilai
  const bucket = [0, 0, 0, 0, 0]; // <60, 60-69, 70-79, 80-89, 90-100
  for (const n of nilaiList) {
    if (n < 60) bucket[0]++;
    else if (n < 70) bucket[1]++;
    else if (n < 80) bucket[2]++;
    else if (n < 90) bucket[3]++;
    else bucket[4]++;
  }
  const maxBucket = Math.max(1, ...bucket);

  // Soal tersulit: hitung % salah per soal (hanya PG & singkat yang auto-graded)
  const soalStat = ujian.soal
    .filter((us) => us.soal.jenis !== "ESAI")
    .map((us) => {
      const jawabanSoal = ujian.pengerjaan.flatMap((p) => p.jawaban.filter((j) => j.soalId === us.soalId && j.benar !== null));
      const salah = jawabanSoal.filter((j) => j.benar === false).length;
      const persenSalah = jawabanSoal.length > 0 ? Math.round((salah / jawabanSoal.length) * 100) : 0;
      return { pertanyaan: us.soal.pertanyaan, persenSalah, total: jawabanSoal.length };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.persenSalah - a.persenSalah)
    .slice(0, 3);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${ujian.judul} — ${ujian.kelas.nama}`}
      pageSubtitle={`${ujian.mapel.nama} · ${ujian.status === "PUBLISHED" ? "Terbit" : "Draft"}`}
      headerAction={
        esaiPerlu > 0 ? (
          <LinkButton href={`/guru/ujian/${ujian.id}/nilai-esai`} size="sm" variant="accent">
            Nilai {esaiPerlu} esai
          </LinkButton>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">🕐 {ujian.jamMulai ? new Date(ujian.jamMulai).toLocaleString("id-ID") : "Belum dijadwalkan"}</span>
        {ujian.acakSoal && <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">🔀 Urutan soal diacak</span>}
        {ujian.acakJawaban && <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">🔀 Pilihan jawaban diacak</span>}
        {ujian.sekaliAkses && <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">1️⃣ Sekali akses</span>}
        <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">⚠ Keluar = auto-submit</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Sudah mengerjakan" value={`${selesai.length}/${ujian.pengerjaan.length}`} />
        <StatCard label="Rata-rata" value={rata !== null ? String(rata) : "—"} tone="good" />
        <StatCard label="Perlu dinilai (esai)" value={String(esaiPerlu)} tone={esaiPerlu > 0 ? "warn" : "default"} />
        <StatCard label="Auto-submit" value={String(ujian.pengerjaan.filter((p) => p.status === "AUTO_SUBMIT").length)} />
      </div>

      <div className="grid md:grid-cols-[1.5fr_1fr] gap-4">
        <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-rule">
            <h3 className="text-sm font-semibold">Daftar murid</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2 font-bold">Nama</th>
                <th className="text-left px-4 py-2 font-bold">Mulai</th>
                <th className="text-left px-4 py-2 font-bold">Selesai</th>
                <th className="text-left px-4 py-2 font-bold">Nilai</th>
                <th className="text-left px-4 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {ujian.pengerjaan.map((p) => (
                <tr key={p.id} className="border-t border-rule">
                  <td className="px-4 py-2 font-medium">{p.siswa.nama}</td>
                  <td className="px-4 py-2 tabnum text-ink-soft">{fmtJam(p.waktuMulai)}</td>
                  <td className="px-4 py-2 tabnum text-ink-soft">{fmtJam(p.waktuSelesai)}</td>
                  <td className="px-4 py-2 tabnum">{p.nilaiTotal !== null ? p.nilaiTotal : "—"}</td>
                  <td className="px-4 py-2">
                    <Pill tone={p.status === "SELESAI" ? "ok" : p.status === "AUTO_SUBMIT" ? "warn" : p.status === "MENGERJAKAN" ? "info" : "neutral"}>
                      {STATUS_LABEL[p.status]}
                    </Pill>
                  </td>
                </tr>
              ))}
              {ujian.pengerjaan.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-ink-soft text-xs">Belum ada murid yang mengerjakan.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-paper-raised border border-rule rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Analisis</h3>
          <p className="text-[11px] uppercase tracking-wider text-ink-soft font-bold mb-1.5">Distribusi nilai</p>
          <div className="flex items-end gap-2 h-24 mb-4">
            {["<60", "60-69", "70-79", "80-89", "90-100"].map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full bg-primary rounded-t" style={{ height: `${(bucket[i] / maxBucket) * 100}%`, minHeight: bucket[i] > 0 ? "6px" : "0" }} />
                <span className="text-[10px] text-ink-soft">{label}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-rule pt-3">
            <p className="text-[11px] uppercase tracking-wider text-ink-soft font-bold mb-2">Soal tersulit</p>
            {soalStat.length === 0 && <p className="text-xs text-ink-soft">Belum ada data.</p>}
            {soalStat.map((s, i) => (
              <div key={i} className="flex justify-between items-start gap-2 mb-2 text-xs">
                <span className="line-clamp-1">{s.pertanyaan}</span>
                <span className="text-warning font-semibold whitespace-nowrap">{s.persenSalah}% salah</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
