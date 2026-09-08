import { getSession } from "@/lib/auth";
import { getSemuaSekolahDenganStats } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SearchInput } from "@/components/ui/SearchInput";
import { TampilanTabelPeta } from "./TampilanTabelPeta";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";

const SEKOLAH_PER_HALAMAN = 20;
const JENJANG_LIST = ["SD", "SMP", "SMA", "SMK"];

export default async function SuperadminSekolahListPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    sekolah_dibuat?: string;
    halaman?: string;
    cari?: string;
    provinsi?: string;
    kota?: string;
    jenjang?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const semuaSekolahMentah = await getSemuaSekolahDenganStats();

  const provinsiList = Array.from(new Set(semuaSekolahMentah.map((s) => s.sekolah.provinsi).filter((v): v is string => !!v))).sort();

  // 1.21 — search nama sekolah + filter kota/provinsi/jenjang, diterapkan sebelum pagination
  // (dan ikut membatasi marker peta, bukan cuma tabel) supaya konsisten di kedua tampilan.
  const cari = (sp.cari ?? "").trim().toLowerCase();
  const provinsi = sp.provinsi ?? "";
  const kota = sp.kota ?? "";
  const jenjang = sp.jenjang ?? "";

  // Kota bergantung pada provinsi — belum bisa dipilih sebelum provinsi diisi, dan pilihannya
  // dibatasi cuma kota yang benar-benar ada di provinsi itu (bukan semua kota se-Indonesia).
  const kotaList = provinsi
    ? Array.from(
        new Set(
          semuaSekolahMentah
            .filter((s) => s.sekolah.provinsi === provinsi)
            .map((s) => s.sekolah.kabupatenKota)
            .filter((v): v is string => !!v)
        )
      ).sort()
    : [];
  const semuaSekolah = semuaSekolahMentah.filter((s) => {
    const cocokCari = !cari || s.sekolah.nama.toLowerCase().includes(cari);
    const cocokProvinsi = !provinsi || s.sekolah.provinsi === provinsi;
    const cocokKota = !kota || s.sekolah.kabupatenKota === kota;
    const cocokJenjang = !jenjang || s.sekolah.jenjang === jenjang;
    return cocokCari && cocokProvinsi && cocokKota && cocokJenjang;
  });

  // 1.14, diminta eksplisit — pagination di daftar sekolah, pola sama dgn halaman lain (mis.
  // Mutasi Siswa) yang sudah punya banyak baris: iris di memori, bukan query ulang ke DB.
  const totalHalaman = Math.max(1, Math.ceil(semuaSekolah.length / SEKOLAH_PER_HALAMAN));
  const halamanAman = Math.min(totalHalaman, Math.max(1, Number(sp.halaman) || 1));
  const sekolahList = semuaSekolah.slice((halamanAman - 1) * SEKOLAH_PER_HALAMAN, halamanAman * SEKOLAH_PER_HALAMAN);
  const hrefHalaman = (h: number) =>
    `?cari=${encodeURIComponent(sp.cari ?? "")}&provinsi=${encodeURIComponent(provinsi)}&kota=${encodeURIComponent(kota)}&jenjang=${encodeURIComponent(jenjang)}&halaman=${h}`;

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/sekolah"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Kelola Sekolah"
      pageSubtitle={`${semuaSekolahMentah.length} sekolah terdaftar di Selaras Ajar`}
      headerAction={<LinkButton href="/superadmin/sekolah/tambah" size="sm" variant="accent">+ Tambah Sekolah</LinkButton>}
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

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="halaman" value="1" />
        <SearchInput
          name="cari"
          defaultValue={sp.cari ?? ""}
          placeholder="Cari nama sekolah…"
          className="py-2 w-64"
          inputClassName="text-sm"
        />
        <select id="provinsi-select" name="provinsi" defaultValue={provinsi} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
          <option value="">Semua provinsi</option>
          {provinsiList.map((p) => (<option key={p} value={p}>{p}</option>))}
        </select>
        <select
          name="kota"
          defaultValue={kota}
          disabled={!provinsi}
          title={!provinsi ? "Pilih provinsi dulu" : undefined}
          className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{provinsi ? "Semua kota/kabupaten" : "Pilih provinsi dulu"}</option>
          {kotaList.map((k) => (<option key={k} value={k}>{k}</option>))}
        </select>
        <select name="jenjang" defaultValue={jenjang} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
          <option value="">Semua jenjang</option>
          {JENJANG_LIST.map((j) => (<option key={j} value={j}>{j}</option>))}
        </select>
        <Button type="submit" size="sm" variant="ghost">Terapkan</Button>
        {(cari || provinsi || kota || jenjang) && (
          <LinkButton href="/superadmin/sekolah" size="sm" variant="ghost">Reset</LinkButton>
        )}
      </form>
      <p className="text-xs text-ink-soft mb-4">{semuaSekolah.length} sekolah cocok dengan filter ini</p>

      <TampilanTabelPeta sekolahList={sekolahList} semuaSekolah={semuaSekolah} />

      <Pagination halaman={halamanAman} totalHalaman={totalHalaman} hrefHalaman={hrefHalaman} />

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('provinsi-select')?.addEventListener('change', function(e){
              var form = e.target.closest('form');
              var kotaSelect = form?.querySelector('select[name="kota"]');
              if (kotaSelect) kotaSelect.value = '';
              form?.submit();
            });
          `,
        }}
      />
    </AppShell>
  );
}
