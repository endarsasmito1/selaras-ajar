import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getUjianUntukSiswa } from "@/lib/data";
import { getOrCreatePengerjaan } from "@/lib/ujian-helpers";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { LinkButton } from "@/components/ui/Button";
import { SoalHtml } from "@/lib/sanitize-html";
import PengerjaanUjianClient, { type SoalTampil } from "@/components/PengerjaanUjianClient";

export default async function KerjakanUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const ujian = await getUjianUntukSiswa(id, siswa.kelasId, siswa.id);
  if (!ujian || ujian.status !== "PUBLISHED") {
    return (
      <AppShell groups={NAV_MURID} activeHref="/murid/ujian" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle="Ujian tidak ditemukan">
        <Callout tone="warn">Ujian ini tidak tersedia untuk kamu.</Callout>
      </AppShell>
    );
  }

  const now = new Date();
  const belumBuka = ujian.jamMulai && now < new Date(ujian.jamMulai);
  const sudahTutup = ujian.jamSelesai && now > new Date(ujian.jamSelesai);

  const pengerjaanAwal = ujian.pengerjaan.find((p) => p.siswaId === siswa.id);
  const sudahSelesai = pengerjaanAwal?.status === "SELESAI" || pengerjaanAwal?.status === "AUTO_SUBMIT";

  if (sudahSelesai && pengerjaanAwal) {
    // U-25: murid boleh buka kembali (lihat soal/jawaban/kunci/nilai/komentar) kalau mode
    // Latihan (selalu), atau mode Ujian setelah jadwal akses berakhir untuk seluruh kelas —
    // supaya tak bocor ke teman yang belum selesai mengerjakan.
    const adaEsai = ujian.soal.some((us) => us.soal.jenis === "ESAI");
    const jadwalBerakhir = !ujian.jamSelesai || now > new Date(ujian.jamSelesai);
    const nilaiSiapTampil = !adaEsai || pengerjaanAwal.koreksiDikonfirmasi;
    // 1.21, diperluas 1.23 (dulu boolean tampilkanHasilSetelahSubmit, sekarang 3 mode) — guru atur
    // KAPAN hasil boleh dilihat murid, mis. utk UTS/UAS lintas kelas beda jadwal supaya kelas yg
    // belum ujian tak kebocoran kunci dari kelas yg sudah submit duluan.
    const modeHasilTerpenuhi =
      ujian.modeHasil === "OTOMATIS_SUBMIT"
        ? nilaiSiapTampil
        : ujian.modeHasil === "JADWAL_MANUAL"
          ? !!ujian.jadwalHasilManual && now >= new Date(ujian.jadwalHasilManual) && nilaiSiapTampil
          : jadwalBerakhir && nilaiSiapTampil; // SETELAH_JADWAL_BERAKHIR (default)
    const bolehReview = ujian.jenis === "LATIHAN" || modeHasilTerpenuhi;

    if (bolehReview) {
      const urutanSoalId: string[] = JSON.parse(pengerjaanAwal.soalUrutan);
      const jawabanMap = new Map(pengerjaanAwal.jawaban.map((j) => [j.soalId, j]));
      const ujianSoalMap = new Map(ujian.soal.map((us) => [us.soalId, us]));

      return (
        <AppShell groups={NAV_MURID} activeHref="/murid/ujian" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle={ujian.judul} pageSubtitle={`Nilai: ${pengerjaanAwal.nilaiTotal ?? "—"}`}>
          {pengerjaanAwal.komentarGuru && (
            <div className="mb-4"><Callout>💬 Catatan guru: {pengerjaanAwal.komentarGuru}</Callout></div>
          )}
          <div className="flex flex-col gap-3 mb-4">
            {urutanSoalId.map((soalId, i) => {
              const us = ujianSoalMap.get(soalId);
              const j = jawabanMap.get(soalId);
              if (!us || !j) return null;
              const opsiArr: string[] = us.soal.opsi ? JSON.parse(us.soal.opsi) : [];
              return (
                <div key={soalId} className="bg-paper-raised border border-rule rounded-xl p-4">
                  <p className="text-xs text-ink-soft mb-1">Soal {i + 1} · {us.poin} poin{j.skor !== null ? ` · skormu: ${j.skor}` : ""}</p>
                  <SoalHtml html={us.soal.pertanyaan} className="text-sm font-medium mb-2" />
                  {(us.soal.jenis === "PILIHAN_GANDA" || us.soal.jenis === "PILIHAN_GANDA_MINUS") && (
                    <div className="flex flex-col gap-1">
                      {opsiArr.map((o, oi) => {
                        const isKunci = String(oi) === us.soal.kunciJawaban;
                        const isDipilih = j.jawabanPG === oi;
                        return (
                          <div key={oi} className={"text-xs px-2.5 py-1.5 rounded-md border " + (isKunci ? "border-success bg-success-tint text-success font-semibold" : isDipilih ? "border-danger bg-danger-tint text-danger" : "border-rule text-ink-soft")}>
                            {o} {isKunci && "✓ jawaban benar"} {isDipilih && !isKunci && "← jawabanmu"}
                          </div>
                        );
                      })}
                      {us.soal.jenis === "PILIHAN_GANDA_MINUS" && j.jawabanPG !== null && j.benar === false && (
                        <p className="text-xs text-danger">Salah — nilai dipotong sesuai pengaturan soal ini.</p>
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
          <LinkButton href="/murid/ujian" variant="ghost">← Kembali ke daftar ujian</LinkButton>
        </AppShell>
      );
    }

    return (
      <AppShell groups={NAV_MURID} activeHref="/murid/ujian" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle={ujian.judul}>
        <Callout>
          ✓ Kamu sudah menyelesaikan ujian ini.{" "}
          {!jadwalBerakhir
            ? "Soal, jawaban, dan nilai bisa dilihat lagi setelah jadwal ujian ini berakhir."
            : "Nilai sedang dikoreksi guru, akan tampil begitu selesai."}
        </Callout>
        <div className="mt-4"><LinkButton href="/murid/ujian" variant="ghost">← Kembali ke daftar ujian</LinkButton></div>
      </AppShell>
    );
  }

  if (ujian.jenis === "UJIAN" && (belumBuka || sudahTutup)) {
    return (
      <AppShell groups={NAV_MURID} activeHref="/murid/ujian" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle={ujian.judul}>
        <Callout tone="warn">
          {belumBuka ? "Ujian ini belum dibuka." : "Waktu akses ujian ini sudah berakhir."}
        </Callout>
        <div className="mt-4"><LinkButton href="/murid/ujian" variant="ghost">← Kembali ke daftar ujian</LinkButton></div>
      </AppShell>
    );
  }

  const pengerjaan = await getOrCreatePengerjaan(ujian.id, siswa.id);
  if (!pengerjaan) return null;

  const soalUrutanIds: string[] = JSON.parse(pengerjaan.soalUrutan);
  const soalMap = new Map(ujian.soal.map((us) => [us.soalId, us]));
  const jawabanMap = new Map(pengerjaan.jawaban.map((j) => [j.soalId, j]));

  const soalTampil: SoalTampil[] = soalUrutanIds.map((soalId) => {
    const us = soalMap.get(soalId)!;
    const jawaban = jawabanMap.get(soalId);
    let opsiTampil: { originalIndex: number; text: string }[] | undefined;
    if ((us.soal.jenis === "PILIHAN_GANDA" || us.soal.jenis === "PILIHAN_GANDA_MINUS" || us.soal.jenis === "PILIHAN_GANDA_KOMPLEKS") && us.soal.opsi) {
      const opsiAsli: string[] = JSON.parse(us.soal.opsi);
      const urutan: number[] = jawaban?.opsiUrutan ? JSON.parse(jawaban.opsiUrutan) : opsiAsli.map((_, i) => i);
      opsiTampil = urutan.map((origIdx) => ({ originalIndex: origIdx, text: opsiAsli[origIdx] }));
    }
    return {
      soalId,
      jenis: us.soal.jenis,
      pertanyaan: us.soal.pertanyaan,
      poin: us.poin,
      opsiTampil,
      jawabanPGTersimpan: jawaban?.jawabanPG ?? null,
      jawabanPGMultiTersimpan: jawaban?.jawabanPGMulti ? JSON.parse(jawaban.jawabanPGMulti) : null,
      jawabanTeksTersimpan: jawaban?.jawabanTeks ?? null,
      durasiDetik: us.soal.durasiDetik,
    };
  });

  const batasWaktuIso = ujian.durasiMenit
    ? new Date((pengerjaan.waktuMulai ?? new Date()).getTime() + ujian.durasiMenit * 60000).toISOString()
    : ujian.jamSelesai
    ? new Date(ujian.jamSelesai).toISOString()
    : null;

  return (
    <PengerjaanUjianClient
      pengerjaanId={pengerjaan.id}
      judul={ujian.judul}
      kelasNama={ujian.kelas.nama}
      siswaNama={siswa.nama}
      nisn={siswa.nisn}
      soal={soalTampil}
      batasWaktuIso={batasWaktuIso}
    />
  );
}
