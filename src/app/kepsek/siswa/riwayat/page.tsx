import { getSession } from "@/lib/auth";
import { getRiwayatSiswa } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  LULUS: "Lulus",
  PINDAH_SEKOLAH: "Pindah sekolah",
  MUTASI_KELUAR: "Mutasi keluar",
};
const STATUS_TONE: Record<string, "ok" | "info" | "warn"> = {
  LULUS: "ok",
  PINDAH_SEKOLAH: "info",
  MUTASI_KELUAR: "warn",
};

export default async function RiwayatSiswaPage() {
  const session = await getSession();
  if (!session) return null;

  const riwayat = await getRiwayatSiswa(session.sekolahId);

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/siswa/riwayat"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Riwayat Siswa"
      pageSubtitle={`${riwayat.length} siswa lulus / pindah sekolah / mutasi keluar — data histori, tak pernah dihapus (F-2/F-3)`}
    >
      <div className="bg-paper-raised border border-rule rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Nama</th>
              <th className="text-left px-4 py-2.5 font-bold">NISN</th>
              <th className="text-left px-4 py-2.5 font-bold">Kelas terakhir</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold">Tanggal</th>
              <th className="text-left px-4 py-2.5 font-bold">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {riwayat.map((s) => (
              <tr key={s.id} className="border-t border-rule hover:bg-paper">
                <td className="px-4 py-2.5 font-semibold">
                  <a href={`/kepsek/siswa/${s.id}`} className="hover:underline">{s.nama}</a>
                </td>
                <td className="px-4 py-2.5 tabnum text-ink-soft">{s.nisn}</td>
                <td className="px-4 py-2.5">{s.kelas.nama}</td>
                <td className="px-4 py-2.5">
                  {s.statusKeluar && <Pill tone={STATUS_TONE[s.statusKeluar]}>{STATUS_LABEL[s.statusKeluar]}</Pill>}
                </td>
                <td className="px-4 py-2.5 text-ink-soft text-xs">{s.tanggalKeluar ? formatTanggal(s.tanggalKeluar) : "—"}</td>
                <td className="px-4 py-2.5 text-ink-soft text-xs">{s.keteranganKeluar ?? "—"}</td>
              </tr>
            ))}
            {riwayat.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-soft text-xs">Belum ada siswa lulus/pindah/keluar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
