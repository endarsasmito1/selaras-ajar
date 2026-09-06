import { getSession } from "@/lib/auth";
import { getSekolahDetail } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { Card, StatCard } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Drawer } from "@/components/ui/Drawer";
import { Pagination } from "@/components/ui/Pagination";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

const PENGGUNA_PER_HALAMAN = 20;
const PERAN_FILTER_LIST = ["KEPALA_SEKOLAH", "BENDAHARA", "TU", "GURU", "ORANG_TUA", "MURID"];

export default async function SuperadminSekolahDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    kepsek_dibuat?: string;
    email?: string;
    password?: string;
    cariPengguna?: string;
    peranFilter?: string;
    halPengguna?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;

  const detail = await getSekolahDetail(id);
  if (!detail) notFound();
  const { sekolah, pengguna, siswa, kelas, tahunAjaran } = detail;
  const sudahPunyaKepsek = pengguna.some((p) => p.peran === "KEPALA_SEKOLAH");

  // Filter & search diterapkan di memori (jumlah pengguna per sekolah gak akan sebesar itu),
  // pola sama dgn search nama sekolah di daftar sekolah (1.21).
  const cariPengguna = (sp.cariPengguna ?? "").trim().toLowerCase();
  const peranFilter = sp.peranFilter ?? "";
  const penggunaTersaring = pengguna.filter((p) => {
    const cocokCari = !cariPengguna || p.nama.toLowerCase().includes(cariPengguna) || p.email.toLowerCase().includes(cariPengguna);
    const cocokPeran = !peranFilter || p.peran === peranFilter;
    return cocokCari && cocokPeran;
  });
  const totalHalPengguna = Math.max(1, Math.ceil(penggunaTersaring.length / PENGGUNA_PER_HALAMAN));
  const halPenggunaAman = Math.min(totalHalPengguna, Math.max(1, Number(sp.halPengguna) || 1));
  const penggunaHalIni = penggunaTersaring.slice(
    (halPenggunaAman - 1) * PENGGUNA_PER_HALAMAN,
    halPenggunaAman * PENGGUNA_PER_HALAMAN
  );
  const hrefHalPengguna = (h: number) =>
    `?cariPengguna=${encodeURIComponent(sp.cariPengguna ?? "")}&peranFilter=${encodeURIComponent(peranFilter)}&halPengguna=${h}#pengguna`;

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

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {(sekolah.npsn || sekolah.alamat) && (
          <Card>
            <h3 className="text-sm font-semibold mb-3">Data Sekolah</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {sekolah.npsn && <div><span className="text-ink-soft text-xs block">NPSN</span>{sekolah.npsn}</div>}
              {sekolah.alamat && <div className="col-span-2"><span className="text-ink-soft text-xs block">Alamat</span>{sekolah.alamat}</div>}
              {sekolah.kecamatan && <div><span className="text-ink-soft text-xs block">Kecamatan</span>{sekolah.kecamatan}</div>}
              {sekolah.kabupatenKota && <div><span className="text-ink-soft text-xs block">Kabupaten/Kota</span>{sekolah.kabupatenKota}</div>}
              {sekolah.provinsi && <div><span className="text-ink-soft text-xs block">Provinsi</span>{sekolah.provinsi}</div>}
              {sekolah.kodePos && <div><span className="text-ink-soft text-xs block">Kode Pos</span>{sekolah.kodePos}</div>}
            </div>
          </Card>
        )}

        <Card>
          <h3 className="text-sm font-semibold mb-3">Lokasi (peta sebaran sekolah)</h3>
          <p className="text-xs text-ink-soft mb-3">
            {sekolah.latitude !== null && sekolah.longitude !== null
              ? `Koordinat: ${sekolah.latitude}, ${sekolah.longitude}`
              : "Belum diisi — sekolah ini tak akan muncul di tampilan Peta pada daftar sekolah."}
          </p>
          <form action="/api/superadmin/sekolah/lokasi" method="POST" className="flex flex-col gap-2">
            <input type="hidden" name="sekolahId" value={sekolah.id} />
            <div className="grid grid-cols-2 gap-2">
              <input name="latitude" type="number" step="any" defaultValue={sekolah.latitude ?? ""} placeholder="Latitude" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <input name="longitude" type="number" step="any" defaultValue={sekolah.longitude ?? ""} placeholder="Longitude" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
            <Button type="submit" size="sm" className="self-start">Simpan lokasi</Button>
          </form>
        </Card>
      </div>

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

      <div id="pengguna" />
      <Card>
        <h3 className="text-sm font-semibold mb-3">Pengguna ({pengguna.length})</h3>

        {!sudahPunyaKepsek && (
          <Drawer triggerLabel="+ Tambah akun kepala sekolah" eyebrow="Sekolah" title="Tambah akun kepala sekolah">
            <form action="/api/superadmin/sekolah/kepsek" method="POST" className="flex flex-col gap-2">
              <input type="hidden" name="sekolahId" value={sekolah.id} />
              <input name="kepsekNama" required placeholder="Nama kepala sekolah" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
              <input name="kepsekEmail" required type="email" placeholder="Email login" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
              <select name="jenisKelamin" defaultValue="" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
                <option value="">Jenis kelamin (opsional)</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
              <div className="border-b border-rule my-1" />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Buat akun</Button>
                <Button type="submit" formMethod="dialog" variant="ghost" size="sm">Batal</Button>
              </div>
            </form>
          </Drawer>
        )}

        <form method="GET" className="mb-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="halPengguna" value="1" />
          <input
            name="cariPengguna"
            defaultValue={sp.cariPengguna ?? ""}
            placeholder="Cari nama/email pengguna…"
            className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm w-64"
          />
          <select name="peranFilter" defaultValue={peranFilter} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
            <option value="">Semua peran</option>
            {PERAN_FILTER_LIST.map((p) => (
              <option key={p} value={p}>{ROLE_LABEL[p] ?? p}</option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="ghost">Terapkan</Button>
          {(cariPengguna || peranFilter) && (
            <LinkButton href="?halPengguna=1#pengguna" size="sm" variant="ghost">Reset</LinkButton>
          )}
        </form>

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
              {penggunaHalIni.map((p) => (
                <tr key={p.id} className="border-t border-rule">
                  <td className="px-4 py-2 font-semibold">{p.nama}</td>
                  <td className="px-4 py-2 text-ink-soft">{p.email}</td>
                  <td className="px-4 py-2">{ROLE_LABEL[p.peran] ?? p.peran}</td>
                  <td className="px-4 py-2"><Pill tone={p.aktif ? "ok" : "neutral"}>{p.aktif ? "Aktif" : "Nonaktif"}</Pill></td>
                </tr>
              ))}
              {penggunaHalIni.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-soft text-xs">Tidak ada pengguna yang cocok.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination halaman={halPenggunaAman} totalHalaman={totalHalPengguna} hrefHalaman={hrefHalPengguna} />
      </Card>
    </AppShell>
  );
}
