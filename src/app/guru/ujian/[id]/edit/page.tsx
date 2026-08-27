import { getSession } from "@/lib/auth";
import { getUjianDetail, getBankSoal } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
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

export default async function EditUjianPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ujian_dibuat?: string; error?: string; tingkatKesulitan?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;

  const ujian = await getUjianDetail(id, session.sekolahId);
  if (!ujian) notFound();

  const bankSoal = await getBankSoal(session.sekolahId, ujian.mapelId);
  const soalDipakaiIds = new Set(ujian.soal.map((s) => s.soalId));
  const bankTersedia = bankSoal
    .filter((s) => !soalDipakaiIds.has(s.id))
    .filter((s) => !sp.tingkatKesulitan || s.tingkatKesulitan === sp.tingkatKesulitan);
  const totalPoin = ujian.soal.reduce((sum, s) => sum + s.poin, 0);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Susun Ujian — ${ujian.judul}`}
      pageSubtitle={`${ujian.mapel.nama} · Kelas ${ujian.kelas.map((uk) => uk.kelas.nama).join(", ")} · draft`}
      headerAction={
        <LinkButton href={`/guru/ujian/${ujian.id}/pengaturan`} size="sm">
          Lanjut ke pengaturan →
        </LinkButton>
      }
    >
      {sp.ujian_dibuat && (
        <div className="mb-4">
          <Callout>✓ Ujian dibuat. Tersimpan otomatis sebagai draft — aman ditinggal kapan saja, lanjutkan susun soal & pengaturannya nanti.</Callout>
        </div>
      )}
      {sp.error && (
        <div className="mb-4">
          <Callout tone="warn">{sp.error}</Callout>
        </div>
      )}
      <div className="mb-4">
        <Callout tone="info">💾 Perubahan di halaman ini tersimpan otomatis sebagai draft — kamu bisa tinggalkan halaman ini kapan saja tanpa kehilangan progres.</Callout>
      </div>

      <div className="grid md:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <div>
          <div className="flex items-center justify-between mb-3">
            <b className="text-sm">
              Soal dalam ujian ini <span className="text-ink-soft font-normal">· {ujian.soal.length} soal · total {totalPoin} poin</span>
            </b>
          </div>

          {ujian.soal.length === 0 && (
            <p className="text-sm text-ink-soft mb-4">Belum ada soal — tambahkan dari bank soal di kanan, atau buat baru.</p>
          )}

          <div className="flex flex-col gap-3 mb-6">
            {ujian.soal.map((us, i) => (
              <div key={us.id} className="bg-paper border border-rule rounded-xl p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="font-serif font-bold text-sm text-primary-deep">Soal {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <Pill tone={us.soal.jenis === "PILIHAN_GANDA" ? "info" : us.soal.jenis === "ESAI" ? "warn" : us.soal.jenis === "PILIHAN_GANDA_MINUS" ? "warn" : "neutral"}>
                      {JENIS_LABEL[us.soal.jenis]}
                    </Pill>
                    <form action="/api/ujian/soal-poin" method="POST" className="flex items-center gap-1">
                      <input type="hidden" name="ujianId" value={ujian.id} />
                      <input type="hidden" name="soalId" value={us.soalId} />
                      <input type="number" name="poin" defaultValue={us.poin} min={1} className="w-16 bg-paper-raised border border-rule rounded-md px-2 py-1 text-xs" />
                      <button type="submit" className="text-xs font-semibold text-primary-deep hover:underline">poin</button>
                    </form>
                    <form action="/api/ujian/soal-hapus" method="POST">
                      <input type="hidden" name="ujianId" value={ujian.id} />
                      <input type="hidden" name="soalId" value={us.soalId} />
                      <ConfirmSubmitLink confirmMessage="Hapus soal ini dari ujian?" className="text-xs text-warning hover:underline">Hapus</ConfirmSubmitLink>
                    </form>
                  </div>
                </div>
                <SoalHtml html={us.soal.pertanyaan} className="text-sm mb-2" />
                {(us.soal.jenis === "PILIHAN_GANDA" || us.soal.jenis === "PILIHAN_GANDA_MINUS") && us.soal.opsi && (
                  <div className="flex flex-col gap-1">
                    {(JSON.parse(us.soal.opsi) as string[]).map((o, oi) => (
                      <div
                        key={oi}
                        className={
                          "text-xs px-3 py-1.5 rounded-md border flex items-center gap-2 " +
                          (String(oi) === us.soal.kunciJawaban
                            ? "border-success bg-success-tint"
                            : "border-rule bg-paper-raised")
                        }
                      >
                        <span className={String(oi) === us.soal.kunciJawaban ? "text-success font-bold" : "text-ink-soft"}>
                          {String(oi) === us.soal.kunciJawaban ? "✓" : "○"}
                        </span>
                        {o}
                        {String(oi) === us.soal.kunciJawaban && <span className="ml-auto text-success font-bold">Kunci</span>}
                      </div>
                    ))}
                  </div>
                )}
                {us.soal.jenis === "PILIHAN_GANDA_MINUS" && us.soal.penguranganNilai != null && (
                  <p className="text-xs text-danger mt-1">
                    Salah = −{us.soal.penguranganNilai}{us.soal.penguranganMode === "PERSEN" ? "%" : " poin"}
                  </p>
                )}
                {us.soal.jenis === "PILIHAN_GANDA_KOMPLEKS" && us.soal.opsi && (
                  <div className="flex flex-col gap-1">
                    {(() => {
                      const kunciMulti: number[] = us.soal.kunciJawaban ? JSON.parse(us.soal.kunciJawaban) : [];
                      return (JSON.parse(us.soal.opsi) as string[]).map((o, oi) => (
                        <div
                          key={oi}
                          className={
                            "text-xs px-3 py-1.5 rounded-md border flex items-center gap-2 " +
                            (kunciMulti.includes(oi) ? "border-success bg-success-tint" : "border-rule bg-paper-raised")
                          }
                        >
                          <span className={kunciMulti.includes(oi) ? "text-success font-bold" : "text-ink-soft"}>
                            {kunciMulti.includes(oi) ? "☑" : "☐"}
                          </span>
                          {o}
                          {kunciMulti.includes(oi) && <span className="ml-auto text-success font-bold">Kunci</span>}
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {us.soal.jenis === "ESAI" && (
                  <Callout>Esai dinilai manual oleh guru setelah ujian selesai.</Callout>
                )}
              </div>
            ))}
          </div>

          <Callout>
            ℹ️ <b>Satu ujian boleh mencampur jenis soal</b> — PG &amp; jawaban singkat dinilai otomatis, esai dinilai manual.
          </Callout>

          <details className="mt-6 bg-paper-raised border border-rule rounded-xl p-5">
            <summary className="cursor-pointer font-semibold text-sm">+ Buat soal baru langsung untuk ujian ini</summary>
            <form action="/api/soal" method="POST" className="mt-4">
              <input type="hidden" name="ujianId" value={ujian.id} />
              <input type="hidden" name="mapelId" value={ujian.mapelId} />
              <div className="flex flex-col gap-1.5 mb-3">
                <label className="text-xs font-semibold">Jenis soal</label>
                <select name="jenis" id="jenis-select-2" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
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
              <div id="opsi-pg-2" className="mb-3">
                <label className="text-xs font-semibold block mb-1.5">Opsi jawaban</label>
                <div className="flex flex-col gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="kunciJawaban" value={i} className="kunci-pg-2 accent-[color:var(--primary)]" title="Tandai sebagai kunci jawaban (PG biasa)" />
                      <input type="checkbox" name="kunciJawabanMulti" value={i} className="kunci-pgk-2" style={{ display: "none" }} title="Centang sbg kunci jawaban (PG Kompleks)" />
                      <input name="opsi" required placeholder={`Opsi ${String.fromCharCode(65 + i)}`} className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mb-3">
                <label className="text-xs font-semibold">Kunci jawaban (Jawaban Singkat)</label>
                <input name="kunciSingkat" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              </div>
              <div id="pengurangan-minus-2" className="grid grid-cols-2 gap-3 mb-3 bg-paper border border-rule rounded-lg p-3" style={{ display: "none" }}>
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
              <div id="durasi-soal-2" className="flex flex-col gap-1.5 mb-3" style={{ display: "none" }}>
                <label className="text-xs font-semibold">Durasi pengerjaan soal ini (detik, opsional)</label>
                <input name="durasiDetik" type="number" min="1" placeholder="mis. 120" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm w-40" />
              </div>
              <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-xs font-semibold">Poin</label>
                <input name="poinDefault" type="number" defaultValue={20} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm w-24" />
              </div>
              <Button type="submit" size="sm">Tambah ke ujian</Button>
            </form>
          </details>
        </div>

        <div className="bg-paper-raised border border-rule rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-1">Bank Soal — {ujian.mapel.nama}</h3>
          <p className="text-xs text-ink-soft mb-3">Ambil soal yang sudah ada</p>
          <form method="GET" className="flex items-end gap-2 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-ink-soft">Tingkat kesulitan</label>
              <select name="tingkatKesulitan" defaultValue={sp.tingkatKesulitan ?? ""} className="bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs">
                <option value="">Semua</option>
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </select>
            </div>
            <Button type="submit" size="sm" variant="ghost">Filter</Button>
            {sp.tingkatKesulitan && (
              <a href={`/guru/ujian/${ujian.id}/edit`} className="text-xs text-ink-soft hover:underline self-center">Reset</a>
            )}
          </form>
          <div className="flex flex-col gap-2">
            {bankTersedia.length === 0 && <p className="text-xs text-ink-soft">Tidak ada soal lain tersedia.</p>}
            {bankTersedia.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-b border-rule pb-2 last:border-0">
                <div className="text-xs">
                  <SoalHtml html={(s.sekolahId === null ? "✦ " : "") + s.pertanyaan} className="line-clamp-1" />
                  <div className="text-ink-soft">{JENIS_LABEL[s.jenis]} · {s.topik ?? "-"}{s.sekolahId === null ? " · dari Selaras Ajar" : ""}</div>
                </div>
                <form action="/api/ujian/soal-tambah" method="POST">
                  <input type="hidden" name="ujianId" value={ujian.id} />
                  <input type="hidden" name="soalId" value={s.id} />
                  <Button type="submit" size="sm" variant="ghost">+ Tambah</Button>
                </form>
              </div>
            ))}
          </div>
          <Callout>
            💡 Setiap soal baru yang kamu buat <b>otomatis masuk bank soal</b> — bisa dipakai lagi di ujian lain.
          </Callout>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('jenis-select-2')?.addEventListener('change', function(e){
              var v = e.target.value;
              var isPG = v === 'PILIHAN_GANDA' || v === 'PILIHAN_GANDA_MINUS';
              var isPGK = v === 'PILIHAN_GANDA_KOMPLEKS';
              var isMinus = v === 'PILIHAN_GANDA_MINUS';
              var pg = document.getElementById('opsi-pg-2');
              var minus = document.getElementById('pengurangan-minus-2');
              var durasi = document.getElementById('durasi-soal-2');
              if (pg) pg.style.display = (isPG || isPGK) ? 'block' : 'none';
              if (minus) minus.style.display = isMinus ? 'grid' : 'none';
              if (durasi) durasi.style.display = (v === 'JAWABAN_SINGKAT' || v === 'ESAI') ? 'flex' : 'none';
              document.querySelectorAll('#opsi-pg-2 input[name="opsi"]').forEach(function(el){ el.disabled = !(isPG || isPGK); });
              document.querySelectorAll('.kunci-pg-2').forEach(function(el){ el.style.display = isPG ? 'inline-block' : 'none'; el.disabled = !isPG; });
              document.querySelectorAll('.kunci-pgk-2').forEach(function(el){ el.style.display = isPGK ? 'inline-block' : 'none'; el.disabled = !isPGK; });
            });
          `,
        }}
      />
    </AppShell>
  );
}
