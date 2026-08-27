import { getSession } from "@/lib/auth";
import { getKinerjaGuru, getMuridDiajarGuru, getDaftarTahunAjaran } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Card, CardHead, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Pill } from "@/components/ui/Pill";
import { Pagination } from "@/components/ui/Pagination";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

const MURID_PER_HALAMAN = 10;

export default async function KinerjaGuruDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ guruId: string }>;
  searchParams: Promise<{ tahun?: string; halaman?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { guruId } = await params;
  const sp = await searchParams;

  const guru = await prisma.pengguna.findFirst({ where: { id: guruId, sekolahId: session.sekolahId } });
  if (!guru) notFound();

  const daftarTahun = await getDaftarTahunAjaran(session.sekolahId);
  const tahunDipilih = sp.tahun || daftarTahun.find((t) => t.aktif)?.id || daftarTahun[0]?.id;

  const [kinerja, muridDiajar] = await Promise.all([
    getKinerjaGuru(guruId, tahunDipilih),
    getMuridDiajarGuru(guruId),
  ]);
  const tahunAjaranLabel = daftarTahun.find((t) => t.id === tahunDipilih);

  // Search nama murid, diterapkan sebelum pagination.
  const q = (sp.q ?? "").trim().toLowerCase();
  const muridTersaring = q ? muridDiajar.detail.filter((d) => d.siswa.nama.toLowerCase().includes(q)) : muridDiajar.detail;

  // 1.8, diminta eksplisit (MG-5): tabel murid dipaginasi, bukan satu tabel panjang tanpa batas.
  const totalHalamanMurid = Math.max(1, Math.ceil(muridTersaring.length / MURID_PER_HALAMAN));
  const halamanMurid = Math.min(totalHalamanMurid, Math.max(1, Number(sp.halaman) || 1));
  const muridHalamanIni = muridTersaring.slice(
    (halamanMurid - 1) * MURID_PER_HALAMAN,
    halamanMurid * MURID_PER_HALAMAN
  );
  const hrefHalaman = (h: number) => `?tahun=${tahunDipilih}&q=${encodeURIComponent(sp.q ?? "")}&halaman=${h}`;

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/guru/kinerja"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Kinerja — ${guru.nama}`}
      pageSubtitle={`${kinerja.jumlahSiswa} siswa${tahunAjaranLabel ? ` · ${tahunAjaranLabel.label} (${tahunAjaranLabel.semester})` : ""}`}
      headerAction={
        <form method="GET" className="flex items-center gap-1.5">
          <label className="text-xs text-ink-soft">Tahun ajaran:</label>
          <select
            name="tahun"
            defaultValue={tahunDipilih}
            className="bg-paper-raised border border-rule rounded-lg px-2.5 py-1.5 text-xs"
          >
            {daftarTahun.map((t) => (
              <option key={t.id} value={t.id}>{t.label} — {t.semester}{t.aktif ? " (aktif)" : ""}</option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="ghost">Tampilkan</Button>
        </form>
      }
    >
      {daftarTahun.length > 1 && (
        <div className="mb-4">
          <Callout tone="info">
            📅 Menampilkan riwayat kinerja untuk <b>{tahunAjaranLabel?.label} — {tahunAjaranLabel?.semester}</b> (1.7, diminta eksplisit). Ganti tahun ajaran di atas untuk lihat riwayat tahun-tahun sebelumnya. Bagian &quot;Murid yang diajar&quot; di bawah selalu menampilkan penugasan **saat ini**, tak berubah mengikuti tahun ajaran yang dipilih.
          </Callout>
        </div>
      )}
      <Callout tone="warn">
        ⚠ Angka di bawah fokus ke hal yang guru kendalikan (ketertiban &amp; keaktifan). Indikator kelas ditampilkan sebagai <b>konteks, bukan vonis</b> — gunakan untuk pembinaan, bukan menghukum sepihak.
      </Callout>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-5">
        <StatCard label="Hari absensi terisi" value={String(kinerja.hariAbsensiTerisi)} />
        <StatCard label="Nilai diinput" value={String(kinerja.jumlahNilaiDiinput)} />
        <StatCard label="Materi diunggah" value={String(kinerja.jumlahMateriDiunggah)} />
        <StatCard label="Ujian dibuat" value={String(kinerja.jumlahUjianDibuat)} />
      </div>

      <Card className="mb-5">
        <CardHead title={`Kelas yang diampu (${kinerja.kelasDiampuList.length})`} />
        <div className="flex flex-wrap gap-1.5">
          {kinerja.kelasDiampuList.map((k) => (
            <span key={k.id} className="text-xs bg-primary-tint text-primary-deep px-2.5 py-1 rounded-full font-semibold">{k.nama}</span>
          ))}
          {kinerja.kelasDiampuList.length === 0 && <p className="text-xs text-ink-soft">Belum ada kelas diampu di tahun ajaran ini.</p>}
        </div>
      </Card>

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

      <Card className="mt-4">
        <CardHead
          title="Murid yang diajar"
          subtitle={`Ringkasan performa ${muridDiajar.totalMurid} murid lintas kelas/mapel yang diampu (MG-5, 1.6) — konteks, bukan vonis`}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <StatCard label="Total murid diajar" value={String(muridDiajar.totalMurid)} />
          <StatCard label="Rata-rata nilai keseluruhan" value={muridDiajar.rataRataKeseluruhan !== null ? String(muridDiajar.rataRataKeseluruhan) : "—"} />
          <StatCard label="Perlu perhatian" value={String(muridDiajar.perluPerhatianCount)} tone={muridDiajar.perluPerhatianCount > 0 ? "warn" : undefined} />
        </div>
        <form method="GET" className="flex items-center gap-1.5 mb-3">
          <input type="hidden" name="tahun" value={tahunDipilih} />
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari nama murid…"
            className="flex-1 bg-paper border border-rule rounded-lg px-3 py-1.5 text-xs max-w-xs"
          />
          <Button type="submit" size="sm" variant="ghost">Cari</Button>
        </form>
        <div className="bg-paper border border-rule rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-3 py-2 font-bold">Murid</th>
                <th className="text-left px-3 py-2 font-bold">Kelas</th>
                <th className="text-left px-3 py-2 font-bold">Rata-rata nilai</th>
                <th className="text-left px-3 py-2 font-bold">Kehadiran</th>
                <th className="text-left px-3 py-2 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {muridHalamanIni.map((d) => (
                <tr key={d.siswa.id} className="border-t border-rule">
                  <td className="px-3 py-2 font-semibold">{d.siswa.nama}</td>
                  <td className="px-3 py-2">{d.siswa.kelas.nama}</td>
                  <td className="px-3 py-2 tabnum">{d.rataNilai ?? "—"}</td>
                  <td className="px-3 py-2 tabnum">{d.persenHadir !== null ? `${d.persenHadir}%` : "—"}</td>
                  <td className="px-3 py-2">
                    {d.perluPerhatian ? <Pill tone="warn">Perlu perhatian</Pill> : <Pill tone="ok">Baik</Pill>}
                  </td>
                </tr>
              ))}
              {muridTersaring.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-ink-soft text-xs">{q ? "Tidak ada murid yang cocok." : "Belum ada murid yang diajar."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination halaman={halamanMurid} totalHalaman={totalHalamanMurid} hrefHalaman={hrefHalaman} />
      </Card>
    </AppShell>
  );
}
