import { getSession } from "@/lib/auth";
import { getUjianDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ModeHasilField } from "@/components/ModeHasilField";
import { notFound } from "next/navigation";

function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function PengaturanUjianPage({ params }: { params: Promise<{ id: string }> }) {
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
      pageTitle={`Pengaturan — ${ujian.judul}`}
      pageSubtitle="Tentukan perilaku ujian saat dikerjakan murid"
    >
      <div className="mb-4">
        <Callout tone="info">💾 Perubahan di halaman ini tersimpan otomatis sebagai draft — kamu bisa tinggalkan halaman ini kapan saja tanpa kehilangan progres.</Callout>
      </div>

      <form action="/api/ujian/pengaturan" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-xl">
        <input type="hidden" name="ujianId" value={ujian.id} />

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Judul ujian</label>
          <input name="judul" defaultValue={ujian.judul} required className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
          <p className="text-[11px] text-ink-soft">Bisa diubah kapan saja, mis. setelah "Duplikat ke kelas lain" masih otomatis dikasih akhiran "(salinan)".</p>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Mode</label>
          <select name="jenis" defaultValue={ujian.jenis} className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
            <option value="UJIAN">Ujian (dinilai, sekali akses)</option>
            <option value="LATIHAN">Latihan Soal (boleh diulang, tak formal)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Jadwal akses per kelas (U-8, bisa beda per kelas — 1.6)</label>
          <div className="flex flex-col gap-3 bg-paper border border-rule rounded-lg p-3">
            {ujian.kelas.map((uk) => (
              <div key={uk.id} className="grid grid-cols-2 gap-3">
                <div className="col-span-2 text-xs font-semibold text-ink-soft">Kelas {uk.kelas.nama}</div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-ink-soft">Jam buka</label>
                  <input type="datetime-local" name={`jamMulai_${uk.id}`} defaultValue={toLocalInput(uk.jamMulai)} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-ink-soft">Jam tutup</label>
                  <input type="datetime-local" name={`jamSelesai_${uk.id}`} defaultValue={toLocalInput(uk.jamSelesai)} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Durasi pengerjaan (menit, opsional)</label>
          <input type="number" name="durasiMenit" defaultValue={ujian.durasiMenit ?? ""} placeholder="mis. 60" className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm w-40" />
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="acakSoal" defaultChecked={ujian.acakSoal} />
            Acak urutan soal per murid
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="acakJawaban" defaultChecked={ujian.acakJawaban} />
            Acak urutan pilihan jawaban (PG) per murid
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="sekaliAkses" defaultChecked={ujian.sekaliAkses} />
            Sekali akses — tak bisa diulang (otomatis nonaktif untuk mode Latihan)
          </label>
        </div>

        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-xs font-semibold">Kapan hasil (jawaban benar/salah &amp; poin) boleh dilihat murid</label>
          <ModeHasilField defaultModeHasil={ujian.modeHasil} defaultJadwalHasilManual={toLocalInput(ujian.jadwalHasilManual)} />
        </div>

        <Callout tone="warn">
          ⚠ Jika murid keluar/menutup halaman saat mengerjakan, ujian otomatis dianggap <b>selesai</b> — jawaban yang sudah diisi otomatis dikumpulkan.
        </Callout>

        <div className="mt-5">
          <Button type="submit">Lanjut ke preview & konfirmasi →</Button>
        </div>
      </form>
    </AppShell>
  );
}
