import { getSession } from "@/lib/auth";
import { getUjianDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { formatTanggal } from "@/lib/utils";

const JENIS_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export default async function KonfirmasiUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const ujian = await getUjianDetail(id);
  if (!ujian) return null;
  const totalPoin = ujian.soal.reduce((s, x) => s + x.poin, 0);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Preview & Konfirmasi — ${ujian.judul}`}
      pageSubtitle="Semua detail masih bisa diedit dari sini sebelum diterbitkan"
    >
      {ujian.status === "PUBLISHED" && (
        <Callout>✓ Ujian ini sudah diterbitkan dan tampil di sisi murid.</Callout>
      )}

      <div className="bg-paper-raised border border-rule rounded-xl p-5 mt-4 mb-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-base font-semibold">Ringkasan pengaturan</h3>
          <LinkButton href={`/guru/ujian/${ujian.id}/pengaturan`} variant="ghost" size="sm">Edit pengaturan</LinkButton>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-paper border border-rule rounded-full px-3 py-1.5">{ujian.mapel.nama} · Kelas {ujian.kelas.nama}</span>
          <span className="bg-paper border border-rule rounded-full px-3 py-1.5">{ujian.soal.length} soal · {totalPoin} poin</span>
          <span className="bg-paper border border-rule rounded-full px-3 py-1.5">
            {ujian.jamMulai ? `🕐 ${formatTanggal(ujian.jamMulai)}` : "🕐 Belum dijadwalkan"}
          </span>
          {ujian.acakSoal && <span className="bg-paper border border-rule rounded-full px-3 py-1.5">🔀 Urutan soal diacak</span>}
          {ujian.acakJawaban && <span className="bg-paper border border-rule rounded-full px-3 py-1.5">🔀 Pilihan jawaban diacak</span>}
          {ujian.sekaliAkses && <span className="bg-paper border border-rule rounded-full px-3 py-1.5">1️⃣ Sekali akses</span>}
          {ujian.durasiMenit && <span className="bg-paper border border-rule rounded-full px-3 py-1.5">⏱ {ujian.durasiMenit} menit</span>}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-base font-semibold">Preview soal — persis seperti yang murid lihat</h3>
        <LinkButton href={`/guru/ujian/${ujian.id}/edit`} variant="ghost" size="sm">Edit soal</LinkButton>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {ujian.soal.map((us, i) => (
          <div key={us.id} className="bg-paper-raised border border-rule rounded-xl p-4">
            <div className="flex justify-between text-xs text-ink-soft mb-2">
              <span>Soal {i + 1} dari {ujian.soal.length}</span>
              <span>{JENIS_LABEL[us.soal.jenis]} · {us.poin} poin</span>
            </div>
            <p className="text-sm mb-2">{us.soal.pertanyaan}</p>
            {us.soal.jenis === "PILIHAN_GANDA" && us.soal.opsi && (
              <div className="grid grid-cols-2 gap-2">
                {(JSON.parse(us.soal.opsi) as string[]).map((o, oi) => (
                  <div key={oi} className="text-xs px-3 py-2 rounded-md border border-rule bg-paper flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-paper-sunken flex items-center justify-center font-bold">{String.fromCharCode(65 + oi)}</span>
                    {o}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {ujian.status === "DRAFT" ? (
        <form action="/api/ujian/publish" method="POST">
          <input type="hidden" name="ujianId" value={ujian.id} />
          <Button type="submit">✓ Terbitkan ujian ini</Button>
        </form>
      ) : (
        <div className="flex gap-3">
          <LinkButton href={`/guru/ujian/${ujian.id}`} variant="primary">Lihat hasil & analisis →</LinkButton>
        </div>
      )}
    </AppShell>
  );
}
