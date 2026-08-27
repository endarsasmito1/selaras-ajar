import { getSession } from "@/lib/auth";
import { getKelasDiampu, getSiswaKelas, getAbsensiUntukTanggal, getCatatanAbsensiUntukTanggal, getPengajuanIzinPendingUntukTanggal, getRiwayatAbsensi } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { Callout } from "@/components/ui/Callout";
import { Pill } from "@/components/ui/Pill";
import { StatCard } from "@/components/ui/Card";
import { formatTanggal } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "HADIR", label: "H", peerClass: "peer-checked:bg-success peer-checked:text-white" },
  { value: "SAKIT", label: "S", peerClass: "peer-checked:bg-warning peer-checked:text-white" },
  { value: "IZIN", label: "I", peerClass: "peer-checked:bg-primary peer-checked:text-white" },
  { value: "ALPA", label: "A", peerClass: "peer-checked:bg-danger peer-checked:text-white" },
] as const;

const STATUS_TONE: Record<string, "ok" | "warn" | "info" | "danger"> = {
  HADIR: "ok",
  SAKIT: "warn",
  IZIN: "info",
  ALPA: "danger",
};

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; tab?: string; tanggal?: string; siswaId?: string; absensi_disimpan?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());

  const params = await searchParams;
  const kelasAktifId = params.kelas ?? kelasUnik[0]?.id;
  const kelasAktif = kelasUnik.find((k) => k.id === kelasAktifId) ?? kelasUnik[0];
  const tab = params.tab === "riwayat" ? "riwayat" : "isi";

  if (!kelasAktif) {
    return (
      <AppShell
        groups={NAV_GURU}
        activeHref="/guru/absensi"
        userName={session.nama}
        userRoleLabel={ROLE_LABEL[session.peran]}
        pageTitle="Absensi"
      >
        <Callout tone="warn">Belum ada kelas yang diampu.</Callout>
      </AppShell>
    );
  }

  const siswaKelas = await getSiswaKelas(kelasAktif.id);

  const todayStr = new Date().toISOString().slice(0, 10);
  // 1.23 — tanggal isi absensi sekarang bisa dipilih (datepicker, max=hari ini — gak bisa isi
  // absensi masa depan), sebelumnya hardcode ke hari ini doang.
  const tanggalIsi = params.tanggal && params.tanggal <= todayStr ? params.tanggal : todayStr;
  const tanggalIsiLabel = new Date(tanggalIsi + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/absensi"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Absensi — Kelas ${kelasAktif.nama}`}
      pageSubtitle={tab === "isi" ? tanggalIsiLabel : "Riwayat absensi — G-1"}
    >
      {kelasUnik.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {kelasUnik.map((k) => (
            <a
              key={k.id}
              href={`/guru/absensi?kelas=${k.id}&tab=${tab}`}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (k.id === kelasAktif.id
                  ? "bg-primary text-white border-primary font-semibold"
                  : "border-rule text-ink-soft hover:bg-paper-raised")
              }
            >
              Kelas {k.nama}
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-1 mb-5 border-b border-rule">
        <a href={`/guru/absensi?kelas=${kelasAktif.id}&tab=isi`} className={"text-sm px-3 py-2 font-semibold " + (tab === "isi" ? "border-b-2 border-primary text-primary-deep" : "text-ink-soft")}>
          Isi Absensi
        </a>
        <a href={`/guru/absensi?kelas=${kelasAktif.id}&tab=riwayat`} className={"text-sm px-3 py-2 font-semibold " + (tab === "riwayat" ? "border-b-2 border-primary text-primary-deep" : "text-ink-soft")}>
          Riwayat
        </a>
      </div>

      {params.absensi_disimpan && <div className="mb-4"><Callout>✓ Absensi tersimpan.</Callout></div>}

      {tab === "riwayat" ? (
        <RiwayatTab kelasId={kelasAktif.id} siswaKelas={siswaKelas} filter={params} />
      ) : (
        <IsiTab kelasId={kelasAktif.id} siswa={siswaKelas} tanggalIsi={tanggalIsi} tanggalIsiLabel={tanggalIsiLabel} todayStr={todayStr} />
      )}
    </AppShell>
  );
}

async function IsiTab({
  kelasId,
  siswa,
  tanggalIsi,
  tanggalIsiLabel,
  todayStr,
}: {
  kelasId: string;
  siswa: Awaited<ReturnType<typeof getSiswaKelas>>;
  tanggalIsi: string;
  tanggalIsiLabel: string;
  todayStr: string;
}) {
  const [absensiMap, catatanMap, izinPendingMap] = await Promise.all([
    getAbsensiUntukTanggal(kelasId, tanggalIsi),
    getCatatanAbsensiUntukTanggal(kelasId, tanggalIsi),
    getPengajuanIzinPendingUntukTanggal(kelasId, tanggalIsi),
  ]);
  return (
    <>
      <form method="GET" className="flex flex-wrap items-end gap-3 mb-4">
        <input type="hidden" name="kelas" value={kelasId} />
        <input type="hidden" name="tab" value="isi" />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Tanggal</label>
          <input type="date" name="tanggal" defaultValue={tanggalIsi} max={todayStr} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
        </div>
        <Button type="submit" size="sm" variant="ghost">Tampilkan</Button>
      </form>

      <div className="bg-primary-tint border border-primary/30 rounded-xl px-4 py-3 mb-4">
        <p className="text-[11px] uppercase tracking-wider text-primary-deep font-bold">Mengisi absensi untuk</p>
        <p className="font-serif text-lg text-primary-deep">{tanggalIsiLabel}</p>
      </div>
      <form action="/api/absensi" method="POST">
        <input type="hidden" name="kelasId" value={kelasId} />
        <input type="hidden" name="tanggal" value={tanggalIsi} />
        <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2.5 font-bold w-10">No</th>
                <th className="text-left px-4 py-2.5 font-bold">Nama Siswa</th>
                <th className="text-left px-4 py-2.5 font-bold">NISN</th>
                <th className="text-left px-4 py-2.5 font-bold">Status</th>
                <th className="text-left px-4 py-2.5 font-bold">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {siswa.map((s, i) => {
                const statusSekarang = absensiMap.get(s.id) ?? "HADIR";
                const izinPending = izinPendingMap.get(s.id);
                return (
                  <tr key={s.id} className="border-t border-rule">
                    <td className="px-4 py-2.5 tabnum">{i + 1}</td>
                    <td className="px-4 py-2.5 font-semibold">
                      {s.nama}
                      {izinPending && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Pill tone="warn">✋ Izin diajukan — {izinPending.jenis === "SAKIT" ? "Sakit" : "Izin"}</Pill>
                          {/* 1.23 — form Setujui/Tolak TIDAK boleh nested di dalam <form> absensi
                              (HTML5 tak izinkan <form> bersarang, browser bakal reparent-nya diam-diam
                              & bikin hydration mismatch) — dihubungkan via atribut `form="id"` ke
                              form kosong yang dirender di luar, pola sama kayak "Tambah rombel" (1.20). */}
                          <button type="submit" form={`izin-setujui-${izinPending.id}`} className="text-[11px] font-semibold text-success hover:underline">Setujui</button>
                          <button type="submit" form={`izin-tolak-${izinPending.id}`} className="text-[11px] font-semibold text-danger hover:underline">Tolak</button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabnum text-ink-soft">{s.nisn}</td>
                    <td className="px-4 py-2.5">
                      <input type="hidden" name="siswaId" value={s.id} />
                      <div className="inline-flex gap-1">
                        {STATUS_OPTIONS.map((opt) => (
                          <label key={opt.value}>
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              value={opt.value}
                              defaultChecked={statusSekarang === opt.value}
                              className="peer hidden"
                            />
                            <span
                              className={
                                "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold cursor-pointer bg-paper-sunken text-ink-soft " +
                                opt.peerClass
                              }
                            >
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        name={`catatan_${s.id}`}
                        defaultValue={catatanMap.get(s.id) ?? ""}
                        placeholder="Opsional…"
                        className="bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs w-40"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ConfirmSubmitButton confirmMessage="Simpan absensi tanggal ini? Pastikan semua status sudah benar.">
          Simpan absensi
        </ConfirmSubmitButton>
      </form>

      {/* Form kosong Setujui/Tolak izin, disambungkan ke tombol di dalam tabel di atas lewat
          atribut `form="id"` — sengaja di luar <form> absensi, lihat komentar di baris tombolnya. */}
      {Array.from(izinPendingMap.values()).map((izinPending) => (
        <div key={izinPending.id} className="hidden">
          <form id={`izin-setujui-${izinPending.id}`} action="/api/izin/putuskan" method="POST">
            <input type="hidden" name="pengajuanId" value={izinPending.id} />
            <input type="hidden" name="keputusan" value="DISETUJUI" />
          </form>
          <form id={`izin-tolak-${izinPending.id}`} action="/api/izin/putuskan" method="POST">
            <input type="hidden" name="pengajuanId" value={izinPending.id} />
            <input type="hidden" name="keputusan" value="DITOLAK" />
          </form>
        </div>
      ))}

      <div className="mt-4">
        <Callout>
          Begitu absensi disimpan, orang tua dari siswa yang Sakit/Izin/Alpa otomatis dianggap
          dapat notifikasi (simulasi — prototype ini belum kirim WhatsApp sungguhan). Kehadiran
          mengajarmu untuk sesi jadwal hari ini juga otomatis tercatat (AG-1).
        </Callout>
      </div>
    </>
  );
}

async function RiwayatTab({
  kelasId,
  siswaKelas,
  filter,
}: {
  kelasId: string;
  siswaKelas: Awaited<ReturnType<typeof getSiswaKelas>>;
  filter: { tanggal?: string; siswaId?: string };
}) {
  // Mode 1 (default): satu murid dipilih -> tampilkan riwayatnya lintas tanggal, dikelompokkan per hari.
  if (filter.siswaId) {
    const riwayat = await getRiwayatAbsensi(kelasId, { siswaId: filter.siswaId });
    const murid = siswaKelas.find((s) => s.id === filter.siswaId);
    const hadir = riwayat.filter((r) => r.status === "HADIR").length;
    const persenHadir = riwayat.length > 0 ? Math.round((hadir / riwayat.length) * 100) : null;

    return (
      <>
        <FilterForm kelasId={kelasId} siswaKelas={siswaKelas} filter={filter} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
          <StatCard label="Murid" value={murid?.nama ?? "—"} />
          <StatCard label="Persen hadir" value={persenHadir !== null ? `${persenHadir}%` : "—"} tone="good" />
          <StatCard label="Total data" value={String(riwayat.length)} />
          <StatCard label="Sakit/Izin/Alpa" value={String(riwayat.length - hadir)} tone={riwayat.length - hadir > 0 ? "warn" : "default"} />
        </div>
        <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
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
        </div>
      </>
    );
  }

  // Mode 2 (default): satu hari pada satu waktu, dengan navigasi hari sebelum/sesudah.
  const tanggal = filter.tanggal ?? new Date().toISOString().slice(0, 10);
  const riwayatHari = await getRiwayatAbsensi(kelasId, { tanggalMulai: tanggal, tanggalSelesai: tanggal });
  const hadir = riwayatHari.filter((r) => r.status === "HADIR").length;
  const sakit = riwayatHari.filter((r) => r.status === "SAKIT").length;
  const izin = riwayatHari.filter((r) => r.status === "IZIN").length;
  const alpa = riwayatHari.filter((r) => r.status === "ALPA").length;

  const hariSebelum = new Date(tanggal + "T00:00:00");
  hariSebelum.setDate(hariSebelum.getDate() - 1);
  const hariSesudah = new Date(tanggal + "T00:00:00");
  hariSesudah.setDate(hariSesudah.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <>
      <FilterForm kelasId={kelasId} siswaKelas={siswaKelas} filter={filter} />

      <div className="flex items-center justify-between mb-4">
        <a href={`?kelas=${kelasId}&tab=riwayat&tanggal=${fmt(hariSebelum)}`} className="text-sm font-semibold text-primary-deep hover:underline">← Hari sebelumnya</a>
        <h3 className="font-serif text-lg">{formatTanggal(tanggal)}</h3>
        <a href={`?kelas=${kelasId}&tab=riwayat&tanggal=${fmt(hariSesudah)}`} className="text-sm font-semibold text-primary-deep hover:underline">Hari berikutnya →</a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Hadir" value={String(hadir)} tone="good" />
        <StatCard label="Sakit" value={String(sakit)} tone={sakit > 0 ? "warn" : "default"} />
        <StatCard label="Izin" value={String(izin)} />
        <StatCard label="Alpa" value={String(alpa)} tone={alpa > 0 ? "warn" : "default"} />
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Murid</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {riwayatHari.map((r) => (
              <tr key={r.id} className="border-t border-rule">
                <td className="px-4 py-2.5 font-semibold">{r.siswa.nama}</td>
                <td className="px-4 py-2.5"><Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill></td>
                <td className="px-4 py-2.5 text-ink-soft">{r.catatan ?? "—"}</td>
              </tr>
            ))}
            {riwayatHari.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-soft text-xs">Belum ada absensi tercatat di tanggal ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FilterForm({
  kelasId,
  siswaKelas,
  filter,
}: {
  kelasId: string;
  siswaKelas: Awaited<ReturnType<typeof getSiswaKelas>>;
  filter: { tanggal?: string; siswaId?: string };
}) {
  return (
    <form method="GET" className="flex flex-wrap items-end gap-3 mb-5">
      <input type="hidden" name="kelas" value={kelasId} />
      <input type="hidden" name="tab" value="riwayat" />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Lihat per murid (opsional)</label>
        <select name="siswaId" defaultValue={filter.siswaId ?? ""} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
          <option value="">— Lihat per hari (default) —</option>
          {siswaKelas.map((s) => (
            <option key={s.id} value={s.id}>{s.nama}</option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" variant="ghost">Tampilkan</Button>
    </form>
  );
}
