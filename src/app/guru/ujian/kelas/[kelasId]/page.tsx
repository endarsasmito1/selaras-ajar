import { getSession } from "@/lib/auth";
import { getUjianByGuruDanKelas } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { notFound } from "next/navigation";

export default async function UjianKelasListPage({ params }: { params: Promise<{ kelasId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { kelasId } = await params;

  const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } });
  if (!kelas) notFound();

  const [ujianList, totalMurid] = await Promise.all([
    getUjianByGuruDanKelas(session.userId, kelasId),
    prisma.siswa.count({ where: { kelasId, aktif: true } }),
  ]);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Ujian — Kelas ${kelas.nama}`}
      pageSubtitle={`${ujianList.length} ujian/latihan`}
      headerAction={<LinkButton href="/guru/ujian" variant="ghost" size="sm">← Semua kelas</LinkButton>}
    >
      <div className="flex flex-col gap-2">
        {ujianList.map((u) => {
          const selesai = u.pengerjaan.filter((p) => p.status === "SELESAI" || p.status === "AUTO_SUBMIT").length;
          const rata =
            selesai > 0
              ? Math.round(
                  (u.pengerjaan.filter((p) => p.nilaiTotal !== null).reduce((s, p) => s + (p.nilaiTotal ?? 0), 0) / selesai) * 10
                ) / 10
              : null;
          return (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 bg-paper-raised border border-rule rounded-lg flex-wrap gap-3">
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  {u.judul}
                  <Pill tone="info">{u.jenis === "LATIHAN" ? "Latihan" : "CBT"}</Pill>
                </div>
                <div className="text-xs text-ink-soft mt-0.5">
                  {u.mapel.nama} · {u.soal.length} soal
                  {u.jamMulai && u.jamSelesai && (
                    <> · {new Date(u.jamMulai).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}–{new Date(u.jamSelesai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                  {u.status === "PUBLISHED" && ` · ${selesai}/${totalMurid} selesai`}
                  {rata !== null && ` · rata-rata ${rata}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Pill tone={u.status === "PUBLISHED" ? "ok" : "neutral"}>{u.status === "PUBLISHED" ? "Terbit" : "Draft"}</Pill>
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
        {ujianList.length === 0 && <p className="text-sm text-ink-soft">Belum ada ujian untuk kelas ini.</p>}
      </div>
    </AppShell>
  );
}
