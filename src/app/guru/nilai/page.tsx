import { getSession } from "@/lib/auth";
import { getKelasDiampu, getSiswaKelas, getNilaiKelasMapel, getSumberPenilaianKelas, getSkorAsliSumberPenilaian, resolveKkm } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";

export default async function NilaiPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; mapel?: string; sumber?: string; error?: string; nilai_disimpan?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const params = await searchParams;

  const penugasanAktif =
    penugasan.find((p) => p.kelas.id === params.kelas && p.mapel.id === params.mapel) ??
    penugasan[0];

  if (!penugasanAktif) {
    return (
      <AppShell
        groups={NAV_GURU}
        activeHref="/guru/nilai"
        userName={session.nama}
        userRoleLabel={ROLE_LABEL[session.peran]}
        pageTitle="Nilai & Rapor"
      >
        <p className="text-sm text-ink-soft">Belum ada kelas yang diampu.</p>
      </AppShell>
    );
  }

  const [siswa, nilaiTersimpan, sumberPenilaian] = await Promise.all([
    getSiswaKelas(penugasanAktif.kelas.id),
    getNilaiKelasMapel(penugasanAktif.kelas.id, penugasanAktif.mapel.id),
    getSumberPenilaianKelas(penugasanAktif.kelas.id, penugasanAktif.mapel.id),
  ]);

  // 1.20 — nilai bersumber Ujian bisa punya KKM efektif beda (UTS/UAS) dari KKM dasar mapel.
  // Nilai.komponen cuma "Tugas"/"Ujian" (bukan FK), jadi dicocokkan lewat judul (sama persis
  // dgn cara "Sumber penilaian" di atas mencocokkan opsi dropdown-nya).
  const jenisPenilaianByJudul = new Map(sumberPenilaian.ujian.map((u) => [u.judul, u.jenisPenilaian]));

  const rataRata =
    nilaiTersimpan.length > 0
      ? Math.round(
          (nilaiTersimpan.reduce((sum, n) => sum + n.skor, 0) / nilaiTersimpan.length) * 10
        ) / 10
      : null;

  // 1.10, diminta eksplisit (G-2): "komponen" sekarang dipilih dari Tugas/Ujian kelas & mapel ini
  // yang sungguh ada (bukan kategori generik lepas) — value select berformat "tugas:<id>"/"ujian:<id>".
  const opsiSumber = [
    ...sumberPenilaian.tugas.map((t) => ({ tipe: "tugas" as const, id: t.id, judul: t.judul })),
    ...sumberPenilaian.ujian.map((u) => ({ tipe: "ujian" as const, id: u.id, judul: u.judul })),
  ];
  const sumberAktifRaw = params.sumber ?? (opsiSumber.length > 0 ? `${opsiSumber[0].tipe}:${opsiSumber[0].id}` : "");
  const [sumberTipeAktif, sumberIdAktif] = sumberAktifRaw.split(":") as ["tugas" | "ujian" | "", string];
  const sumberAktif = opsiSumber.find((o) => o.tipe === sumberTipeAktif && o.id === sumberIdAktif);
  const komponenAktif = sumberAktif?.tipe === "tugas" ? "Tugas" : "Ujian";
  const judulAktif = sumberAktif?.judul ?? "";

  // Prioritas prefill: baris Nilai yang sudah pernah disimpan/diedit di sini > skor asli dari
  // PengumpulanTugas/UjianPengerjaan (kalau belum pernah disentuh dari halaman ini sama sekali).
  const skorNilaiTersimpan = new Map(
    nilaiTersimpan.filter((n) => n.komponen === komponenAktif && n.judul === judulAktif).map((n) => [n.siswaId, n.skor])
  );
  const skorAsli = sumberAktif ? await getSkorAsliSumberPenilaian(sumberAktif.tipe, sumberAktif.id) : new Map<string, number | null>();
  const skorTersimpan = new Map<string, number>();
  for (const s of siswa) {
    const dariNilai = skorNilaiTersimpan.get(s.id);
    const dariAsli = skorAsli.get(s.id);
    if (dariNilai !== undefined) skorTersimpan.set(s.id, dariNilai);
    else if (dariAsli !== undefined && dariAsli !== null) skorTersimpan.set(s.id, dariAsli);
  }
  const sedangEdit = skorTersimpan.size > 0;

  // Kelompokkan riwayat per (komponen, judul) supaya tiap penilaian punya satu baris + tautan Edit.
  const kelompok = new Map<string, { komponen: string; judul: string; nilai: typeof nilaiTersimpan }>();
  for (const n of nilaiTersimpan) {
    const key = `${n.komponen}|||${n.judul}`;
    if (!kelompok.has(key)) kelompok.set(key, { komponen: n.komponen, judul: n.judul, nilai: [] });
    kelompok.get(key)!.nilai.push(n);
  }
  const kelompokList = Array.from(kelompok.values());
  const hrefEditKelompok = (komponen: string, judul: string) => {
    const o = opsiSumber.find((o) => (o.tipe === "tugas" ? "Tugas" : "Ujian") === komponen && o.judul === judul);
    return o ? `/guru/nilai?kelas=${penugasanAktif.kelas.id}&mapel=${penugasanAktif.mapel.id}&sumber=${o.tipe}:${o.id}` : null;
  };

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/nilai"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Input Nilai"
      pageSubtitle={`${penugasanAktif.mapel.nama} — Kelas ${penugasanAktif.kelas.nama} · KKM ${penugasanAktif.mapel.kkm}${penugasanAktif.mapel.kkmUTS !== null || penugasanAktif.mapel.kkmUAS !== null ? ` (UTS ${penugasanAktif.mapel.kkmUTS ?? penugasanAktif.mapel.kkm} · UAS ${penugasanAktif.mapel.kkmUAS ?? penugasanAktif.mapel.kkm})` : ""}`}
    >
      {penugasan.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {penugasan.map((p) => (
            <a
              key={p.id}
              href={`/guru/nilai?kelas=${p.kelas.id}&mapel=${p.mapel.id}`}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (p.id === penugasanAktif.id
                  ? "bg-primary text-white border-primary font-semibold"
                  : "border-rule text-ink-soft hover:bg-paper-raised")
              }
            >
              {p.mapel.nama} · {p.kelas.nama}
            </a>
          ))}
        </div>
      )}

      {params.error && <div className="mb-4"><Callout tone="warn">{params.error}</Callout></div>}
      {params.nilai_disimpan && <div className="mb-4"><Callout>✓ Nilai untuk &quot;{params.nilai_disimpan}&quot; tersimpan.</Callout></div>}

      {opsiSumber.length === 0 ? (
        <Callout tone="warn">Belum ada Tugas atau Ujian di kelas & mapel ini — buat dulu di menu Tugas/Ujian sebelum bisa input nilai di sini.</Callout>
      ) : (
      <>
        {/* Form GET terpisah utk pilih sumber — ganti pilihan lalu klik Tampilkan utk reload dgn prefill baru. */}
        <form method="GET" action="/guru/nilai" className="bg-paper-raised border border-rule rounded-xl p-5 mb-4 flex items-end gap-3">
          <input type="hidden" name="kelas" value={penugasanAktif.kelas.id} />
          <input type="hidden" name="mapel" value={penugasanAktif.mapel.id} />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <label className="text-xs font-semibold">Sumber penilaian (Tugas / Ujian)</label>
            <select name="sumber" defaultValue={sumberAktifRaw} className="w-full bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              {sumberPenilaian.tugas.length > 0 && (
                <optgroup label="Tugas">
                  {sumberPenilaian.tugas.map((t) => (
                    <option key={t.id} value={`tugas:${t.id}`}>{t.judul}</option>
                  ))}
                </optgroup>
              )}
              {sumberPenilaian.ujian.length > 0 && (
                <optgroup label="Ujian">
                  {sumberPenilaian.ujian.map((u) => (
                    <option key={u.id} value={`ujian:${u.id}`}>{u.judul}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <Button type="submit" variant="ghost" size="sm">Tampilkan</Button>
        </form>

      <form
        action="/api/nilai"
        method="POST"
        className="bg-paper-raised border border-rule rounded-xl p-5 mb-6"
      >
        <input type="hidden" name="kelasId" value={penugasanAktif.kelas.id} />
        <input type="hidden" name="mapelId" value={penugasanAktif.mapel.id} />
        <input type="hidden" name="sumberTipe" value={sumberAktif?.tipe ?? ""} />
        <input type="hidden" name="sumberId" value={sumberAktif?.id ?? ""} />
        <p className="text-xs text-ink-soft font-semibold mb-3">{komponenAktif}: {judulAktif}</p>
        {sedangEdit && (
          <p className="text-xs text-primary-deep font-semibold mb-3">✎ Nilai yang sudah tersimpan/ada ditampilkan — simpan untuk memperbarui (mengubah nilai tugas/ujian aslinya juga).</p>
        )}

        <div className="rounded-lg overflow-x-auto border border-rule mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-3 py-2 font-bold w-10">No</th>
                <th className="text-left px-3 py-2 font-bold">Nama Siswa</th>
                <th className="text-left px-3 py-2 font-bold w-32">Nilai (0–100)</th>
              </tr>
            </thead>
            <tbody>
              {siswa.map((s, i) => (
                <tr key={s.id} className="border-t border-rule bg-paper">
                  <td className="px-3 py-2 tabnum">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{s.nama}</td>
                  <td className="px-3 py-2">
                    <input type="hidden" name="siswaId" value={s.id} />
                    <input
                      name={`skor_${s.id}`}
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={skorTersimpan.get(s.id) ?? ""}
                      className="w-16 text-center bg-paper-raised border border-rule rounded-md px-2 py-1.5 text-sm tabnum"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="submit">{sedangEdit ? "Simpan perubahan" : "Simpan nilai"}</Button>
      </form>
      </>
      )}

      <div className="bg-paper-raised border border-rule rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Riwayat penilaian tersimpan</h3>
          {rataRata !== null && (
            <span className="text-sm text-ink-soft">
              Rata-rata: <b className="text-ink tabnum">{rataRata}</b>
            </span>
          )}
        </div>
        {kelompokList.length === 0 ? (
          <p className="text-sm text-ink-soft">Belum ada nilai tersimpan.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {kelompokList.map((g) => (
              <details key={`${g.komponen}|||${g.judul}`} className="border-b border-rule last:border-0 pb-2.5">
                <summary className="cursor-pointer flex items-center justify-between text-sm">
                  <span className="font-semibold">{g.judul} <span className="text-ink-soft font-normal">— {g.komponen}</span></span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-soft">{g.nilai.length} siswa dinilai</span>
                    {hrefEditKelompok(g.komponen, g.judul) && (
                      <a
                        href={hrefEditKelompok(g.komponen, g.judul)!}
                        className="text-xs font-semibold text-primary-deep hover:underline"
                      >
                        Edit
                      </a>
                    )}
                  </div>
                </summary>
                <div className="mt-2 flex flex-col gap-1">
                  {(() => {
                    const jenisPenilaian = g.komponen === "Ujian" ? jenisPenilaianByJudul.get(g.judul) ?? "HARIAN" : "HARIAN";
                    const kkmEfektif = resolveKkm(penugasanAktif.mapel, jenisPenilaian);
                    return g.nilai.map((n) => (
                      <div key={n.id} className="flex items-center justify-between text-sm py-1">
                        <span>{n.siswa.nama}</span>
                        <div className="flex items-center gap-2">
                          <span className="tabnum font-semibold">{n.skor}</span>
                          <Pill tone={n.skor >= kkmEfektif ? "ok" : "warn"}>
                            {n.skor >= kkmEfektif ? "Tuntas" : "Remedial"}
                          </Pill>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
