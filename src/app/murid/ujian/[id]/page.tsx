import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getUjianDetail } from "@/lib/data";
import { getOrCreatePengerjaan } from "@/lib/ujian-helpers";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { LinkButton } from "@/components/ui/Button";
import PengerjaanUjianClient, { type SoalTampil } from "@/components/PengerjaanUjianClient";

export default async function KerjakanUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const ujian = await getUjianDetail(id);
  if (!ujian || ujian.kelasId !== siswa.kelasId || ujian.status !== "PUBLISHED") {
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

  if (sudahSelesai) {
    return (
      <AppShell groups={NAV_MURID} activeHref="/murid/ujian" userName={session.nama} userRoleLabel={ROLE_LABEL[session.peran]} pageTitle={ujian.judul}>
        <Callout>
          ✓ Kamu sudah menyelesaikan ujian ini{pengerjaanAwal?.nilaiTotal !== null ? ` — nilai sementara: ${pengerjaanAwal?.nilaiTotal}` : ""}.
          {ujian.jenis === "UJIAN" && " Ujian bersifat sekali akses, tidak bisa dikerjakan ulang."}
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
    if (us.soal.jenis === "PILIHAN_GANDA" && us.soal.opsi) {
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
      jawabanTeksTersimpan: jawaban?.jawabanTeks ?? null,
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
