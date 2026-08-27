import { getSession } from "@/lib/auth";
import { getAnakDariOrtu, getUjianUntukSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_ORTU, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { LinkButton } from "@/components/ui/Button";
import { SoalHtml } from "@/lib/sanitize-html";

export default async function OrtuUjianDetailPage({
  params,
}: {
  params: Promise<{ siswaId: string; id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { siswaId, id } = await params;

  const anakList = await getAnakDariOrtu(session.userId);
  const anak = anakList.find((a) => a.id === siswaId);

  if (!anak) {
    return (
      <AppShell groups={NAV_ORTU} activeHref="/ortu" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Tidak diizinkan">
        <Callout tone="warn">Data ini bukan milik anak Anda.</Callout>
      </AppShell>
    );
  }

  const ujian = await getUjianUntukSiswa(id, anak.kelasId, siswaId);
  const pengerjaan = ujian?.pengerjaan.find((p) => p.siswaId === siswaId);

  if (!ujian || !pengerjaan || (pengerjaan.status !== "SELESAI" && pengerjaan.status !== "AUTO_SUBMIT")) {
    return (
      <AppShell groups={NAV_ORTU} activeHref="/ortu" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Ujian tidak ditemukan">
        <Callout tone="warn">Hasil ujian ini belum tersedia.</Callout>
      </AppShell>
    );
  }

  const now = new Date();
  const jadwalBerakhir = !ujian.jamSelesai || now > new Date(ujian.jamSelesai);
  const bolehLihat = ujian.jenis === "LATIHAN" || (jadwalBerakhir && pengerjaan.koreksiDikonfirmasi);

  if (!bolehLihat) {
    return (
      <AppShell groups={NAV_ORTU} activeHref="/ortu" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle={ujian.judul}>
        <Callout>
          {anak.nama} sudah mengerjakan ujian ini. Detail hasil akan tampil setelah{" "}
          {!jadwalBerakhir ? "jadwal ujian berakhir" : "guru selesai mengoreksi"}.
        </Callout>
      </AppShell>
    );
  }

  const urutanSoalId: string[] = JSON.parse(pengerjaan.soalUrutan);
  const jawabanMap = new Map(pengerjaan.jawaban.map((j) => [j.soalId, j]));
  const ujianSoalMap = new Map(ujian.soal.map((us) => [us.soalId, us]));

  return (
    <AppShell
      groups={NAV_ORTU}
      activeHref="/ortu"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${ujian.judul} — ${anak.nama}`}
      pageSubtitle={`Nilai: ${pengerjaan.nilaiTotal ?? "—"}`}
    >
      {pengerjaan.komentarGuru && (
        <div className="mb-4"><Callout>💬 Catatan guru: {pengerjaan.komentarGuru}</Callout></div>
      )}
      <div className="flex flex-col gap-3 mb-4">
        {urutanSoalId.map((soalId, i) => {
          const us = ujianSoalMap.get(soalId);
          const j = jawabanMap.get(soalId);
          if (!us || !j) return null;
          const opsiArr: string[] = us.soal.opsi ? JSON.parse(us.soal.opsi) : [];
          return (
            <div key={soalId} className="bg-paper-raised border border-rule rounded-xl p-4">
              <p className="text-xs text-ink-soft mb-1">Soal {i + 1} · {us.poin} poin{j.skor !== null ? ` · skor: ${j.skor}` : ""}</p>
              <SoalHtml html={us.soal.pertanyaan} className="text-sm font-medium mb-2" />
              {(us.soal.jenis === "PILIHAN_GANDA" || us.soal.jenis === "PILIHAN_GANDA_MINUS") && (
                <div className="flex flex-col gap-1">
                  {opsiArr.map((o, oi) => {
                    const isKunci = String(oi) === us.soal.kunciJawaban;
                    const isDipilih = j.jawabanPG === oi;
                    return (
                      <div key={oi} className={"text-xs px-2.5 py-1.5 rounded-md border " + (isKunci ? "border-success bg-success-tint text-success font-semibold" : isDipilih ? "border-danger bg-danger-tint text-danger" : "border-rule text-ink-soft")}>
                        {o} {isKunci && "✓ jawaban benar"} {isDipilih && !isKunci && `← jawaban ${anak.nama}`}
                      </div>
                    );
                  })}
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
                        <div key={oi} className={"text-xs px-2.5 py-1.5 rounded-md border " + (isKunci ? "border-success bg-success-tint text-success font-semibold" : isDipilih ? "border-danger bg-danger-tint text-danger" : "border-rule text-ink-soft")}>
                          {isDipilih ? "☑" : "☐"} {o} {isKunci && "✓ jawaban benar"}
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
            </div>
          );
        })}
      </div>
      <LinkButton href={`/ortu/performa/${siswaId}`} variant="ghost">← Kembali ke performa</LinkButton>
    </AppShell>
  );
}
