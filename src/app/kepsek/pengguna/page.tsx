import { getSession } from "@/lib/auth";
import { getSemuaPengguna } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";

const PERAN_LABEL: Record<string, string> = {
  KEPALA_SEKOLAH: "Kepala Sekolah",
  BENDAHARA: "Bendahara",
  GURU: "Guru",
  ORANG_TUA: "Orang Tua",
  MURID: "Murid",
};

export default async function ManajemenPenggunaPage() {
  const session = await getSession();
  if (!session) return null;

  const pengguna = await getSemuaPengguna(session.sekolahId);

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/pengguna"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Pengguna & Peran"
      pageSubtitle={`${pengguna.length} akun terdaftar — atur siapa boleh akses apa`}
    >
      <details className="bg-paper-raised border border-rule rounded-xl p-5 mb-6">
        <summary className="cursor-pointer font-semibold text-sm">+ Tambah pengguna baru</summary>
        <form action="/api/pengguna" method="POST" className="mt-4 grid md:grid-cols-4 gap-3">
          <input name="nama" required placeholder="Nama" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <select name="peran" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
            <option value="GURU">Guru</option>
            <option value="BENDAHARA">Bendahara</option>
            <option value="ORANG_TUA">Orang Tua</option>
            <option value="MURID">Murid</option>
            <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
          </select>
          <input name="telepon" placeholder="No. HP (opsional)" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
          <Button type="submit" size="sm" className="md:col-span-4 w-fit">Tambah — password awal: selaras123</Button>
        </form>
      </details>

      <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-2.5 font-bold">Nama</th>
              <th className="text-left px-4 py-2.5 font-bold">Email</th>
              <th className="text-left px-4 py-2.5 font-bold">Peran</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {pengguna.map((p) => (
              <tr key={p.id} className="border-t border-rule">
                <td className="px-4 py-2.5 font-medium">{p.nama}</td>
                <td className="px-4 py-2.5 text-ink-soft">{p.email}</td>
                <td className="px-4 py-2.5"><Pill tone="info">{PERAN_LABEL[p.peran]}</Pill></td>
                <td className="px-4 py-2.5"><Pill tone={p.aktif ? "ok" : "neutral"}>{p.aktif ? "Aktif" : "Nonaktif"}</Pill></td>
                <td className="px-4 py-2.5">
                  <form action="/api/pengguna/toggle-aktif" method="POST">
                    <input type="hidden" name="penggunaId" value={p.id} />
                    <button type="submit" className="text-xs font-semibold text-primary-deep hover:underline">
                      {p.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
