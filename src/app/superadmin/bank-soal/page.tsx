import { getSession } from "@/lib/auth";
import { getBankSoalGlobal, getSemuaNamaMapelUnik } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { Drawer } from "@/components/ui/Drawer";
import { ToastFromQuery } from "@/components/ui/ToastFromQuery";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { OpsiPreview } from "@/components/ui/OpsiPreview";
import { SoalEditor } from "@/components/ui/SoalEditor";
import { SoalHtml } from "@/lib/sanitize-html";
import { JENIS_SOAL_LABEL, TINGKAT_KESULITAN_TONE, JENJANG_PILL_CLASS } from "@/lib/soal-ui";

/** Buat cocokkan search box thd teks HTML pertanyaan (SunEditor) — cukup buang tag, gak perlu
 * markup-aware sungguhan krn cuma dipakai substring match, bukan ditampilkan. */
function teksPolos(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

const JENJANG_LIST = ["SD", "SMP", "SMA", "SMK"];
const JENJANG_URUTAN = ["SD", "SMP", "SMA", "SMK", "Belum diisi"];

export default async function SuperadminBankSoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cari?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [soalList, mapelNamaList] = await Promise.all([getBankSoalGlobal(), getSemuaNamaMapelUnik()]);

  // Search global (lintas jenjang/mapel) — kalau diisi, tampilkan hasil flat & lewati breakdown.
  const cari = (sp.cari ?? "").trim().toLowerCase();
  const hasilCari = cari
    ? soalList.filter(
        (s) => teksPolos(s.pertanyaan).toLowerCase().includes(cari) || (s.topik ?? "").toLowerCase().includes(cari)
      )
    : [];

  // Breakdown per jenjang -> per mapel, biar halaman awal langsung nunjukin struktur bank soal
  // (bukan satu daftar panjang campur semua jenjang/mapel). Tiap mapel jadi link ke halaman
  // tersendiri (bukan inline) — mapel yang sama (mis. Matematika) tetap kelompok terpisah per
  // jenjang krn key komposit jenjang+mapel.
  const perJenjang = new Map<string, Map<string, typeof soalList>>();
  for (const s of soalList) {
    const jenjangKey = s.jenjang ?? "Belum diisi";
    const mapelKey = s.mapelNama ?? "Tanpa mapel";
    if (!perJenjang.has(jenjangKey)) perJenjang.set(jenjangKey, new Map());
    const perMapel = perJenjang.get(jenjangKey)!;
    if (!perMapel.has(mapelKey)) perMapel.set(mapelKey, []);
    perMapel.get(mapelKey)!.push(s);
  }
  const jenjangTersedia = Array.from(perJenjang.keys()).sort(
    (a, b) => JENJANG_URUTAN.indexOf(a) - JENJANG_URUTAN.indexOf(b)
  );

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Bank Soal Terpusat"
      pageSubtitle="Soal buatan tim konten Selaras Ajar — bisa dipakai guru sekolah manapun, ditandai jelas di bank soal mereka"
    >
      <ToastFromQuery />
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}

      <form method="GET" className="mb-5 flex items-center gap-2">
        <input
          name="cari"
          defaultValue={sp.cari ?? ""}
          placeholder="Cari soal (isi pertanyaan atau topik)…"
          className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm w-80"
        />
        <Button type="submit" size="sm" variant="ghost">Cari</Button>
        {cari && <LinkButton href="/superadmin/bank-soal" size="sm" variant="ghost">Reset</LinkButton>}
      </form>

      {cari ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs text-ink-soft">{hasilCari.length} soal cocok dengan &quot;{sp.cari}&quot;</p>
          {hasilCari.map((s) => (
            <div key={s.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5">
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Pill tone="neutral" className={JENJANG_PILL_CLASS}>{s.jenjang ?? "Belum diisi"}</Pill>
                  <span className="text-xs text-ink-soft">{s.mapelNama ?? "Tanpa mapel"}</span>
                  <Pill tone="info">{JENIS_SOAL_LABEL[s.jenis]}</Pill>
                  <Pill tone={TINGKAT_KESULITAN_TONE[s.tingkatKesulitan ?? "sedang"] ?? "neutral"}>{s.tingkatKesulitan ?? "sedang"}</Pill>
                  <Pill tone="neutral">{s.poinDefault} poin</Pill>
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
          {hasilCari.length === 0 && <p className="text-sm text-ink-soft">Tidak ada soal yang cocok.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {jenjangTersedia.map((jenjangKey) => {
            const perMapel = perJenjang.get(jenjangKey)!;
            const totalJenjang = Array.from(perMapel.values()).reduce((n, list) => n + list.length, 0);
            return (
              <Card key={jenjangKey}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-semibold">{jenjangKey}</h3>
                  <Pill tone="neutral">{totalJenjang} soal</Pill>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from(perMapel.entries()).map(([mapelKey, list]) => (
                    <a
                      key={mapelKey}
                      href={`/superadmin/bank-soal/${encodeURIComponent(jenjangKey)}/${encodeURIComponent(mapelKey)}`}
                      className="bg-paper border border-rule rounded-lg px-4 py-3 hover:border-primary transition-colors"
                    >
                      <span className="block text-sm font-semibold mb-0.5">{mapelKey}</span>
                      <span className="text-xs text-ink-soft">{list.length} soal →</span>
                    </a>
                  ))}
                </div>
              </Card>
            );
          })}
          {soalList.length === 0 && <EmptyState icon="✎" title="Belum ada soal di bank soal terpusat" hint='Klik "+ Tambah soal baru" di bawah untuk mulai.' />}
        </div>
      )}

      <Drawer triggerLabel="+ Tambah soal baru" eyebrow="Bank Soal Terpusat" title="Tambah soal baru">
        <form action="/api/superadmin/bank-soal" method="POST" className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Mapel</label>
              <input name="mapelNama" required list="mapel-nama-list" placeholder="mis. Matematika" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
              <datalist id="mapel-nama-list">
                {mapelNamaList.map((n) => (<option key={n} value={n} />))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Jenjang</label>
              <select name="jenjang" required defaultValue="" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
                <option value="" disabled>Pilih jenjang</option>
                {JENJANG_LIST.map((j) => (<option key={j} value={j}>{j}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Rekomendasi kelas</label>
              <input name="rekomendasiKelas" placeholder="mis. Kelas 7" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Jenis soal</label>
            <select name="jenis" id="jenis-select-global" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
              <option value="PILIHAN_GANDA">Pilihan Ganda</option>
              <option value="PILIHAN_GANDA_KOMPLEKS">Pilihan Ganda Kompleks (bisa &gt;1 jawaban benar)</option>
              <option value="PILIHAN_GANDA_MINUS">Pilihan Ganda (Nilai Minus jika salah)</option>
              <option value="JAWABAN_SINGKAT">Jawaban Singkat</option>
              <option value="ESAI">Esai</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tingkat kesulitan</label>
            <select name="tingkatKesulitan" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
              <option value="mudah">Mudah</option>
              <option value="sedang">Sedang</option>
              <option value="sulit">Sulit</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Pertanyaan</label>
            <SoalEditor name="pertanyaan" />
          </div>
          <div id="opsi-pg-global">
            <label className="text-xs font-semibold block mb-1.5">Opsi jawaban</label>
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="kunciJawaban" value={i} className="kunci-pg-g accent-[color:var(--primary)]" title="Tandai sebagai kunci jawaban (PG biasa)" />
                  <input type="checkbox" name="kunciJawabanMulti" value={i} className="kunci-pgk-g" style={{ display: "none" }} title="Centang sbg kunci jawaban (PG Kompleks)" />
                  <input name="opsi" required placeholder={`Opsi ${String.fromCharCode(65 + i)}`} className="flex-1 bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
          </div>
          <div id="kunci-singkat-global" className="flex flex-col gap-1.5" style={{ display: "none" }}>
            <label className="text-xs font-semibold">Kunci jawaban</label>
            <input name="kunciSingkat" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div id="pengurangan-minus-global" className="grid grid-cols-2 gap-3 bg-paper-raised border border-rule rounded-lg p-3" style={{ display: "none" }}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Mode potongan kalau salah</label>
              <select name="penguranganMode" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
                <option value="PERSEN">Persen dari poin soal</option>
                <option value="POIN">Poin tetap</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Besaran potongan</label>
              <input name="penguranganNilai" type="number" step="0.1" min="0" placeholder="mis. 25" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div id="durasi-soal-global" className="flex flex-col gap-1.5" style={{ display: "none" }}>
            <label className="text-xs font-semibold">Durasi pengerjaan soal ini (detik, opsional)</label>
            <input name="durasiDetik" type="number" min="1" placeholder="mis. 120" className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Poin default</label>
            <input name="poinDefault" type="number" defaultValue={10} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm w-24" />
          </div>
          <div className="border-b border-rule my-1" />
          <div className="flex gap-2">
            <Button type="submit" size="sm">Simpan ke bank soal terpusat</Button>
            <Button type="submit" formMethod="dialog" variant="ghost" size="sm">Batal</Button>
          </div>
        </form>
      </Drawer>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('jenis-select-global')?.addEventListener('change', function(e){
              var v = e.target.value;
              var isPG = v === 'PILIHAN_GANDA' || v === 'PILIHAN_GANDA_MINUS';
              var isPGK = v === 'PILIHAN_GANDA_KOMPLEKS';
              var isMinus = v === 'PILIHAN_GANDA_MINUS';
              var pg = document.getElementById('opsi-pg-global');
              var singkat = document.getElementById('kunci-singkat-global');
              var minus = document.getElementById('pengurangan-minus-global');
              if (pg) pg.style.display = (isPG || isPGK) ? 'block' : 'none';
              if (singkat) singkat.style.display = v === 'JAWABAN_SINGKAT' ? 'flex' : 'none';
              if (minus) minus.style.display = isMinus ? 'grid' : 'none';
              var durasi = document.getElementById('durasi-soal-global');
              if (durasi) durasi.style.display = (v === 'JAWABAN_SINGKAT' || v === 'ESAI') ? 'flex' : 'none';
              document.querySelectorAll('#opsi-pg-global input[name="opsi"]').forEach(function(el){ el.disabled = !(isPG || isPGK); });
              document.querySelectorAll('.kunci-pg-g').forEach(function(el){ el.style.display = isPG ? 'inline-block' : 'none'; el.disabled = !isPG; });
              document.querySelectorAll('.kunci-pgk-g').forEach(function(el){ el.style.display = isPGK ? 'inline-block' : 'none'; el.disabled = !isPGK; });
            });
          `,
        }}
      />
    </AppShell>
  );
}
