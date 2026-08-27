import { getSession } from "@/lib/auth";
import { getSekolahDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { Card, StatCard } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function SuperadminSekolahDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; kepsek_dibuat?: string; email?: string; password?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;

  const detail = await getSekolahDetail(id);
  if (!detail) notFound();
  const { sekolah, pengguna, siswa, kelas, tahunAjaran } = detail;
  const sudahPunyaKepsek = pengguna.some((p) => p.peran === "KEPALA_SEKOLAH");

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/sekolah"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={sekolah.nama}
      pageSubtitle={`${sekolah.jenjang} · terdaftar ${formatTanggal(sekolah.createdAt)}`}
    >
      <a href="/superadmin/sekolah" className="text-xs font-semibold text-primary-deep hover:underline mb-4 inline-block">← Semua sekolah</a>

      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.kepsek_dibuat && (
        <div className="mb-4">
          <Callout>
            ✓ Akun kepala sekolah dibuat. Login: <b>{sp.email}</b> / password sementara <b>{sp.password}</b> — sampaikan ke sekolah & minta diganti setelah login pertama.
          </Callout>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Status" value={sekolah.aktif ? "Aktif" : "Nonaktif"} tone={sekolah.aktif ? "good" : "warn"} />
        <StatCard label="Siswa aktif" value={String(siswa)} />
        <StatCard label="Kelas" value={String(kelas)} />
        <StatCard label="Pengguna" value={String(pengguna.length)} />
      </div>

      {(sekolah.npsn || sekolah.alamat) && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold mb-3">Data Sekolah</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {sekolah.npsn && <div><span className="text-ink-soft text-xs block">NPSN</span>{sekolah.npsn}</div>}
            {sekolah.alamat && <div className="md:col-span-2"><span className="text-ink-soft text-xs block">Alamat</span>{sekolah.alamat}</div>}
            {sekolah.kecamatan && <div><span className="text-ink-soft text-xs block">Kecamatan</span>{sekolah.kecamatan}</div>}
            {sekolah.kabupatenKota && <div><span className="text-ink-soft text-xs block">Kabupaten/Kota</span>{sekolah.kabupatenKota}</div>}
            {sekolah.provinsi && <div><span className="text-ink-soft text-xs block">Provinsi</span>{sekolah.provinsi}</div>}
            {sekolah.kodePos && <div><span className="text-ink-soft text-xs block">Kode Pos</span>{sekolah.kodePos}</div>}
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-3">Lokasi (peta sebaran sekolah)</h3>
        <p className="text-xs text-ink-soft mb-3">
          {sekolah.latitude !== null && sekolah.longitude !== null
            ? `Koordinat: ${sekolah.latitude}, ${sekolah.longitude}`
            : "Belum diisi — sekolah ini tak akan muncul di tampilan Peta pada daftar sekolah."}
        </p>
        <form action="/api/superadmin/sekolah/lokasi" method="POST" className="grid md:grid-cols-3 gap-2 max-w-lg">
          <input type="hidden" name="sekolahId" value={sekolah.id} />
          <input name="latitude" type="number" step="any" defaultValue={sekolah.latitude ?? ""} placeholder="Latitude" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <input name="longitude" type="number" step="any" defaultValue={sekolah.longitude ?? ""} placeholder="Longitude" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <Button type="submit" size="sm">Simpan lokasi</Button>
        </form>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-3">Tahun ajaran</h3>
        {tahunAjaran.length === 0 && <p className="text-xs text-ink-soft">Belum ada tahun ajaran.</p>}
        <div className="flex flex-col gap-1.5">
          {tahunAjaran.map((ta) => (
            <div key={ta.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-1.5">
              <span>{ta.label} — Semester {ta.semester}</span>
              {ta.aktif && <Pill tone="ok">Aktif</Pill>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Pengguna ({pengguna.length})</h3>

        {!sudahPunyaKepsek && (
          <details className="bg-paper border border-rule rounded-lg p-4 mb-4">
            <summary className="cursor-pointer font-semibold text-xs text-primary-deep">+ Tambah akun kepala sekolah</summary>
            <form action="/api/superadmin/sekolah/kepsek" method="POST" className="flex flex-col gap-2 mt-3 max-w-sm">
              <input type="hidden" name="sekolahId" value={sekolah.id} />
              <input name="kepsekNama" required placeholder="Nama kepala sekolah" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
              <input name="kepsekEmail" required type="email" placeholder="Email login" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
              <select name="jenisKelamin" defaultValue="" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
                <option value="">Jenis kelamin (opsional)</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
              <Button type="submit" size="sm" className="self-start">Buat akun</Button>
            </form>
          </details>
        )}

        <div className="bg-paper border border-rule rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2 font-bold">Nama</th>
                <th className="text-left px-4 py-2 font-bold">Email</th>
                <th className="text-left px-4 py-2 font-bold">Peran</th>
                <th className="text-left px-4 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {pengguna.map((p) => (
                <tr key={p.id} className="border-t border-rule">
                  <td className="px-4 py-2 font-semibold">{p.nama}</td>
                  <td className="px-4 py-2 text-ink-soft">{p.email}</td>
                  <td className="px-4 py-2">{ROLE_LABEL[p.peran] ?? p.peran}</td>
                  <td className="px-4 py-2"><Pill tone={p.aktif ? "ok" : "neutral"}>{p.aktif ? "Aktif" : "Nonaktif"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
