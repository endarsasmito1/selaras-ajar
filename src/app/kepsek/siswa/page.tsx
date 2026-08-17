import { getSession } from "@/lib/auth";
import { getDaftarSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export default async function DataSiswaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; impor_dibuat?: string; impor_diperbarui?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;

  const semuaSiswa = await getDaftarSiswa(session.sekolahId);
  const q = (params.q ?? "").toLowerCase().trim();
  const siswa = q
    ? semuaSiswa.filter((s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q) || s.kelas.nama.toLowerCase().includes(q))
    : semuaSiswa;

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/siswa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Data Siswa"
      pageSubtitle={`${semuaSiswa.length} siswa terdaftar`}
      headerAction={
        <div className="flex gap-2">
          <LinkButton href="/kepsek/siswa/mutasi" variant="ghost" size="sm">Mutasi</LinkButton>
          <LinkButton href="/kepsek/ekspor" size="sm">Ekspor / Impor CSV</LinkButton>
        </div>
      }
    >
      {params.impor_dibuat !== undefined && (
        <Callout>
          ✓ Impor selesai — {params.impor_dibuat} siswa baru dibuat, {params.impor_diperbarui} siswa diperbarui. Data hasil impor tetap bisa diedit satu per satu di bawah.
        </Callout>
      )}

      <form method="GET" className="mb-4">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Cari nama, NISN, atau kelas…"
          className="bg-paper-raised border border-rule rounded-lg px-3.5 py-2 text-sm w-72"
        />
      </form>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Nama</th>
              <th className="text-left px-4 py-2.5 font-bold">NISN</th>
              <th className="text-left px-4 py-2.5 font-bold">Kelas</th>
              <th className="text-left px-4 py-2.5 font-bold">Wali</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {siswa.map((s) => (
              <tr key={s.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 font-semibold">{s.nama}</td>
                <td className="px-4 py-2.5 tabnum text-ink-soft">{s.nisn}</td>
                <td className="px-4 py-2.5">{s.kelas.nama}</td>
                <td className="px-4 py-2.5 text-ink-soft">
                  {s.wali[0]
                    ? `${s.wali[0].pengguna.nama} (${s.wali[0].hubungan})`
                    : "— belum ada data"}
                </td>
                <td className="px-4 py-2.5">
                  <Pill tone={s.aktif ? "ok" : "neutral"}>{s.aktif ? "Aktif" : "Nonaktif"}</Pill>
                </td>
                <td className="px-4 py-2.5">
                  <a href={`/kepsek/siswa/${s.id}/edit`} className="text-xs font-semibold text-primary-deep hover:underline">Edit</a>
                </td>
              </tr>
            ))}
            {siswa.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-soft text-xs">Tidak ada siswa yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
