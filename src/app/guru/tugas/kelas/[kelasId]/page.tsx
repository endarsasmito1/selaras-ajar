import { getSession } from "@/lib/auth";
import { getTugasByGuru } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function TugasKelasListPage({ params }: { params: Promise<{ kelasId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { kelasId } = await params;

  const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, sekolahId: session.sekolahId } });
  if (!kelas) notFound();

  const semuaTugas = await getTugasByGuru(session.userId);
  const tugasList = semuaTugas.filter((t) => t.kelasId === kelasId);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/tugas"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Tugas — Kelas ${kelas.nama}`}
      pageSubtitle={`${tugasList.length} tugas`}
      headerAction={<LinkButton href="/guru/tugas" variant="ghost" size="sm">← Semua kelas</LinkButton>}
    >
      <div className="flex flex-col gap-2">
        {tugasList.map((t) => {
          const dinilai = t.pengumpulan.filter((p) => p.nilai !== null).length;
          return (
            <a key={t.id} href={`/guru/tugas/${t.id}`} className="block bg-paper-raised border border-rule rounded-lg px-4 py-3 hover:border-primary">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-sm">{t.judul}</div>
                  <div className="text-xs text-ink-soft mt-0.5">{t.mapel.nama} · tenggat {formatTanggal(t.tenggat)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="info">{t.pengumpulan.length} terkumpul</Pill>
                  <Pill tone={dinilai === t.pengumpulan.length && t.pengumpulan.length > 0 ? "ok" : "warn"}>{dinilai} dinilai</Pill>
                </div>
              </div>
            </a>
          );
        })}
        {tugasList.length === 0 && <p className="text-sm text-ink-soft">Belum ada tugas untuk kelas ini.</p>}
      </div>
    </AppShell>
  );
}
