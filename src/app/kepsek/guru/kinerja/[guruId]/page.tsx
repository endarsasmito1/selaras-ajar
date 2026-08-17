import { getSession } from "@/lib/auth";
import { getKinerjaGuru } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Card, CardHead, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { formatTanggal } from "@/lib/utils";

export default async function KinerjaGuruDetailPage({ params }: { params: Promise<{ guruId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { guruId } = await params;

  const guru = await prisma.pengguna.findUnique({ where: { id: guruId } });
  if (!guru) return null;
  const kinerja = await getKinerjaGuru(guruId);

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/guru/kinerja"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Kinerja — ${guru.nama}`}
      pageSubtitle={`${kinerja.kelasDiampu} kelas diampu · ${kinerja.jumlahSiswa} siswa`}
    >
      <Callout tone="warn">
        ⚠ Angka di bawah fokus ke hal yang guru kendalikan (ketertiban &amp; keaktifan). Indikator kelas ditampilkan sebagai <b>konteks, bukan vonis</b> — gunakan untuk pembinaan, bukan menghukum sepihak.
      </Callout>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-5">
        <StatCard label="Hari absensi terisi" value={String(kinerja.hariAbsensiTerisi)} />
        <StatCard label="Nilai diinput" value={String(kinerja.jumlahNilaiDiinput)} />
        <StatCard label="Materi diunggah" value={String(kinerja.jumlahMateriDiunggah)} />
        <StatCard label="Ujian dibuat" value={String(kinerja.jumlahUjianDibuat)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHead title="Aktivitas mengajar" />
          <div className="flex justify-between text-sm border-b border-rule py-2"><span>Tugas dibuat</span><b className="tabnum">{kinerja.jumlahTugasDibuat}</b></div>
          <div className="flex justify-between text-sm py-2"><span>Pengumpulan sudah dinilai</span><b className="tabnum">{kinerja.tugasDinilai}</b></div>
        </Card>
        <Card>
          <CardHead title="Indikator kelas" subtitle="Konteks, bukan vonis" />
          <div className="flex justify-between text-sm border-b border-rule py-2">
            <span>Rata-rata kehadiran kelas</span>
            <b className="tabnum">{kinerja.persenKehadiranKelas !== null ? `${kinerja.persenKehadiranKelas}%` : "data belum memadai"}</b>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHead title="Catatan supervisi" subtitle="Penilaian kualitatif — hal yang tak terukur angka" />
        <div className="flex flex-col gap-2 mb-4">
          {kinerja.catatanSupervisi.length === 0 && <p className="text-xs text-ink-soft">Belum ada catatan.</p>}
          {kinerja.catatanSupervisi.map((c) => (
            <div key={c.id} className="bg-paper border border-rule rounded-lg p-3 text-sm">
              <p>{c.catatan}</p>
              <p className="text-xs text-ink-soft mt-1.5">— {c.kepsek.nama}, {formatTanggal(c.createdAt)}</p>
            </div>
          ))}
        </div>
        <form action="/api/supervisi" method="POST" className="flex flex-col gap-2">
          <input type="hidden" name="guruId" value={guruId} />
          <textarea name="catatan" required rows={2} placeholder="Tulis catatan observasi/supervisi…" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <Button type="submit" size="sm" className="self-start">+ Tambah catatan supervisi</Button>
        </form>
      </Card>
    </AppShell>
  );
}
