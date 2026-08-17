import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getUjianAktifUntukMurid } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";

export default async function DaftarUjianMuridPage() {
  const session = await getSession();
  if (!session) return null;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const daftar = await getUjianAktifUntukMurid(siswa.kelasId, siswa.id);
  const now = new Date();

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ujian & Latihan"
      pageSubtitle="Kerjakan sesuai jadwal yang ditentukan guru"
    >
      <div className="flex flex-col gap-3">
        {daftar.length === 0 && <p className="text-sm text-ink-soft">Belum ada ujian/latihan aktif.</p>}
        {daftar.map((u) => {
          const pengerjaan = u.pengerjaan[0];
          const belumBuka = u.jamMulai && now < new Date(u.jamMulai);
          const sudahTutup = u.jamSelesai && now > new Date(u.jamSelesai);
          const selesai = pengerjaan?.status === "SELESAI" || pengerjaan?.status === "AUTO_SUBMIT";
          const bisaMulai = u.jenis === "LATIHAN" || (!selesai && !belumBuka && !sudahTutup);

          return (
            <div key={u.id} className="bg-paper-raised border border-rule rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  {u.judul}
                  <Pill tone="info">{u.jenis === "LATIHAN" ? "Latihan" : "CBT"}</Pill>
                </div>
                <div className="text-xs text-ink-soft mt-1">
                  {u.mapel.nama} · {u.soal.length} soal
                  {u.jamMulai && u.jamSelesai && (
                    <> · {new Date(u.jamMulai).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}–{new Date(u.jamSelesai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </div>
              </div>
              <div>
                {selesai ? (
                  <Pill tone="ok">Selesai {pengerjaan?.nilaiTotal !== null ? `· Nilai ${pengerjaan?.nilaiTotal}` : ""}</Pill>
                ) : belumBuka ? (
                  <Pill tone="neutral">Belum dibuka</Pill>
                ) : sudahTutup ? (
                  <Pill tone="warn">Sudah tutup</Pill>
                ) : (
                  <LinkButton href={`/murid/ujian/${u.id}`} size="sm" variant={u.jenis === "LATIHAN" ? "ghost" : "accent"}>
                    {pengerjaan?.status === "MENGERJAKAN" ? "Lanjutkan" : "Mulai"}
                  </LinkButton>
                )}
                {!bisaMulai && !selesai && !belumBuka && !sudahTutup && null}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
