import { getSession } from "@/lib/auth";
import { getUjianDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { Pill } from "@/components/ui/Pill";
import { SoalHtml } from "@/lib/sanitize-html";
import { notFound } from "next/navigation";

const JENIS_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  PILIHAN_GANDA_KOMPLEKS: "PG Kompleks",
  PILIHAN_GANDA_MINUS: "PG Nilai Minus",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export default async function DetailPengerjaanMuridPage({
  params,
}: {
  params: Promise<{ id: string; pengerjaanId: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id, pengerjaanId } = await params;

  const ujian = await getUjianDetail(id, session.sekolahId);
  if (!ujian) notFound();
  const pengerjaan = ujian.pengerjaan.find((p) => p.id === pengerjaanId);
  if (!pengerjaan) notFound();

  const urutanSoalId: string[] = JSON.parse(pengerjaan.soalUrutan);
  const jawabanMap = new Map(pengerjaan.jawaban.map((j) => [j.soalId, j]));
  const ujianSoalMap = new Map(ujian.soal.map((us) => [us.soalId, us]));

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${pengerjaan.siswa.nama} — ${ujian.judul}`}
      pageSubtitle={`Nilai: ${pengerjaan.nilaiTotal ?? "—"}`}
    >
      <a href={`/guru/ujian/${ujian.id}`} className="text-xs font-semibold text-primary-deep hover:underline mb-4 inline-block">
        ← Kembali ke hasil ujian
      </a>

      <div className="flex flex-col gap-3 mb-6">
        {urutanSoalId.map((soalId, i) => {
          const us = ujianSoalMap.get(soalId);
          const j = jawabanMap.get(soalId);
          if (!us || !j) return null;
          const opsiArr: string[] = us.soal.opsi ? JSON.parse(us.soal.opsi) : [];
          return (
            <div key={soalId} className="bg-paper-raised border border-rule rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Pill tone="neutral">Soal {i + 1}</Pill>
                <Pill tone={us.soal.jenis === "ESAI" ? "warn" : "info"}>{JENIS_LABEL[us.soal.jenis]}</Pill>
                <span className="text-xs text-ink-soft">· {us.poin} poin{j.skor !== null ? ` · skor: ${j.skor}` : ""}</span>
              </div>
              <SoalHtml html={us.soal.pertanyaan} className="text-sm font-medium mb-2" />

              {(us.soal.jenis === "PILIHAN_GANDA" || us.soal.jenis === "PILIHAN_GANDA_MINUS") && (
                <div className="flex flex-col gap-1">
                  {opsiArr.map((o, oi) => {
                    const isKunci = String(oi) === us.soal.kunciJawaban;
                    const isDipilih = j.jawabanPG === oi;
                    return (
                      <div
                        key={oi}
                        className={
                          "text-xs px-2.5 py-1.5 rounded-md border " +
                          (isKunci
                            ? "border-success bg-success-tint text-success font-semibold"
                            : isDipilih
                              ? "border-danger bg-danger-tint text-danger"
                              : "border-rule text-ink-soft")
                        }
                      >
                        {o} {isKunci && "✓ kunci"} {isDipilih && !isKunci && "← dipilih murid"} {isDipilih && isKunci && "← dipilih murid"}
                      </div>
                    );
                  })}
                  {us.soal.jenis === "PILIHAN_GANDA_MINUS" && us.soal.penguranganNilai != null && (
                    <p className="text-xs text-ink-soft">Potongan kalau salah: −{us.soal.penguranganNilai}{us.soal.penguranganMode === "PERSEN" ? "%" : " poin"}</p>
                  )}
                </div>
              )}

              {us.soal.jenis === "PILIHAN_GANDA_KOMPLEKS" && (() => {
                const kunciMulti: number[] = us.soal.kunciJawaban ? JSON.parse(us.soal.kunciJawaban) : [];
                const dipilihMulti: number[] = j.jawabanPGMulti ? JSON.parse(j.jawabanPGMulti) : [];
                return (
                  <div className="flex flex-col gap-1">
                    {opsiArr.map((o, oi) => {
                      const isKunci = kunciMulti.includes(oi);
                      const isDipilih = dipilihMulti.includes(oi);
                      return (
                        <div
                          key={oi}
                          className={
                            "text-xs px-2.5 py-1.5 rounded-md border " +
                            (isKunci
                              ? "border-success bg-success-tint text-success font-semibold"
                              : isDipilih
                                ? "border-danger bg-danger-tint text-danger"
                                : "border-rule text-ink-soft")
                          }
                        >
                          {isDipilih ? "☑" : "☐"} {o} {isKunci && "✓ kunci"}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {us.soal.jenis !== "PILIHAN_GANDA" && us.soal.jenis !== "PILIHAN_GANDA_MINUS" && us.soal.jenis !== "PILIHAN_GANDA_KOMPLEKS" && (
                <div className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                  {j.jawabanTeks || <span className="text-ink-soft italic">Tidak dijawab</span>}
                </div>
              )}

              {us.soal.jenis === "ESAI" && (
                <form action="/api/ujian/nilai-esai" method="POST" className="flex items-center gap-2 mt-2">
                  <input type="hidden" name="ujianId" value={ujian.id} />
                  <input type="hidden" name="jawabanId" value={j.id} />
                  <label className="text-xs font-semibold">Skor:</label>
                  <input
                    type="number"
                    name={`skor_${j.id}`}
                    min={0}
                    max={us.poin}
                    defaultValue={j.skor ?? ""}
                    className="w-20 bg-paper border border-rule rounded-lg px-2 py-1 text-sm"
                  />
                  <Button type="submit" size="sm" variant="ghost">Simpan skor</Button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold mb-2">Komentar untuk murid & orang tua (U-27)</h3>
        <form action="/api/ujian/komentar" method="POST" className="flex flex-col gap-2">
          <input type="hidden" name="pengerjaanId" value={pengerjaan.id} />
          <input type="hidden" name="ujianId" value={ujian.id} />
          <textarea
            name="komentarGuru"
            rows={3}
            defaultValue={pengerjaan.komentarGuru ?? ""}
            placeholder="mis. Sudah bagus di aljabar, masih perlu latihan soal cerita."
            className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
          />
          <Button type="submit" size="sm" className="self-start">Simpan komentar</Button>
        </form>
      </div>

      {pengerjaan.koreksiDikonfirmasi ? (
        <Pill tone="ok">Koreksi sudah dikonfirmasi — nilai & komentar terlihat murid/ortu</Pill>
      ) : (
        <form action="/api/ujian/konfirmasi-koreksi" method="POST">
          <input type="hidden" name="pengerjaanId" value={pengerjaan.id} />
          <input type="hidden" name="ujianId" value={ujian.id} />
          <ConfirmSubmitButton variant="accent" confirmMessage="Selesaikan koreksi? Nilai & komentar akan langsung terlihat oleh murid dan orang tua.">
            Selesai dikoreksi — tampilkan nilai ke murid/ortu
          </ConfirmSubmitButton>
        </form>
      )}
    </AppShell>
  );
}
