import { getSession } from "@/lib/auth";
import { getSemuaKelas, getSemuaMapel, getTahunAjaranAktif, getGradeScale, getKurikulumUntukJenjang } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Card, CardHead } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

const KOMPONEN = ["Ulangan Harian", "Tugas", "UTS", "UAS"];

export default async function MasterDataPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    kelas_dibuat?: string;
    kelas_diubah?: string;
    mapel_dibuat?: string;
    mapel_diubah?: string;
    impor_kelas?: string;
    impor_mapel?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [kelasList, mapelList, tahunAktif, gradeScale, sekolah] = await Promise.all([
    getSemuaKelas(session.sekolahId),
    getSemuaMapel(session.sekolahId),
    getTahunAjaranAktif(session.sekolahId),
    getGradeScale(session.sekolahId),
    prisma.sekolah.findUnique({ where: { id: session.sekolahId }, select: { jenjang: true, kurikulumId: true } }),
  ]);
  const kurikulumOpsi = sekolah ? await getKurikulumUntukJenjang(sekolah.jenjang) : [];
  const kurikulumTerpilih = kurikulumOpsi.find((k) => k.id === sekolah?.kurikulumId) ?? null;

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/master-data"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Master Data & Nilai"
      pageSubtitle="Kelas & mapel jadi dasar penugasan guru (MG-2), jadwal, ujian, tugas — plus pembobotan/predikat/KKM yang menempel ke mapel di sini (F-18, 1.7)"
      lebarPenuh
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.kelas_dibuat && <div className="mb-4"><Callout>✓ Kelas &quot;{sp.kelas_dibuat}&quot; ditambahkan.</Callout></div>}
      {sp.kelas_diubah && <div className="mb-4"><Callout>✓ Kelas &quot;{sp.kelas_diubah}&quot; diperbarui.</Callout></div>}
      {sp.mapel_dibuat && <div className="mb-4"><Callout>✓ Mapel &quot;{sp.mapel_dibuat}&quot; ditambahkan.</Callout></div>}
      {sp.mapel_diubah && <div className="mb-4"><Callout>✓ Mapel &quot;{sp.mapel_diubah}&quot; diperbarui.</Callout></div>}
      {sp.impor_kelas && <div className="mb-4"><Callout>✓ Impor kelas selesai — {sp.impor_kelas} baris diproses.</Callout></div>}
      {sp.impor_mapel && <div className="mb-4"><Callout>✓ Impor mapel selesai — {sp.impor_mapel} baris diproses.</Callout></div>}

      {!tahunAktif && (
        <div className="mb-4">
          <Callout tone="warn">Belum ada tahun ajaran aktif — kelas baru akan mengikuti tahun ajaran begitu diaktifkan.</Callout>
        </div>
      )}

      {/* 1.21 — 3 kolom di layar lebar (bukan cuma 2) supaya area di kanan Kelas/Mapel tak nganggur
          kosong di dalam container 1100px; Pembobotan dipindah naik ke baris ini, Rentang
          predikat & KKM tetap di bawah selebar penuh krn baris formnya sendiri sudah lebar.
          items-start (bukan default stretch) — tanpa ini card Mapel/Pembobotan yg lebih pendek
          dipaksa setinggi card Kelas (24 baris, plg tinggi), bikin elemen di dalamnya (mis. tombol
          Simpan kurikulum) ketiban <details> lain saat scroll-into-view Playwright. */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5 items-start">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg">Kelas ({kelasList.length})</h3>
          </div>
          <div className="flex flex-col gap-3 mb-4">
            {Array.from(
              kelasList.reduce((m, k) => {
                (m.get(k.tingkat) ?? m.set(k.tingkat, []).get(k.tingkat)!).push(k);
                return m;
              }, new Map<number, typeof kelasList>())
            )
              .sort(([a], [b]) => a - b)
              .map(([tingkat, kelasTingkat]) => (
                <div key={tingkat}>
                  <div className="text-[10px] uppercase tracking-wider text-ink-soft font-bold mb-1">Tingkat {tingkat}</div>
                  <div className="flex flex-col gap-1">
                    {kelasTingkat.map((k) => (
                      <details key={k.id} className="border-b border-rule last:border-0 py-1.5">
                        <summary className="cursor-pointer flex items-center justify-between text-sm">
                          <span className="font-semibold">{k.nama}</span>
                        </summary>
                        <form action="/api/master-data/kelas/update" method="POST" className="mt-2 flex items-center gap-2">
                          <input type="hidden" name="kelasId" value={k.id} />
                          <input name="nama" defaultValue={k.nama} required className="flex-1 bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs" />
                          <input type="number" name="tingkat" defaultValue={k.tingkat} required min={1} max={12} className="w-16 bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs" />
                          <Button type="submit" size="sm" variant="ghost">Simpan</Button>
                        </form>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            {kelasList.length === 0 && <p className="text-xs text-ink-soft py-2">Belum ada kelas.</p>}
          </div>

          <details className="mb-3">
            <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Tambah kelas manual</summary>
            <form action="/api/master-data/kelas" method="POST" className="mt-3 flex flex-col gap-2.5">
              <input name="nama" required placeholder="Nama kelas, mis. 6C" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <input name="tingkat" required type="number" min={1} max={12} placeholder="Tingkat, mis. 6" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <Button type="submit" size="sm" className="self-start">Tambah kelas</Button>
            </form>
          </details>

          <details>
            <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Impor kelas via CSV (nama,tingkat)</summary>
            <form action="/api/master-data/kelas/impor" method="POST" encType="multipart/form-data" className="mt-3 flex flex-col gap-2.5">
              <p className="text-xs text-ink-soft">Kolom: <code>nama,tingkat</code> — baris pertama header. Nama yang sudah ada akan dilewati (tak menduplikat).</p>
              <input name="file" type="file" accept=".csv" required className="text-xs" />
              <Button type="submit" size="sm" variant="ghost" className="self-start">Unggah & impor</Button>
            </form>
          </details>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg">Mata Pelajaran ({mapelList.length})</h3>
          </div>
          {sekolah && (
            <div className="mb-4 flex flex-col gap-2.5">
              {kurikulumOpsi.length > 0 && (
                <form action="/api/master-data/kurikulum" method="POST" className="flex items-center gap-2">
                  <select name="kurikulumId" defaultValue={kurikulumTerpilih?.id ?? ""} className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                    <option value="">— Belum pilih kurikulum (pakai preset Kurikulum Merdeka) —</option>
                    {kurikulumOpsi.map((k) => (<option key={k.id} value={k.id}>{k.nama}</option>))}
                  </select>
                  <Button type="submit" size="sm" variant="ghost">Simpan</Button>
                </form>
              )}
              <form action="/api/master-data/mapel/kurikulum" method="POST">
                <Button type="submit" size="sm" variant="ghost" className="w-full">
                  ⚡ Isi sesuai {kurikulumTerpilih ? kurikulumTerpilih.nama : `Kurikulum Merdeka (${sekolah.jenjang})`}
                </Button>
                <p className="text-[11px] text-ink-soft mt-1.5">
                  Tambahkan mapel dari {kurikulumTerpilih ? `kurikulum "${kurikulumTerpilih.nama}"` : `preset Kurikulum Merdeka jenjang ${sekolah.jenjang}`} yang belum ada di daftar — mapel yang sudah ada tak akan diduplikat.
                </p>
              </form>
            </div>
          )}
          <div className="flex flex-col gap-1 mb-4">
            {mapelList.map((m) => (
              <details key={m.id} className="border-b border-rule last:border-0 py-1.5">
                <summary className="cursor-pointer flex items-center justify-between text-sm">
                  <span className="font-semibold">{m.nama}</span>
                  <span className="text-ink-soft tabnum text-xs">KKM {m.kkm}</span>
                </summary>
                <form action="/api/master-data/mapel/update" method="POST" className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="mapelId" value={m.id} />
                  <input name="nama" defaultValue={m.nama} required className="flex-1 bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs" />
                  <input type="number" name="kkm" defaultValue={m.kkm} required min={0} max={100} className="w-16 bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs" />
                  <Button type="submit" size="sm" variant="ghost">Simpan</Button>
                </form>
              </details>
            ))}
            {mapelList.length === 0 && <p className="text-xs text-ink-soft py-2">Belum ada mapel.</p>}
          </div>

          <details className="mb-3">
            <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Tambah mapel manual</summary>
            <form action="/api/master-data/mapel" method="POST" className="mt-3 flex flex-col gap-2.5">
              <input name="nama" required placeholder="Nama mapel, mis. Prakarya" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <input name="kkm" type="number" min={0} max={100} defaultValue={70} placeholder="KKM" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <Button type="submit" size="sm" className="self-start">Tambah mapel</Button>
            </form>
          </details>

          <details>
            <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Impor mapel via CSV (nama,kkm)</summary>
            <form action="/api/master-data/mapel/impor" method="POST" encType="multipart/form-data" className="mt-3 flex flex-col gap-2.5">
              <p className="text-xs text-ink-soft">Kolom: <code>nama,kkm</code> — baris pertama header, kkm opsional (default 70). Nama yang sudah ada akan dilewati.</p>
              <input name="file" type="file" accept=".csv" required className="text-xs" />
              <Button type="submit" size="sm" variant="ghost" className="self-start">Unggah & impor</Button>
            </form>
          </details>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHead title="Pembobotan nilai akhir" subtitle="Bobot komponen per mapel — total wajib 100%" />
          {mapelList.map((m) => {
            const bobotMap = new Map(m.bobot.map((b) => [b.komponen, b.persentase]));
            const total = KOMPONEN.reduce((s, k) => s + (bobotMap.get(k) ?? 0), 0);
            return (
              <details key={m.id} className="mb-3 border-t border-rule pt-3 first:border-0 first:pt-0">
                <summary className="cursor-pointer text-sm font-semibold">
                  {m.nama} <span className={"font-normal text-xs " + (total === 100 ? "text-ink-soft" : "text-warning")}>({total}%{total !== 100 ? " — belum 100%" : ""})</span>
                </summary>
                <form action="/api/nilai-config/bobot" method="POST" className="mt-3 flex flex-col gap-2.5">
                  <input type="hidden" name="mapelId" value={m.id} />
                  {KOMPONEN.map((k) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-xs w-32">{k}</span>
                      <input type="number" name={`bobot_${k}`} defaultValue={bobotMap.get(k) ?? 0} min={0} max={100} className="w-20 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum" />
                      <span className="text-xs text-ink-soft">%</span>
                    </div>
                  ))}
                  <Button type="submit" size="sm" className="self-start mt-1">Simpan bobot {m.nama}</Button>
                </form>
              </details>
            );
          })}
        </Card>

        <Card>
          <CardHead title="Rentang nilai → predikat" subtitle="Angka berapa masuk predikat apa" />
          <form action="/api/nilai-config/predikat" method="POST" className="flex flex-col gap-3">
            {gradeScale.map((g) => (
              <div key={g.id} className="flex items-center gap-2">
                <input type="hidden" name="scaleId" value={g.id} />
                <input type="number" name={`min_${g.id}`} defaultValue={g.minSkor} className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum" />
                <span className="text-ink-soft text-xs">–</span>
                <input type="number" name={`max_${g.id}`} defaultValue={g.maxSkor} className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum" />
                <input name={`label_${g.id}`} defaultValue={g.label} className="flex-1 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
              </div>
            ))}
            <div className="border-t border-rule pt-3 mt-1">
              <p className="text-xs font-semibold mb-2">+ Tambah rentang baru</p>
              <div className="flex items-center gap-2">
                <input type="number" name="minBaru" placeholder="min" className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
                <span className="text-ink-soft text-xs">–</span>
                <input type="number" name="maxBaru" placeholder="maks" className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
                <input name="labelBaru" placeholder="Label predikat" className="flex-1 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm" />
              </div>
            </div>
            <Button type="submit" size="sm" className="self-start">Simpan rentang predikat</Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardHead title="KKM per mata pelajaran" subtitle="Batas ketuntasan — bisa beda utk UTS/UAS dari KKM dasar, editable kapan saja, langsung berlaku ke perhitungan tuntas/remedial berikutnya" />
        <div className="flex flex-col gap-2">
          {mapelList.map((m) => (
            <form
              key={m.id}
              action="/api/nilai-config/kkm"
              method="POST"
              className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-2 flex-wrap gap-2"
            >
              <input type="hidden" name="mapelId" value={m.id} />
              <span className="min-w-[140px]">{m.nama}</span>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  Dasar
                  <input
                    type="number"
                    name="kkm"
                    defaultValue={m.kkm}
                    min={0}
                    max={100}
                    className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum text-right"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  UTS
                  <input
                    type="number"
                    name="kkmUTS"
                    defaultValue={m.kkmUTS ?? ""}
                    placeholder="—"
                    min={0}
                    max={100}
                    className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum text-right"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  UAS
                  <input
                    type="number"
                    name="kkmUAS"
                    defaultValue={m.kkmUAS ?? ""}
                    placeholder="—"
                    min={0}
                    max={100}
                    className="w-16 bg-paper border border-rule rounded-md px-2 py-1.5 text-sm tabnum text-right"
                  />
                </label>
                <Button type="submit" size="sm" variant="ghost">Simpan</Button>
              </div>
            </form>
          ))}
        </div>
        <p className="text-[11px] text-ink-soft mt-3">Kosongkan UTS/UAS supaya ikut KKM dasar.</p>
      </Card>
    </AppShell>
  );
}
