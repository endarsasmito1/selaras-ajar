import { getSession } from "@/lib/auth";
import { getUjianDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { SoalHtml } from "@/lib/sanitize-html";
import { notFound } from "next/navigation";

const JENIS_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export default async function LihatSoalUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const ujian = await getUjianDetail(id, session.sekolahId);
  if (!ujian) notFound();

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Daftar Soal — ${ujian.judul}`}
      pageSubtitle={`${ujian.mapel.nama} · ${ujian.kelas.map((uk) => uk.kelas.nama).join(", ")} · ${ujian.soal.length} soal`}
    >
      <a href={`/guru/ujian/${ujian.id}`} className="text-xs font-semibold text-primary-deep hover:underline mb-4 inline-block">← Kembali</a>
      <div className="flex flex-col gap-3">
        {ujian.soal.map((us, i) => {
          const opsiArr: string[] = us.soal.opsi ? JSON.parse(us.soal.opsi) : [];
          return (
            <div key={us.id} className="bg-paper-raised border border-rule rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Pill tone="neutral">Soal {i + 1}</Pill>
                <Pill tone={us.soal.jenis === "ESAI" ? "warn" : "info"}>{JENIS_LABEL[us.soal.jenis]}</Pill>
                <span className="text-xs text-ink-soft">· {us.poin} poin{us.soal.topik ? ` · ${us.soal.topik}` : ""}</span>
              </div>
              <SoalHtml html={us.soal.pertanyaan} className="text-sm font-medium mb-2" />
              {us.soal.jenis === "PILIHAN_GANDA" && (
                <div className="flex flex-col gap-1">
                  {opsiArr.map((o, oi) => (
                    <div key={oi} className={"text-xs px-2.5 py-1.5 rounded-md border " + (String(oi) === us.soal.kunciJawaban ? "border-success bg-success-tint text-success font-semibold" : "border-rule text-ink-soft")}>
                      {o} {String(oi) === us.soal.kunciJawaban && "✓ kunci"}
                    </div>
                  ))}
                </div>
              )}
              {us.soal.jenis === "JAWABAN_SINGKAT" && (
                <p className="text-xs text-ink-soft">Kunci: <b className="text-success">{us.soal.kunciJawaban}</b></p>
              )}
            </div>
          );
        })}
        {ujian.soal.length === 0 && <p className="text-sm text-ink-soft">Belum ada soal di ujian ini.</p>}
      </div>
    </AppShell>
  );
}
