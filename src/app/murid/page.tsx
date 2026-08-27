import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getDashboardMurid, getProfilMurid, getCatatanAsesmen } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { PengumumanWidget } from "@/components/PengumumanWidget";
import { formatTanggal } from "@/lib/utils";

const TIPE_ICON: Record<string, string> = { dokumen: "📄", video: "▶", catatan: "✎" };

export default async function MuridDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) {
    return (
      <AppShell
      showBack={false}
        groups={NAV_MURID}
        activeHref="/murid"
        userName={session.nama}
        userRoleLabel={ROLE_LABEL[session.peran]}
        pageTitle="Beranda"
      >
        <p className="text-sm text-ink-soft">Data siswa tidak ditemukan untuk akun ini.</p>
      </AppShell>
    );
  }

  const [{ nilai, tugas, materi, absensi }, profil, asesmen] = await Promise.all([
    getDashboardMurid(siswa.id, siswa.kelasId),
    getProfilMurid(siswa.id),
    getCatatanAsesmen(siswa.id),
  ]);
  const kehadiranTerakhir = absensi[0];

  return (
    <AppShell
      showBack={false}
      groups={NAV_MURID}
      activeHref="/murid"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Halo, ${siswa.nama.split(" ")[0]}!`}
      pageSubtitle={`Kelas ${siswa.kelas.nama}`}
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      <div className="mb-4"><PengumumanWidget sekolahId={session.sekolahId} /></div>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <h4 className="text-sm font-semibold mb-3">Tugas & Ujian</h4>
          <div className="flex flex-col gap-2">
            {tugas.length === 0 && <p className="text-xs text-ink-soft">Tidak ada tugas aktif.</p>}
            {tugas.map((t) => {
              const sudahKumpul = t.pengumpulan.length > 0;
              return (
                <div key={t.id} className="flex justify-between items-center text-sm border-b border-rule last:border-0 pb-2 last:pb-0">
                  <div>
                    <div className="font-medium">{t.judul}</div>
                    <div className="text-xs text-ink-soft">
                      {t.mapel.nama} · tenggat {formatTanggal(t.tenggat)}
                    </div>
                  </div>
                  <Pill tone={sudahKumpul ? "ok" : "warn"}>
                    {sudahKumpul ? "Terkumpul" : "Belum"}
                  </Pill>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-semibold mb-3">Kehadiran</h4>
          {kehadiranTerakhir ? (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-ink-soft">Terakhir: {formatTanggal(kehadiranTerakhir.tanggal)}</span>
              <Pill tone={kehadiranTerakhir.status === "HADIR" ? "ok" : "warn"}>
                {kehadiranTerakhir.status}
              </Pill>
            </div>
          ) : (
            <p className="text-xs text-ink-soft mb-3">Belum ada data.</p>
          )}
          <div className="text-xs text-ink-soft">
            {absensi.filter((a) => a.status === "HADIR").length} dari {absensi.length} hari terakhir hadir
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h4 className="text-sm font-semibold mb-3">Nilai terbaru</h4>
          <div className="flex flex-col gap-1.5">
            {nilai.length === 0 && <p className="text-xs text-ink-soft">Belum ada nilai.</p>}
            {nilai.map((n) => (
              <div key={n.id} className="flex justify-between text-sm">
                <span className="text-ink-soft">
                  {n.mapel.nama} — {n.komponen}
                </span>
                <span className="tabnum font-semibold">{n.skor}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-semibold mb-3">Materi belajar</h4>
          <div className="flex flex-col gap-2">
            {materi.length === 0 && <p className="text-xs text-ink-soft">Belum ada materi.</p>}
            {materi.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 text-sm">
                <span className="w-7 h-7 rounded-md bg-primary-tint text-primary-deep flex items-center justify-center text-xs shrink-0">
                  {TIPE_ICON[m.tipe] ?? "📄"}
                </span>
                <div>
                  <div className="font-medium leading-tight">{m.judul}</div>
                  <div className="text-xs text-ink-soft">{m.mapel.nama}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Card>
          <h4 className="text-sm font-semibold mb-3">Info diri</h4>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Nama</span><span className="font-medium">{siswa.nama}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">NISN</span><span className="font-medium tabnum">{siswa.nisn}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Kelas</span><span className="font-medium">{siswa.kelas.nama}</span></div>
            {profil?.sekolah && (
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft shrink-0">Sekolah</span>
                <span className="font-medium text-right">{profil.sekolah.nama}{profil.sekolah.alamat ? ` — ${profil.sekolah.alamat}` : ""}</span>
              </div>
            )}
            <div className="h-px bg-rule my-1.5" />
            {!profil || profil.wali.length === 0 ? (
              <p className="text-xs text-ink-soft">Belum ada wali terdaftar.</p>
            ) : (
              profil.wali.map((w) => (
                <div key={w.id} className="flex justify-between gap-3">
                  <span className="text-ink-soft shrink-0">{w.hubungan}</span>
                  <span className="font-medium text-right">
                    {w.pengguna.nama}
                    {w.pengguna.telepon && <span className="text-ink-soft"> · {w.pengguna.telepon}</span>}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h4 className="text-sm font-semibold mb-3">Catatan asesmen dari guru</h4>
          <div className="flex flex-col gap-2.5">
            {asesmen.length === 0 && <p className="text-xs text-ink-soft">Belum ada catatan asesmen deskriptif.</p>}
            {asesmen.slice(0, 5).map((a) => (
              <div key={a.id} className="text-sm border-b border-rule last:border-0 pb-2 last:pb-0">
                <div className="text-xs text-ink-soft mb-0.5">{a.mapel.nama} · {a.guru.nama} · {a.periode}</div>
                <p>{a.isi}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
