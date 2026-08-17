import { getSession } from "@/lib/auth";
import { getUjianByGuru, getEsaiPerluDinilai } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export default async function KelolaUjianPage() {
  const session = await getSession();
  if (!session) return null;

  const [ujianList, esaiPerlu] = await Promise.all([
    getUjianByGuru(session.userId),
    getEsaiPerluDinilai(session.userId),
  ]);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ujian & Latihan"
      pageSubtitle="Kelola semua ujian, lihat hasil & analisis"
      headerAction={<LinkButton href="/guru/ujian/baru" size="sm">+ Buat ujian baru</LinkButton>}
    >
      {esaiPerlu.length > 0 && (
        <Callout tone="warn">
          ⚠ Ada <b>{esaiPerlu.length} jawaban esai</b> yang perlu dinilai manual. Buka detail ujian terkait untuk menilai.
        </Callout>
      )}

      <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden mt-4">
        {ujianList.length === 0 && (
          <p className="text-sm text-ink-soft p-5">Belum ada ujian dibuat.</p>
        )}
        {ujianList.map((u) => {
          const selesai = u.pengerjaan.filter((p) => p.status === "SELESAI" || p.status === "AUTO_SUBMIT").length;
          const rata =
            selesai > 0
              ? Math.round(
                  (u.pengerjaan
                    .filter((p) => p.nilaiTotal !== null)
                    .reduce((s, p) => s + (p.nilaiTotal ?? 0), 0) /
                    selesai) *
                    10
                ) / 10
              : null;
          return (
            <div key={u.id} className="flex items-center justify-between px-5 py-4 border-b border-rule last:border-0 flex-wrap gap-3">
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  {u.judul} — {u.kelas.nama}
                  <Pill tone="info">{u.jenis === "LATIHAN" ? "Latihan" : "CBT"}</Pill>
                </div>
                <div className="text-xs text-ink-soft mt-0.5">
                  {u.mapel.nama} · {u.soal.length} soal
                  {u.status === "PUBLISHED" && ` · ${selesai}/${u.pengerjaan.length || "-"} selesai`}
                  {rata !== null && ` · rata-rata ${rata}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Pill tone={u.status === "PUBLISHED" ? "ok" : "neutral"}>
                  {u.status === "PUBLISHED" ? "Terbit" : "Draft"}
                </Pill>
                <a
                  href={u.status === "DRAFT" ? `/guru/ujian/${u.id}/edit` : `/guru/ujian/${u.id}`}
                  className="text-xs font-semibold text-primary-deep hover:underline"
                >
                  {u.status === "DRAFT" ? "Lanjut susun →" : "Lihat detail →"}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
