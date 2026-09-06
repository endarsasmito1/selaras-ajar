import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getDashboardMurid, getProfilMurid, getCatatanAsesmen } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { Donut } from "@/components/ui/Donut";
import { PengumumanNotifCard } from "@/components/PengumumanWidget";
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
      <div className="mb-4"><PengumumanNotifCard sekolahId={session.sekolahId} /></div>
      <div className="grid md:grid-cols-2 gap-4 mb-4 items-start">
        <div className="flex flex-col gap-4">
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
        </div>

        <div className="flex flex-col gap-4">
          {/* Padanan .card.highlight prototipe — gradient tint→nyaris-putih, bukan flat bg-primary-tint. */}
          <Card className="text-center border-[#c9dcd2]" style={{ background: "linear-gradient(160deg, var(--primary-tint), #eef4ef)" }}>
            <h4 className="text-sm font-semibold mb-3">Kehadiran</h4>
            {kehadiranTerakhir ? (
              <>
                <Donut persen={Math.round((absensi.filter((a) => a.status === "HADIR").length / absensi.length) * 100)} />
                <p className="text-xs text-ink-soft mt-1">
                  {absensi.filter((a) => a.status === "HADIR").length} dari {absensi.length} hari terakhir hadir
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="text-xs text-ink-soft">Terakhir {formatTanggal(kehadiranTerakhir.tanggal)}</span>
                  <Pill tone={kehadiranTerakhir.status === "HADIR" ? "ok" : "warn"}>{kehadiranTerakhir.status}</Pill>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-soft">Belum ada data.</p>
            )}
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
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Card>
          <h4 className="text-sm font-semibold mb-3">Info diri</h4>
          {/* Padanan .profile-grid/.profile-item prototipe — grid ikon+label+nilai, bukan daftar
              baris justify-between polos yang dipakai sebelumnya. */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
            <ProfilItem ic="👤" label="Nama Lengkap" value={siswa.nama} />
            <ProfilItem ic="🪪" label="NISN" value={siswa.nisn} tabnum />
            <ProfilItem ic="🏫" label="Kelas" value={siswa.kelas.nama} />
            {profil?.sekolah && (
              <ProfilItem ic="🏛️" label="Sekolah" value={profil.sekolah.nama} />
            )}
            {profil && profil.wali.length > 0 && profil.wali.map((w) => (
              <ProfilItem key={w.id} ic="👨‍👩‍👦" label={w.hubungan} value={w.pengguna.nama} />
            ))}
            {profil && profil.wali.some((w) => w.pengguna.telepon) && (
              <ProfilItem
                ic="📞"
                label="Kontak Wali"
                value={profil.wali.find((w) => w.pengguna.telepon)?.pengguna.telepon ?? "—"}
                tabnum
              />
            )}
          </div>
          {(!profil || profil.wali.length === 0) && (
            <p className="text-xs text-ink-soft mt-3">Belum ada wali terdaftar.</p>
          )}
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

function ProfilItem({ ic, label, value, tabnum }: { ic: string; label: string; value: string; tabnum?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[38px] h-[38px] rounded-[10px] bg-paper-sunken flex items-center justify-center text-xl shrink-0">{ic}</span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-ink-soft font-bold">{label}</div>
        <div className={"text-sm font-semibold text-ink-heading mt-0.5 truncate" + (tabnum ? " tabnum" : "")}>{value}</div>
      </div>
    </div>
  );
}
