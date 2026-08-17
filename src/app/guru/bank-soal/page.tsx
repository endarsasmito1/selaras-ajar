import { getSession } from "@/lib/auth";
import { getBankSoal, getKelasDiampu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";

const JENIS_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export default async function BankSoalPage() {
  const session = await getSession();
  if (!session) return null;

  const [soal, penugasan] = await Promise.all([
    getBankSoal(session.sekolahId),
    getKelasDiampu(session.userId),
  ]);
  const mapelUnik = Array.from(new Map(penugasan.map((p) => [p.mapel.id, p.mapel])).values());

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Bank Soal"
      pageSubtitle={`${soal.length} soal tersimpan — bisa dipakai lagi di ujian manapun`}
    >
      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Tambah soal baru</summary>
        <form action="/api/soal" method="POST" className="mt-4" id="form-soal">
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Mata pelajaran</label>
              <select name="mapelId" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                {mapelUnik.map((m) => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Jenis soal</label>
              <select name="jenis" id="jenis-select" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                <option value="PILIHAN_GANDA">Pilihan Ganda</option>
                <option value="JAWABAN_SINGKAT">Jawaban Singkat</option>
                <option value="ESAI">Esai</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-semibold">Pertanyaan</label>
            <textarea name="pertanyaan" required rows={2} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="Tulis pertanyaan…" />
          </div>

          <div id="opsi-pg" className="mb-3">
            <label className="text-xs font-semibold block mb-1.5">Opsi jawaban (untuk Pilihan Ganda)</label>
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="kunciJawaban" value={i} required className="accent-[color:var(--primary)]" title="Tandai sebagai kunci jawaban" />
                  <input name="opsi" placeholder={`Opsi ${String.fromCharCode(65 + i)}`} className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-soft mt-1.5">Klik bulatan di kiri opsi untuk menandai kunci jawaban — wajib diisi untuk pilihan ganda.</p>
          </div>

          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-semibold">Kunci jawaban (untuk Jawaban Singkat)</label>
            <input name="kunciSingkat" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. 43200" />
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

      <div className="flex flex-col gap-2.5">
        {soal.length === 0 && <p className="text-sm text-ink-soft">Belum ada soal di bank.</p>}
        {soal.map((s) => (
          <div key={s.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Pill tone={s.jenis === "PILIHAN_GANDA" ? "info" : s.jenis === "ESAI" ? "warn" : "neutral"}>
                {JENIS_LABEL[s.jenis]}
              </Pill>
              <span className="text-xs text-ink-soft">{s.mapel.nama}</span>
              {s.topik && <span className="text-xs text-ink-soft">· {s.topik}</span>}
              <span className="text-xs text-ink-soft">· {s.poinDefault} poin</span>
            </div>
            <p className="text-sm">{s.pertanyaan}</p>
            {s.jenis === "PILIHAN_GANDA" && s.opsi && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(JSON.parse(s.opsi) as string[]).map((o, i) => (
                  <span
                    key={i}
                    className={
                      "text-xs px-2 py-1 rounded-md border " +
                      (String(i) === s.kunciJawaban
                        ? "border-success bg-success-tint text-success font-semibold"
                        : "border-rule text-ink-soft")
                    }
                  >
                    {o}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('jenis-select')?.addEventListener('change', function(e){
              var v = e.target.value;
              var pg = document.getElementById('opsi-pg');
              if (pg) pg.style.display = v === 'PILIHAN_GANDA' ? 'block' : 'none';
            });
          `,
        }}
      />
    </AppShell>
  );
}
