import { getSession } from "@/lib/auth";
import { getDaftarSiswa, getSemuaKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";

const SISWA_PER_HALAMAN = 25;

export default async function MutasiSiswaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; keluar?: string; masuk?: string; q?: string; halaman?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [semuaSiswa, kelas] = await Promise.all([
    getDaftarSiswa(session.sekolahId),
    getSemuaKelas(session.sekolahId),
  ]);

  // 1.8 — sekolah dengan banyak siswa aktif (300+) bikin halaman ini berat kalau semua
  // ConfirmDialog di-mount sekaligus; search + pagination membatasi jumlah yang benar-benar
  // dirender di satu waktu, tanpa mengubah data siswa pindah masuk (kolom kiri, tak terpengaruh).
  const q = (sp.q ?? "").trim().toLowerCase();
  const siswaTersaring = q ? semuaSiswa.filter((s) => s.nama.toLowerCase().includes(q)) : semuaSiswa;
  const totalHalaman = Math.max(1, Math.ceil(siswaTersaring.length / SISWA_PER_HALAMAN));
  const halamanAman = Math.min(totalHalaman, Math.max(1, Number(sp.halaman) || 1));
  const siswa = siswaTersaring.slice((halamanAman - 1) * SISWA_PER_HALAMAN, halamanAman * SISWA_PER_HALAMAN);
  const hrefHalaman = (h: number) => `?q=${encodeURIComponent(sp.q ?? "")}&halaman=${h}`;

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/siswa/mutasi"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Mutasi Siswa"
      pageSubtitle="Catat siswa pindah masuk atau keluar"
      headerAction={<LinkButton href="/kepsek/siswa/riwayat" variant="ghost" size="sm">Riwayat Siswa (lulus/keluar) →</LinkButton>}
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.keluar && <div className="mb-4"><Callout>✓ {sp.keluar} dimutasi keluar — datanya tersimpan di Riwayat Siswa.</Callout></div>}
      {sp.masuk && <div className="mb-4"><Callout>✓ {sp.masuk} ditambahkan sebagai siswa aktif.</Callout></div>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHead title="Siswa pindah masuk" subtitle="Tambah siswa baru dari sekolah lain" />
          <form action="/api/siswa/mutasi-masuk" method="POST" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">NISN</label>
              <input name="nisn" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Nama lengkap</label>
              <input name="nama" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Kelas</label>
                <select name="kelasId" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                  {kelas.map((k) => (<option key={k.id} value={k.id}>{k.nama}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Jenis kelamin</label>
                <select name="jenisKelamin" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
            </div>
            <Button type="submit" size="sm" className="self-start mt-1">Tambahkan sebagai siswa aktif</Button>
          </form>
        </Card>

        <Card>
          <CardHead title="Siswa pindah keluar" subtitle="Wajib isi keterangan & tanggal — dikonfirmasi lewat popup" />
          <form method="GET" className="flex items-center gap-1.5 mb-3">
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Cari nama siswa…"
              className="flex-1 bg-paper border border-rule rounded-lg px-3 py-1.5 text-xs"
            />
            <Button type="submit" size="sm" variant="ghost">Cari</Button>
          </form>
          <div className="flex flex-col gap-2 max-h-96 overflow-auto">
            {siswa.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-2">
                <span>{s.nama} <span className="text-ink-soft">— {s.kelas.nama}</span></span>
                <ConfirmDialog triggerLabel="Mutasi keluar" title={`Mutasi keluar — ${s.nama}?`}>
                  <form action="/api/siswa/mutasi-keluar" method="POST" className="flex flex-col gap-3">
                    <input type="hidden" name="siswaId" value={s.id} />
                    <p className="text-sm text-ink-soft">
                      Setelah dikonfirmasi, <b>{s.nama}</b> akan hilang dari daftar siswa aktif ({s.kelas.nama}) dan datanya
                      pindah ke Riwayat Siswa — histori tak akan hilang.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold">Tanggal keluar</label>
                      <input type="date" name="tanggalKeluar" required defaultValue={new Date().toISOString().slice(0, 10)} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold">Keterangan / alasan keluar</label>
                      <textarea name="keterangan" required rows={2} placeholder="mis. Pindah mengikuti orang tua ke Surabaya" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <Button type="submit" size="sm">Ya, mutasi keluar</Button>
                  </form>
                </ConfirmDialog>
              </div>
            ))}
            {siswa.length === 0 && <p className="text-xs text-ink-soft">{q ? "Tidak ada siswa yang cocok." : "Tidak ada siswa aktif."}</p>}
          </div>
          <Pagination halaman={halamanAman} totalHalaman={totalHalaman} hrefHalaman={hrefHalaman} />
        </Card>
      </div>
    </AppShell>
  );
}
