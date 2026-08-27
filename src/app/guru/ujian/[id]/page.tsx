import { getSession } from "@/lib/auth";
import { getUjianDetail, getSiswaKelas, getKelasDiampu } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { LinkButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { StatCard } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { sanitizeSoalHtml } from "@/lib/sanitize-html";
import { formatTanggalWaktu } from "@/lib/utils";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

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

export default async function HasilUjianPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; komentar_disimpan?: string; koreksi_dikonfirmasi?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;

  const ujian = await getUjianDetail(id, session.sekolahId);
  if (!ujian) notFound();

  // 1.23 — "share by link/email/WA": link tetap ke halaman ujian di app ini (murid tetap wajib
  // login), WA/email cuma cara ngirim URL-nya. `x-forwarded-proto` dipakai supaya benar di balik
  // reverse proxy (produksi biasanya https meski origin internal http).
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = hdrs.get("host");
  const ujianUrl = `${proto}://${host}/murid/ujian/${ujian.id}`;

  // Kelas lain yg diampu guru ini utk mapel yg sama, blm jadi penerima ujian ini — target valid "Duplikat ke kelas lain".
  const penugasanGuru = await getKelasDiampu(session.userId);
  const kelasSudahAda = new Set(ujian.kelas.map((uk) => uk.kelasId));
  const kelasTargetOpsi = Array.from(
    new Map(
      penugasanGuru
        .filter((p) => p.mapelId === ujian.mapelId && !kelasSudahAda.has(p.kelasId))
        .map((p) => [p.kelas.id, p.kelas])
    ).values()
  );

  // U-22 (1.7, diminta eksplisit): penyebut "sudah menyelesaikan" = total murid aktif di kelas
  // penerima ujian ini, bukan cuma yang sudah membuka ujian (jumlah baris UjianPengerjaan).
  const totalMuridPenerima = await prisma.siswa.count({
    where: { kelasId: { in: ujian.kelas.map((k) => k.kelasId) }, aktif: true },
  });

  // 1.10, diminta eksplisit: tampilkan SEMUA murid penerima ujian ini di daftar, termasuk yang
  // belum sama sekali membuka ujian (tak punya baris UjianPengerjaan) — bukan cuma yang sudah mulai.
  const semuaSiswaPenerima = (
    await Promise.all(ujian.kelas.map((uk) => getSiswaKelas(uk.kelasId)))
  ).flat();
  const siswaSudahAdaBaris = new Set(ujian.pengerjaan.map((p) => p.siswaId));
  const barisBelumMulai = semuaSiswaPenerima
    .filter((s) => !siswaSudahAdaBaris.has(s.id))
    .map((s) => ({
      id: `belum-${s.id}`,
      siswaId: s.id,
      siswa: s,
      status: "BELUM_MULAI" as const,
      waktuMulai: null,
      waktuSelesai: null,
      nilaiTotal: null,
      koreksiDikonfirmasi: false,
      jawaban: [] as { soalId: string; skor: number | null; benar: boolean | null; jawabanPG: number | null }[],
    }));
  const semuaBarisMurid = [...ujian.pengerjaan, ...barisBelumMulai].sort((a, b) => a.siswa.nama.localeCompare(b.siswa.nama));

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

  // U-23: distribusi jawaban per soal (bukan cuma "soal tersulit" sbg satu angka) — hanya
  // PG & jawaban singkat yang auto-graded (bisa dihitung benar/salah objektif).
  const soalStat = ujian.soal
    .filter((us) => us.soal.jenis !== "ESAI")
    .map((us) => {
      const jawabanSoal = ujian.pengerjaan.flatMap((p) => p.jawaban.filter((j) => j.soalId === us.soalId && j.benar !== null));
      const salah = jawabanSoal.filter((j) => j.benar === false).length;
      const persenSalah = jawabanSoal.length > 0 ? Math.round((salah / jawabanSoal.length) * 100) : 0;
      let sebaranOpsi: { opsi: string; jumlah: number }[] | null = null;
      if (us.soal.jenis === "PILIHAN_GANDA" && us.soal.opsi) {
        const opsiArr: string[] = JSON.parse(us.soal.opsi);
        sebaranOpsi = opsiArr.map((teks, idx) => ({
          opsi: teks,
          jumlah: jawabanSoal.filter((j) => j.jawabanPG === idx).length,
        }));
      }
      return { pertanyaan: us.soal.pertanyaan, persenSalah, total: jawabanSoal.length, sebaranOpsi };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.persenSalah - a.persenSalah);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${ujian.judul} — ${ujian.kelas.map((uk) => uk.kelas.nama).join(", ")}`}
      pageSubtitle={`${ujian.mapel.nama} · ${ujian.status === "PUBLISHED" ? "Terbit" : "Draft"}`}
      headerAction={
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/guru/ujian/${ujian.id}/soal`} size="sm" variant="ghost">
            Lihat Soal
          </LinkButton>
          {/* 1.23 — bug ditemukan saat testing manual: sebelum ini, /pengaturan (mode hasil, durasi,
              jam buka-tutup, acak) cuma ke-link dari alur bikin-ujian-baru (edit -> pengaturan ->
              konfirmasi) — begitu status PUBLISHED, gak ada jalan UI balik ke sana sama sekali,
              padahal rute & API-nya sendiri gak ada guard status (tetap bisa dipakai). */}
          <LinkButton href={`/guru/ujian/${ujian.id}/pengaturan`} size="sm" variant="ghost">
            Pengaturan
          </LinkButton>
          {esaiPerlu > 0 && (
            <LinkButton href={`/guru/ujian/${ujian.id}/nilai-esai`} size="sm" variant="accent">
              Nilai {esaiPerlu} esai
            </LinkButton>
          )}
        </div>
      }
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.komentar_disimpan && <div className="mb-4"><Callout tone="info">Komentar tersimpan.</Callout></div>}
      {sp.koreksi_dikonfirmasi && <div className="mb-4"><Callout tone="info">Koreksi dikonfirmasi — nilai & komentar sekarang tampil ke murid/ortu.</Callout></div>}

      {ujian.status === "PUBLISHED" && (
        <div className="bg-paper-raised border border-rule rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold mb-2">🔗 Bagikan ujian</h3>
          <p className="text-xs text-ink-soft mb-2.5">Murid tetap perlu login ke akun sekolahnya — link ini cuma jalan pintas ke halaman ujiannya.</p>
          <ShareLinkButton url={ujianUrl} judul={ujian.judul} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {ujian.kelas.map((uk) => (
          <span key={uk.id} className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">
            🕐 {uk.kelas.nama}: {uk.jamMulai ? formatTanggalWaktu(uk.jamMulai) : "belum dijadwalkan"}
            {uk.jamSelesai ? ` – ${new Date(uk.jamSelesai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".")}` : ""}
          </span>
        ))}
        {ujian.acakSoal && <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">🔀 Urutan soal diacak</span>}
        {ujian.acakJawaban && <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">🔀 Pilihan jawaban diacak</span>}
        {ujian.sekaliAkses && <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">1️⃣ Sekali akses</span>}
        <span className="text-xs bg-paper-raised border border-rule rounded-full px-3 py-1.5">⚠ Keluar = auto-submit</span>
      </div>

      {kelasTargetOpsi.length > 0 && (
        <details className="bg-paper-raised border border-rule rounded-xl p-4 mb-6">
          <summary className="cursor-pointer font-semibold text-sm">↻ Duplikat ke kelas lain</summary>
          <p className="text-xs text-ink-soft mt-1.5 mb-3">
            Bikin salinan ujian ini (soal sama) sbg draft baru — pilih 1 atau lebih kelas lain yang kamu ampu, opsional ganti judulnya dulu. Hasil/nilai ujian ini tak ikut tersalin/terpengaruh.
          </p>
          <form action="/api/ujian/duplikat" method="POST" className="flex flex-col gap-3">
            <input type="hidden" name="ujianId" value={ujian.id} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Judul salinan</label>
              <input
                name="judulBaru"
                defaultValue={`${ujian.judul} (salinan)`}
                className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Kelas target (bisa pilih lebih dari satu)</label>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto bg-paper border border-rule rounded-lg p-2.5">
                {kelasTargetOpsi.map((k) => (
                  <label key={k.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="kelasTargetIds" value={k.id} />
                    {k.nama}
                  </label>
                ))}
              </div>
            </div>
            <ConfirmSubmitButton size="sm" confirmMessage="Duplikat ujian ini (beserta semua soalnya) jadi draft baru untuk kelas terpilih?" className="self-start">
              Duplikat
            </ConfirmSubmitButton>
          </form>
        </details>
      )}

      <h3 className="text-[11px] uppercase tracking-wider text-ink-soft font-bold mb-2.5">Ringkasan</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6 pb-6 border-b border-rule">
        <StatCard label="Sudah menyelesaikan" value={`${selesai.length}/${totalMuridPenerima}`} />
        <StatCard label="Rata-rata" value={rata !== null ? String(rata) : "—"} tone="good" />
        <StatCard label="Perlu dinilai (esai)" value={String(esaiPerlu)} tone={esaiPerlu > 0 ? "warn" : "default"} />
        <StatCard label="Auto-submit" value={String(ujian.pengerjaan.filter((p) => p.status === "AUTO_SUBMIT").length)} />
      </div>

      <div className="grid md:grid-cols-[1.5fr_1fr] gap-4">
        <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
          <div className="px-5 py-3.5 border-b border-rule">
            <h3 className="text-sm font-semibold">Daftar murid</h3>
            <p className="text-xs text-ink-soft mt-0.5">Semua murid penerima ujian ini, termasuk yang belum mulai (1.10)</p>
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
              {semuaBarisMurid.map((p) => {
                const sudahSelesai = p.status === "SELESAI" || p.status === "AUTO_SUBMIT";
                const adaEsai = p.jawaban.some(
                  (j) => ujian.soal.find((s) => s.soalId === j.soalId)?.soal.jenis === "ESAI"
                );
                const menungguKonfirmasi = sudahSelesai && adaEsai && !p.koreksiDikonfirmasi;
                return (
                  <tr key={p.id} className="border-t border-rule hover:bg-paper">
                    <td className="px-4 py-2 font-medium">
                      {sudahSelesai ? (
                        <a href={`/guru/ujian/${ujian.id}/murid/${p.id}`} className="text-primary-deep hover:underline">
                          {p.siswa.nama}
                        </a>
                      ) : (
                        p.siswa.nama
                      )}
                    </td>
                    <td className="px-4 py-2 tabnum text-ink-soft">{fmtJam(p.waktuMulai)}</td>
                    <td className="px-4 py-2 tabnum text-ink-soft">{fmtJam(p.waktuSelesai)}</td>
                    <td className="px-4 py-2 tabnum">{p.nilaiTotal !== null ? p.nilaiTotal : "—"}</td>
                    <td className="px-4 py-2">
                      {menungguKonfirmasi ? (
                        <Pill tone="warn">Menunggu konfirmasi</Pill>
                      ) : sudahSelesai && adaEsai && p.koreksiDikonfirmasi ? (
                        <Pill tone="ok">✓ Sudah dikoreksi</Pill>
                      ) : (
                        <Pill tone={p.status === "SELESAI" ? "ok" : p.status === "AUTO_SUBMIT" ? "warn" : p.status === "MENGERJAKAN" ? "info" : "neutral"}>
                          {STATUS_LABEL[p.status]}
                        </Pill>
                      )}
                    </td>
                  </tr>
                );
              })}
              {semuaBarisMurid.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-ink-soft text-xs">Belum ada murid penerima ujian ini.</td></tr>
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
            <p className="text-[11px] uppercase tracking-wider text-ink-soft font-bold mb-2">
              Distribusi jawaban per soal — paling banyak salah dulu
            </p>
            {soalStat.length === 0 && <p className="text-xs text-ink-soft">Belum ada data.</p>}
            {soalStat.map((s, i) => (
              <details key={i} className="mb-2">
                <summary className="flex justify-between items-start gap-2 text-xs cursor-pointer">
                  <span className="line-clamp-1" dangerouslySetInnerHTML={{ __html: sanitizeSoalHtml(s.pertanyaan) }} />
                  <span className="text-warning font-semibold whitespace-nowrap">{s.persenSalah}% salah</span>
                </summary>
                {s.sebaranOpsi && (
                  <div className="mt-1.5 pl-2 flex flex-col gap-1">
                    {s.sebaranOpsi.map((o, oi) => (
                      <div key={oi} className="flex items-center justify-between text-[11px] text-ink-soft">
                        <span>{o.opsi}</span>
                        <span className="tabnum">{o.jumlah}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
