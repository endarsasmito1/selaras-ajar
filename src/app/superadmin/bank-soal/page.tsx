import { getSession } from "@/lib/auth";
import { getBankSoalGlobal, getSemuaNamaMapelUnik } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { SoalEditor } from "@/components/ui/SoalEditor";
import { SoalHtml } from "@/lib/sanitize-html";

const JENIS_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  PILIHAN_GANDA_KOMPLEKS: "PG Kompleks",
  PILIHAN_GANDA_MINUS: "PG Nilai Minus",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export default async function SuperadminBankSoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; soal_dibuat?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [soalList, mapelNamaList] = await Promise.all([getBankSoalGlobal(), getSemuaNamaMapelUnik()]);

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Bank Soal Terpusat"
      pageSubtitle="Soal buatan tim konten Selaras Ajar — bisa dipakai guru sekolah manapun, ditandai jelas di bank soal mereka"
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.soal_dibuat && <div className="mb-4"><Callout>✓ Soal ditambahkan ke bank soal terpusat.</Callout></div>}

      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Tambah soal baru</summary>
        <form action="/api/superadmin/bank-soal" method="POST" className="mt-4 flex flex-col gap-3 max-w-xl">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Mapel</label>
              <input name="mapelNama" required list="mapel-nama-list" placeholder="mis. Matematika" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <datalist id="mapel-nama-list">
                {mapelNamaList.map((n) => (<option key={n} value={n} />))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Rekomendasi kelas/jenjang</label>
              <input name="rekomendasiKelas" placeholder="mis. Kelas 7 / SMP semua kelas" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Jenis soal</label>
            <select name="jenis" id="jenis-select-global" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              <option value="PILIHAN_GANDA">Pilihan Ganda</option>
              <option value="PILIHAN_GANDA_KOMPLEKS">Pilihan Ganda Kompleks (bisa &gt;1 jawaban benar)</option>
              <option value="PILIHAN_GANDA_MINUS">Pilihan Ganda (Nilai Minus jika salah)</option>
              <option value="JAWABAN_SINGKAT">Jawaban Singkat</option>
              <option value="ESAI">Esai</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tingkat kesulitan</label>
            <select name="tingkatKesulitan" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
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
                  <input name="opsi" required placeholder={`Opsi ${String.fromCharCode(65 + i)}`} className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
          </div>
          <div id="kunci-singkat-global" className="flex flex-col gap-1.5" style={{ display: "none" }}>
            <label className="text-xs font-semibold">Kunci jawaban</label>
            <input name="kunciSingkat" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          </div>
          <div id="pengurangan-minus-global" className="grid grid-cols-2 gap-3 bg-paper border border-rule rounded-lg p-3" style={{ display: "none" }}>
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
            <input name="durasiDetik" type="number" min="1" placeholder="mis. 120" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Poin default</label>
            <input name="poinDefault" type="number" defaultValue={10} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm w-24" />
          </div>
          <Button type="submit" size="sm" className="self-start">Simpan ke bank soal terpusat</Button>
        </form>
      </details>

      <div className="flex flex-col gap-2.5">
        {soalList.map((s) => (
          <div key={s.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="info">{s.mapelNama ?? "—"}</Pill>
                <Pill tone="neutral">{JENIS_LABEL[s.jenis]}</Pill>
                {s.rekomendasiKelas && <span className="text-xs text-ink-soft">{s.rekomendasiKelas}</span>}
                <span className="text-xs text-ink-soft">· {s.poinDefault} poin</span>
              </div>
              <form action="/api/superadmin/bank-soal/hapus" method="POST">
                <input type="hidden" name="soalId" value={s.id} />
                <ConfirmSubmitLink confirmMessage="Hapus soal ini dari bank soal terpusat?" className="text-xs text-danger hover:underline">Hapus</ConfirmSubmitLink>
              </form>
            </div>
            <SoalHtml html={s.pertanyaan} className="text-sm" />
          </div>
        ))}
        {soalList.length === 0 && <p className="text-sm text-ink-soft">Belum ada soal di bank soal terpusat.</p>}
      </div>

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
