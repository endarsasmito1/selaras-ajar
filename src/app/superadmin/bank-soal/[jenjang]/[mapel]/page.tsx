import { getSession } from "@/lib/auth";
import { getBankSoalGlobal } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { LinkButton, Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { ToastFromQuery } from "@/components/ui/ToastFromQuery";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { OpsiPreview } from "@/components/ui/OpsiPreview";
import { SoalHtml } from "@/lib/sanitize-html";
import { JENIS_SOAL_LABEL, TINGKAT_KESULITAN_TONE, JENJANG_PILL_CLASS } from "@/lib/soal-ui";

const SOAL_PER_HALAMAN = 10;

function teksPolos(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

export default async function SuperadminBankSoalMapelPage({
  params,
  searchParams,
}: {
  params: Promise<{ jenjang: string; mapel: string }>;
  searchParams: Promise<{
    error?: string;
    jenis?: string;
    tingkatKesulitan?: string;
    cari?: string;
    halaman?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { jenjang: jenjangParam, mapel: mapelParam } = await params;
  const sp = await searchParams;
  const jenjangKey = decodeURIComponent(jenjangParam);
  const mapelKey = decodeURIComponent(mapelParam);

  const semuaSoalGlobal = await getBankSoalGlobal();
  const soalKelompok = semuaSoalGlobal.filter(
    (s) => (s.jenjang ?? "Belum diisi") === jenjangKey && (s.mapelNama ?? "Tanpa mapel") === mapelKey
  );

  const jenisFilter = sp.jenis ?? "";
  const kesulitanFilter = sp.tingkatKesulitan ?? "";
  const cari = (sp.cari ?? "").trim().toLowerCase();
  const soalTersaring = soalKelompok.filter((s) => {
    const cocokJenis = !jenisFilter || s.jenis === jenisFilter;
    const cocokKesulitan = !kesulitanFilter || s.tingkatKesulitan === kesulitanFilter;
    const cocokCari = !cari || teksPolos(s.pertanyaan).toLowerCase().includes(cari) || (s.topik ?? "").toLowerCase().includes(cari);
    return cocokJenis && cocokKesulitan && cocokCari;
  });

  const totalHalaman = Math.max(1, Math.ceil(soalTersaring.length / SOAL_PER_HALAMAN));
  const halamanAman = Math.min(totalHalaman, Math.max(1, Number(sp.halaman) || 1));
  const soalList = soalTersaring.slice((halamanAman - 1) * SOAL_PER_HALAMAN, halamanAman * SOAL_PER_HALAMAN);
  const hrefHalaman = (h: number) =>
    `?cari=${encodeURIComponent(sp.cari ?? "")}&jenis=${encodeURIComponent(jenisFilter)}&tingkatKesulitan=${encodeURIComponent(kesulitanFilter)}&halaman=${h}`;

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`${mapelKey} — ${jenjangKey}`}
      pageSubtitle={`${soalKelompok.length} soal di bank soal terpusat`}
      headerAction={<LinkButton href="/superadmin/bank-soal" variant="ghost" size="sm">← Semua bank soal</LinkButton>}
    >
      <ToastFromQuery />
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}

      <form method="GET" className="mb-5 flex flex-wrap items-center gap-2">
        <input type="hidden" name="halaman" value="1" />
        <input
          name="cari"
          defaultValue={sp.cari ?? ""}
          placeholder="Cari soal ini (isi/topik)…"
          className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm w-64"
        />
        <select name="jenis" defaultValue={jenisFilter} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
          <option value="">Semua jenis</option>
          {Object.entries(JENIS_SOAL_LABEL).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </select>
        <select name="tingkatKesulitan" defaultValue={kesulitanFilter} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
          <option value="">Semua tingkat kesulitan</option>
          <option value="mudah">Mudah</option>
          <option value="sedang">Sedang</option>
          <option value="sulit">Sulit</option>
        </select>
        <Button type="submit" size="sm" variant="ghost">Terapkan</Button>
        {(cari || jenisFilter || kesulitanFilter) && (
          <LinkButton href={`/superadmin/bank-soal/${encodeURIComponent(jenjangKey)}/${encodeURIComponent(mapelKey)}`} size="sm" variant="ghost">
            Reset
          </LinkButton>
        )}
      </form>

      <p className="text-xs text-ink-soft mb-3">{soalTersaring.length} soal cocok dengan filter ini</p>

      <div className="flex flex-col gap-2.5">
        {soalList.map((s) => (
          <div key={s.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="info">{JENIS_SOAL_LABEL[s.jenis]}</Pill>
                <Pill tone={TINGKAT_KESULITAN_TONE[s.tingkatKesulitan ?? "sedang"] ?? "neutral"}>{s.tingkatKesulitan ?? "sedang"}</Pill>
                <Pill tone="neutral" className={JENJANG_PILL_CLASS}>{s.jenjang ?? "Belum diisi"}</Pill>
                <Pill tone="neutral">{s.poinDefault} poin</Pill>
                {s.rekomendasiKelas && <span className="text-xs text-ink-soft">{s.rekomendasiKelas}</span>}
              </div>
              <div className="flex items-center gap-3">
                <LinkButton href={`/superadmin/bank-soal/edit/${s.id}`} size="sm" variant="ghost">Ubah</LinkButton>
                <form action="/api/superadmin/bank-soal/hapus" method="POST">
                  <input type="hidden" name="soalId" value={s.id} />
                  <ConfirmSubmitLink confirmMessage="Hapus soal ini dari bank soal terpusat?" className="text-xs text-danger hover:underline">Hapus</ConfirmSubmitLink>
                </form>
              </div>
            </div>
            <SoalHtml html={s.pertanyaan} className="text-sm" />
            <OpsiPreview jenis={s.jenis} opsi={s.opsi} kunciJawaban={s.kunciJawaban} />
          </div>
        ))}
        {soalList.length === 0 && (
          soalKelompok.length === 0
            ? <EmptyState icon="❖" title="Belum ada soal di kelompok ini" />
            : <p className="text-sm text-ink-soft">Tidak ada soal yang cocok dengan filter.</p>
        )}
      </div>

      <Pagination halaman={halamanAman} totalHalaman={totalHalaman} hrefHalaman={hrefHalaman} />
    </AppShell>
  );
}
