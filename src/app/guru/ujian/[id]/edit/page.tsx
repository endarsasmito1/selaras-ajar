import { getSession } from "@/lib/auth";
import { getUjianDetail, getBankSoal } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";

const JENIS_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export default async function EditUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const ujian = await getUjianDetail(id);
  if (!ujian) return null;

  const bankSoal = await getBankSoal(session.sekolahId, ujian.mapelId);
  const soalDipakaiIds = new Set(ujian.soal.map((s) => s.soalId));
  const bankTersedia = bankSoal.filter((s) => !soalDipakaiIds.has(s.id));
  const totalPoin = ujian.soal.reduce((sum, s) => sum + s.poin, 0);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/ujian"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Susun Ujian — ${ujian.judul}`}
      pageSubtitle={`${ujian.mapel.nama} · Kelas ${ujian.kelas.nama} · draft`}
      headerAction={
        <LinkButton href={`/guru/ujian/${ujian.id}/pengaturan`} size="sm">
          Lanjut ke pengaturan →
        </LinkButton>
      }
    >
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
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-sm text-primary-deep">Soal {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <Pill tone={us.soal.jenis === "PILIHAN_GANDA" ? "info" : us.soal.jenis === "ESAI" ? "warn" : "neutral"}>
                      {JENIS_LABEL[us.soal.jenis]} · {us.poin} poin
                    </Pill>
                    <form action="/api/ujian/soal-hapus" method="POST">
                      <input type="hidden" name="ujianId" value={ujian.id} />
                      <input type="hidden" name="soalId" value={us.soalId} />
                      <button type="submit" className="text-xs text-warning hover:underline">Hapus</button>
                    </form>
                  </div>
                </div>
                <p className="text-sm mb-2">{us.soal.pertanyaan}</p>
                {us.soal.jenis === "PILIHAN_GANDA" && us.soal.opsi && (
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
                  <option value="JAWABAN_SINGKAT">Jawaban Singkat</option>
                  <option value="ESAI">Esai</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 mb-3">
                <label className="text-xs font-semibold">Pertanyaan</label>
                <textarea name="pertanyaan" required rows={2} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              </div>
              <div id="opsi-pg-2" className="mb-3">
                <label className="text-xs font-semibold block mb-1.5">Opsi jawaban (Pilihan Ganda)</label>
                <div className="flex flex-col gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="kunciJawaban" value={i} className="accent-[color:var(--primary)]" />
                      <input name="opsi" placeholder={`Opsi ${String.fromCharCode(65 + i)}`} className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mb-3">
                <label className="text-xs font-semibold">Kunci jawaban (Jawaban Singkat)</label>
                <input name="kunciSingkat" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
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
          <div className="flex flex-col gap-2">
            {bankTersedia.length === 0 && <p className="text-xs text-ink-soft">Tidak ada soal lain tersedia.</p>}
            {bankTersedia.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-b border-rule pb-2 last:border-0">
                <div className="text-xs">
                  <div className="line-clamp-1">{s.pertanyaan}</div>
                  <div className="text-ink-soft">{JENIS_LABEL[s.jenis]} · {s.topik ?? "-"}</div>
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
              var pg = document.getElementById('opsi-pg-2');
              if (pg) pg.style.display = v === 'PILIHAN_GANDA' ? 'block' : 'none';
            });
          `,
        }}
      />
    </AppShell>
  );
}
