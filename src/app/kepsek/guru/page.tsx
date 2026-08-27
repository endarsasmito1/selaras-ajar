import { getSession } from "@/lib/auth";
import { getDaftarGuru, getTahunAjaranAktif, getRekapPresensiGuru } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";

export default async function DataGuruPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; impor_guru?: string; guru_dibuat?: string; guru_diubah?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [guru, tahunAktif] = await Promise.all([
    getDaftarGuru(session.sekolahId, sp.q),
    getTahunAjaranAktif(session.sekolahId),
  ]);

  // Indikator kehadiran mengajar (bukan kehadiran murid) — sumbernya PresensiGuru via
  // getRekapPresensiGuru, dipakai jg di kepsek/presensi-guru. ≥90% baik, 75-89% cukup, <75% perlu perhatian.
  const kehadiranMap = new Map<string, number | null>();
  if (tahunAktif) {
    await Promise.all(
      guru.map(async (g) => {
        if (!g.guruProfil) return;
        const rekap = await getRekapPresensiGuru(g.guruProfil.id, tahunAktif.id);
        kehadiranMap.set(g.id, rekap.totalSesiTerjadwal > 0 ? Math.round((rekap.totalHadir / rekap.totalSesiTerjadwal) * 100) : null);
      })
    );
  }
  function indikatorTone(persen: number | null): "ok" | "warn" | "danger" | "neutral" {
    if (persen === null) return "neutral";
    if (persen >= 90) return "ok";
    if (persen >= 75) return "warn";
    return "danger";
  }

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/guru"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Data Guru"
      pageSubtitle={`${guru.length} guru & staf`}
      headerAction={
        <form method="GET" className="flex items-center gap-1.5">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari nama guru…"
            className="bg-paper-raised border border-rule rounded-lg px-3 py-1.5 text-xs w-48"
          />
          <Button type="submit" size="sm" variant="ghost">Cari</Button>
        </form>
      }
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      {sp.impor_guru && <div className="mb-4"><Callout>✓ Impor guru selesai — {sp.impor_guru} akun guru baru dibuat.</Callout></div>}
      {sp.guru_dibuat && <div className="mb-4"><Callout>✓ Guru &quot;{sp.guru_dibuat}&quot; ditambahkan — password sementara <code>selaras123</code>.</Callout></div>}
      {sp.guru_diubah && <div className="mb-4"><Callout>✓ Data guru &quot;{sp.guru_diubah}&quot; diperbarui.</Callout></div>}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <details className="bg-paper-raised border border-rule rounded-xl p-5">
          <summary className="cursor-pointer font-semibold text-sm">+ Tambah guru manual (MG-1)</summary>
          <form action="/api/guru" method="POST" className="mt-4 flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <input name="nama" required placeholder="Nama lengkap" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm col-span-2" />
              <input name="email" type="email" required placeholder="Email" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <input name="telepon" placeholder="No. HP" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <input name="nip" placeholder="NIP/NUPTK (opsional)" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <input name="mapelUtama" placeholder="Mapel utama (opsional)" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
              <select name="jenisKelamin" defaultValue="" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                <option value="">Jenis kelamin (opsional)</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <p className="text-xs text-ink-soft">Akun baru dapat password sementara <code>selaras123</code> — minta guru gantinya setelah login pertama. Penugasan kelas & mapel diatur setelah ini, dari halaman Edit.</p>
            <Button type="submit" size="sm" className="self-start">Tambah guru</Button>
          </form>
        </details>

        <details className="bg-paper-raised border border-rule rounded-xl p-5">
          <summary className="cursor-pointer font-semibold text-sm">+ Impor guru via CSV (C-2)</summary>
          <form action="/api/impor/guru" method="POST" encType="multipart/form-data" className="mt-4 flex flex-col gap-2.5">
            <p className="text-xs text-ink-soft">
              Kolom: <code>nama,email,telepon,nip,mapelUtama</code> — baris pertama header. Email yang sudah terdaftar akan dilewati.
            </p>
            <input name="file" type="file" accept=".csv" required className="text-xs" />
            <Button type="submit" size="sm" variant="ghost" className="self-start">Unggah & impor</Button>
          </form>
        </details>
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Nama</th>
              <th className="text-left px-4 py-2.5 font-bold">No. HP</th>
              <th className="text-left px-4 py-2.5 font-bold">NIP</th>
              <th className="text-left px-4 py-2.5 font-bold">Mapel utama</th>
              <th className="text-left px-4 py-2.5 font-bold">Penugasan kelas</th>
              <th className="text-left px-4 py-2.5 font-bold">Peran</th>
              <th className="text-left px-4 py-2.5 font-bold">Kehadiran Mengajar</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {guru.map((g) => (
              <tr key={g.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 font-semibold">{g.nama}</td>
                <td className="px-4 py-2.5 text-ink-soft">{g.telepon ?? "—"}</td>
                <td className="px-4 py-2.5 tabnum text-ink-soft">{g.guruProfil?.nip ?? "—"}</td>
                <td className="px-4 py-2.5">{g.guruProfil?.mapelUtama ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {g.guruProfil?.penugasan.length ? (
                      g.guruProfil.penugasan.map((p) => (
                        <span
                          key={p.id}
                          className="text-[11px] bg-primary-tint text-primary-deep px-2 py-0.5 rounded-full font-semibold"
                        >
                          {p.kelas.nama} · {p.mapel.nama}
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-soft text-xs">Belum ditugaskan</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {g.waliKelasDi.length > 0 ? (
                    <Pill tone="info">Wali {g.waliKelasDi[0].nama}</Pill>
                  ) : (
                    <Pill tone="neutral">Guru mapel</Pill>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {(() => {
                    const persen = kehadiranMap.get(g.id) ?? null;
                    return (
                      <Pill tone={indikatorTone(persen)}>
                        {persen !== null ? `${persen}% — ${persen >= 90 ? "Baik" : persen >= 75 ? "Cukup" : "Perlu perhatian"}` : "Data belum memadai"}
                      </Pill>
                    );
                  })()}
                </td>
                <td className="px-4 py-2.5">
                  <a href={`/kepsek/guru/${g.id}/edit`} className="text-xs font-semibold text-primary-deep hover:underline">Edit</a>
                </td>
              </tr>
            ))}
            {guru.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-ink-soft text-xs">Tidak ada guru yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
