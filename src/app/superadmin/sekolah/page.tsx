import { getSession } from "@/lib/auth";
import { getSemuaSekolahDenganStats } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TampilanTabelPeta } from "./TampilanTabelPeta";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";

const SEKOLAH_PER_HALAMAN = 20;

export default async function SuperadminSekolahListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sekolah_dibuat?: string; halaman?: string; cari?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const semuaSekolahMentah = await getSemuaSekolahDenganStats();

  // 1.21 — search nama sekolah, diterapkan sebelum pagination (dan ikut membatasi marker peta,
  // bukan cuma tabel) supaya konsisten di kedua tampilan.
  const cari = (sp.cari ?? "").trim().toLowerCase();
  const semuaSekolah = cari ? semuaSekolahMentah.filter((s) => s.sekolah.nama.toLowerCase().includes(cari)) : semuaSekolahMentah;

  // 1.14, diminta eksplisit — pagination di daftar sekolah, pola sama dgn halaman lain (mis.
  // Mutasi Siswa) yang sudah punya banyak baris: iris di memori, bukan query ulang ke DB.
  const totalHalaman = Math.max(1, Math.ceil(semuaSekolah.length / SEKOLAH_PER_HALAMAN));
  const halamanAman = Math.min(totalHalaman, Math.max(1, Number(sp.halaman) || 1));
  const sekolahList = semuaSekolah.slice((halamanAman - 1) * SEKOLAH_PER_HALAMAN, halamanAman * SEKOLAH_PER_HALAMAN);
  const hrefHalaman = (h: number) => `?cari=${encodeURIComponent(sp.cari ?? "")}&halaman=${h}`;

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/sekolah"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kelola Sekolah"
      pageSubtitle={`${semuaSekolahMentah.length} sekolah terdaftar di Selaras Ajar`}
      headerAction={<LinkButton href="/superadmin/sekolah/tambah" size="sm">+ Tambah Sekolah</LinkButton>}
      lebarPenuh
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.sekolah_dibuat && (
        <div className="mb-4">
          <Callout>
            ✓ Sekolah baru dibuat. Belum ada akun kepala sekolah — buka halaman sekolah ini untuk menambahkannya.
          </Callout>
        </div>
      )}

      <form method="GET" className="mb-4 flex items-center gap-2">
        <input
          name="cari"
          defaultValue={sp.cari ?? ""}
          placeholder="Cari nama sekolah…"
          className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm w-72"
        />
        <Button type="submit" size="sm" variant="ghost">Cari</Button>
      </form>

      <TampilanTabelPeta sekolahList={sekolahList} semuaSekolah={semuaSekolah} />

      <Pagination halaman={halamanAman} totalHalaman={totalHalaman} hrefHalaman={hrefHalaman} />
    </AppShell>
  );
}
