import { getSession } from "@/lib/auth";
import { getBankSoal, getKelasDiampu, getSemuaMapel } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { SoalEditor } from "@/components/ui/SoalEditor";

export default async function BankSoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [soal, penugasan, semuaMapel] = await Promise.all([
    getBankSoal(session.sekolahId),
    getKelasDiampu(session.userId),
    getSemuaMapel(session.sekolahId),
  ]);
  const mapelUnik = Array.from(new Map(penugasan.map((p) => [p.mapel.id, p.mapel])).values());

  // BS-1: satu card per mapel (jumlah soal) — klik untuk buka isinya.
  const jumlahPerMapel = new Map<string, number>();
  for (const s of soal) {
    if (!s.mapelId) continue; // soal global (superadmin) tak terikat 1 mapel spesifik di sini
    jumlahPerMapel.set(s.mapelId, (jumlahPerMapel.get(s.mapelId) ?? 0) + 1);
  }
  // 1.11, diperbaiki (ditemukan saat testing): subtitle sebelumnya pakai `soal.length` = total
  // se-sekolah lintas semua guru, padahal cuma mapel yang diampu guru ini yang ditampilkan di grid
  // di bawah — bikin angkanya kelihatan tak nyambung sama isi halaman. Jumlahkan cuma dari mapelUnik.
  const soalMilikGuru = mapelUnik.reduce((sum, m) => sum + (jumlahPerMapel.get(m.id) ?? 0), 0);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Bank Soal"
      pageSubtitle={`${soalMilikGuru} soal tersimpan di mapel yang kamu ampu — bisa dipakai lagi di ujian manapun`}
      headerAction={<LinkButton href="/guru/bank-soal/impor" variant="ghost" size="sm">Impor CSV</LinkButton>}
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}

      {semuaMapel.length > 0 && (
        <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
          <summary className="cursor-pointer font-semibold text-sm">+ Tambah soal baru</summary>
          <form action="/api/soal" method="POST" className="mt-4" id="form-soal">
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="text-xs font-semibold">Mata pelajaran</label>
              <select name="mapelId" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                {semuaMapel.map((m) => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="text-xs font-semibold">Jenis soal</label>
              <select name="jenis" id="jenis-select" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                <option value="PILIHAN_GANDA">Pilihan Ganda</option>
                <option value="PILIHAN_GANDA_KOMPLEKS">Pilihan Ganda Kompleks (bisa &gt;1 jawaban benar)</option>
                <option value="PILIHAN_GANDA_MINUS">Pilihan Ganda (Nilai Minus jika salah)</option>
                <option value="JAWABAN_SINGKAT">Jawaban Singkat</option>
                <option value="ESAI">Esai</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="text-xs font-semibold">Pertanyaan</label>
              <SoalEditor name="pertanyaan" />
            </div>

            <div id="opsi-pg" className="mb-3">
              <label className="text-xs font-semibold block mb-1.5">Opsi jawaban</label>
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="kunciJawaban" value={i} className="kunci-pg accent-[color:var(--primary)]" title="Tandai sebagai kunci jawaban (PG biasa)" />
                    <input type="checkbox" name="kunciJawabanMulti" value={i} className="kunci-pgk" style={{ display: "none" }} title="Centang sbg kunci jawaban (PG Kompleks)" />
                    <input name="opsi" required placeholder={`Opsi ${String.fromCharCode(65 + i)}`} className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-soft mt-1.5">PG biasa/Nilai Minus: klik bulatan (1 kunci). PG Kompleks: centang kotak (boleh &gt;1 kunci, murid harus pilih persis semua kunci utk dapat poin).</p>
            </div>

            <div id="kunci-singkat" className="flex flex-col gap-1.5 mb-3" style={{ display: "none" }}>
              <label className="text-xs font-semibold">Kunci jawaban</label>
              <input name="kunciSingkat" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. 43200" />
            </div>

            <div id="pengurangan-minus" className="grid grid-cols-2 gap-3 mb-3 bg-paper border border-rule rounded-lg p-3" style={{ display: "none" }}>
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

            <div id="durasi-soal" className="flex flex-col gap-1.5 mb-3" style={{ display: "none" }}>
              <label className="text-xs font-semibold">Durasi pengerjaan soal ini (detik, opsional)</label>
              <input name="durasiDetik" type="number" min="1" placeholder="mis. 120" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm w-40" />
            </div>

            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Topik</label>
                <input name="topik" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. Pecahan" />
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
                <label className="text-xs font-semibold">Poin default</label>
                <input name="poinDefault" type="number" defaultValue={10} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" size="sm">Simpan ke bank soal</Button>
          </form>
        </details>
      )}

      <div className="grid md:grid-cols-3 gap-3.5">
        {mapelUnik.map((m) => (
          <a key={m.id} href={`/guru/bank-soal/mapel/${m.id}`}>
            <Card className="hover:border-primary">
              <h3 className="text-base font-semibold">{m.nama}</h3>
              <p className="text-xs text-ink-soft mt-1">{jumlahPerMapel.get(m.id) ?? 0} soal</p>
            </Card>
          </a>
        ))}
        {mapelUnik.length === 0 && <p className="text-sm text-ink-soft">Belum ada mapel yang diampu.</p>}
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('jenis-select')?.addEventListener('change', function(e){
              var v = e.target.value;
              var isPG = v === 'PILIHAN_GANDA' || v === 'PILIHAN_GANDA_MINUS';
              var isPGK = v === 'PILIHAN_GANDA_KOMPLEKS';
              var isMinus = v === 'PILIHAN_GANDA_MINUS';
              var pg = document.getElementById('opsi-pg');
              var singkat = document.getElementById('kunci-singkat');
              var minus = document.getElementById('pengurangan-minus');
              var durasi = document.getElementById('durasi-soal');
              if (pg) pg.style.display = (isPG || isPGK) ? 'block' : 'none';
              if (singkat) singkat.style.display = v === 'JAWABAN_SINGKAT' ? 'flex' : 'none';
              if (minus) minus.style.display = isMinus ? 'grid' : 'none';
              if (durasi) durasi.style.display = (v === 'JAWABAN_SINGKAT' || v === 'ESAI') ? 'flex' : 'none';
              document.querySelectorAll('input[name="opsi"]').forEach(function(el){ el.disabled = !(isPG || isPGK); });
              document.querySelectorAll('.kunci-pg').forEach(function(el){
                el.style.display = isPG ? 'inline-block' : 'none';
                el.disabled = !isPG;
              });
              document.querySelectorAll('.kunci-pgk').forEach(function(el){
                el.style.display = isPGK ? 'inline-block' : 'none';
                el.disabled = !isPGK;
              });
            });
          `,
        }}
      />
    </AppShell>
  );
}
