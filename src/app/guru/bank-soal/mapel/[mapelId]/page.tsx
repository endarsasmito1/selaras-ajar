import { getSession } from "@/lib/auth";
import { getBankSoal } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { SoalEditor } from "@/components/ui/SoalEditor";
import { SoalHtml } from "@/lib/sanitize-html";
import { notFound } from "next/navigation";

const JENIS_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  PILIHAN_GANDA_KOMPLEKS: "PG Kompleks",
  PILIHAN_GANDA_MINUS: "PG Nilai Minus",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export default async function BankSoalMapelPage({
  params,
  searchParams,
}: {
  params: Promise<{ mapelId: string }>;
  searchParams: Promise<{ error?: string; soal_diubah?: string; soal_diimpor?: string; poinMin?: string; poinMax?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { mapelId } = await params;
  const sp = await searchParams;

  const mapel = await prisma.mataPelajaran.findFirst({ where: { id: mapelId, sekolahId: session.sekolahId } });
  if (!mapel) notFound();

  const semuaSoalMapel = await getBankSoal(session.sekolahId, mapelId);
  const poinMin = sp.poinMin ? Number(sp.poinMin) : null;
  const poinMax = sp.poinMax ? Number(sp.poinMax) : null;
  const semuaSoal = semuaSoalMapel.filter(
    (s) => (poinMin === null || s.poinDefault >= poinMin) && (poinMax === null || s.poinDefault <= poinMax)
  );

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Bank Soal — ${mapel.nama}`}
      pageSubtitle={`${semuaSoal.length} soal`}
      headerAction={<LinkButton href="/guru/bank-soal" variant="ghost" size="sm">← Semua mapel</LinkButton>}
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.soal_diubah && <div className="mb-4"><Callout tone="info">Soal berhasil diperbarui.</Callout></div>}
      {sp.soal_diimpor && <div className="mb-4"><Callout tone="info">{sp.soal_diimpor} soal berhasil diimpor.</Callout></div>}

      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Tambah soal baru</summary>
        <form action="/api/soal" method="POST" className="mt-4" id="form-soal">
          <input type="hidden" name="mapelId" value={mapelId} />
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
                  <input type="radio" name="kunciJawaban" value={i} className="kunci-pg-m accent-[color:var(--primary)]" title="Tandai sebagai kunci jawaban (PG biasa)" />
                  <input type="checkbox" name="kunciJawabanMulti" value={i} className="kunci-pgk-m" style={{ display: "none" }} title="Centang sbg kunci jawaban (PG Kompleks)" />
                  <input name="opsi" required placeholder={`Opsi ${String.fromCharCode(65 + i)}`} className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-soft mt-1.5">PG biasa/Nilai Minus: klik bulatan. PG Kompleks: centang kotak (boleh &gt;1).</p>
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

      <form method="GET" className="flex flex-wrap items-end gap-2 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-ink-soft">Poin min</label>
          <input type="number" name="poinMin" defaultValue={sp.poinMin ?? ""} className="w-24 bg-paper-raised border border-rule rounded-lg px-2.5 py-1.5 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-ink-soft">Poin maks</label>
          <input type="number" name="poinMax" defaultValue={sp.poinMax ?? ""} className="w-24 bg-paper-raised border border-rule rounded-lg px-2.5 py-1.5 text-xs" />
        </div>
        <Button type="submit" size="sm" variant="ghost">Filter</Button>
        {(sp.poinMin || sp.poinMax) && (
          <a href="?" className="text-xs text-ink-soft hover:underline self-center">Reset</a>
        )}
      </form>

      <div className="flex flex-col gap-2.5">
        {semuaSoal.length === 0 && <p className="text-sm text-ink-soft">{poinMin !== null || poinMax !== null ? "Tidak ada soal di rentang poin ini." : "Belum ada soal di mapel ini."}</p>}
        {semuaSoal.map((s) => (
          <div key={s.id} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {s.sekolahId === null && <Pill tone="ok">✦ Dari Selaras Ajar</Pill>}
                {s.sekolahId !== null && s.dibuatOlehId === session.userId && <Pill tone="info">Buatan saya</Pill>}
                <Pill tone={s.jenis === "PILIHAN_GANDA" ? "info" : s.jenis === "ESAI" ? "warn" : s.jenis === "PILIHAN_GANDA_MINUS" ? "warn" : "neutral"}>
                  {JENIS_LABEL[s.jenis]}
                </Pill>
                {s.topik && <span className="text-xs text-ink-soft">{s.topik}</span>}
                {s.rekomendasiKelas && <span className="text-xs text-ink-soft">{s.rekomendasiKelas}</span>}
                <span className="text-xs text-ink-soft">· {s.poinDefault} poin</span>
                {s.jenis === "PILIHAN_GANDA_MINUS" && s.penguranganNilai != null && (
                  <span className="text-xs text-danger">
                    · −{s.penguranganNilai}{s.penguranganMode === "PERSEN" ? "%" : " poin"} jika salah
                  </span>
                )}
              </div>
              {s.sekolahId !== null && (
                <a href={`/guru/bank-soal/${s.id}/edit`} className="text-xs font-semibold text-primary-deep hover:underline">
                  Edit
                </a>
              )}
            </div>
            <SoalHtml html={s.pertanyaan} className="text-sm" />
            {(s.jenis === "PILIHAN_GANDA" || s.jenis === "PILIHAN_GANDA_MINUS") && s.opsi && (
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
            {s.jenis === "PILIHAN_GANDA_KOMPLEKS" && s.opsi && (() => {
              const kunciMulti: number[] = s.kunciJawaban ? JSON.parse(s.kunciJawaban) : [];
              return (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(JSON.parse(s.opsi) as string[]).map((o, i) => (
                    <span
                      key={i}
                      className={
                        "text-xs px-2 py-1 rounded-md border " +
                        (kunciMulti.includes(i) ? "border-success bg-success-tint text-success font-semibold" : "border-rule text-ink-soft")
                      }
                    >
                      {kunciMulti.includes(i) ? "☑ " : ""}{o}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        ))}
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
              if (pg) pg.style.display = (isPG || isPGK) ? 'block' : 'none';
              if (singkat) singkat.style.display = v === 'JAWABAN_SINGKAT' ? 'flex' : 'none';
              if (minus) minus.style.display = isMinus ? 'grid' : 'none';
              var durasi = document.getElementById('durasi-soal');
              if (durasi) durasi.style.display = (v === 'JAWABAN_SINGKAT' || v === 'ESAI') ? 'flex' : 'none';
              // display:none TIDAK otomatis mengecualikan field dari validasi HTML5 (cuma 'disabled'
              // yang spec-compliant) — tanpa ini, submit ESAI/Jawaban Singkat gagal senyap karena
              // radio kunciJawaban (required, disembunyikan) tetap dianggap invalid oleh browser.
              document.querySelectorAll('input[name="opsi"]').forEach(function(el){ el.disabled = !(isPG || isPGK); });
              document.querySelectorAll('.kunci-pg-m').forEach(function(el){ el.style.display = isPG ? 'inline-block' : 'none'; el.disabled = !isPG; });
              document.querySelectorAll('.kunci-pgk-m').forEach(function(el){ el.style.display = isPGK ? 'inline-block' : 'none'; el.disabled = !isPGK; });
            });
          `,
        }}
      />
    </AppShell>
  );
}
