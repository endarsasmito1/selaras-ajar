import { getSession } from "@/lib/auth";
import { getKelasDiampu, getSiswaKelas, getAbsensiHariIni } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

const STATUS_OPTIONS = [
  { value: "HADIR", label: "H", peerClass: "peer-checked:bg-success peer-checked:text-white" },
  { value: "SAKIT", label: "S", peerClass: "peer-checked:bg-warning peer-checked:text-white" },
  { value: "IZIN", label: "I", peerClass: "peer-checked:bg-primary peer-checked:text-white" },
  { value: "ALPA", label: "A", peerClass: "peer-checked:bg-danger peer-checked:text-white" },
] as const;

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const penugasan = await getKelasDiampu(session.userId);
  const kelasUnik = Array.from(new Map(penugasan.map((p) => [p.kelas.id, p.kelas])).values());

  const params = await searchParams;
  const kelasAktifId = params.kelas ?? kelasUnik[0]?.id;
  const kelasAktif = kelasUnik.find((k) => k.id === kelasAktifId) ?? kelasUnik[0];

  if (!kelasAktif) {
    return (
      <AppShell
        groups={NAV_GURU}
        activeHref="/guru/absensi"
        userName={session.nama}
        userRoleLabel={ROLE_LABEL[session.peran]}
        pageTitle="Absensi"
      >
        <Callout tone="warn">Belum ada kelas yang diampu.</Callout>
      </AppShell>
    );
  }

  const [siswa, absensiMap] = await Promise.all([
    getSiswaKelas(kelasAktif.id),
    getAbsensiHariIni(kelasAktif.id),
  ]);

  const hariIniLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/absensi"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Absensi — Kelas ${kelasAktif.nama}`}
      pageSubtitle={hariIniLabel}
    >
      {kelasUnik.length > 1 && (
        <div className="flex gap-2 mb-4">
          {kelasUnik.map((k) => (
            <a
              key={k.id}
              href={`/guru/absensi?kelas=${k.id}`}
              className={
                "text-xs px-3 py-1.5 rounded-full border " +
                (k.id === kelasAktif.id
                  ? "bg-primary text-white border-primary font-semibold"
                  : "border-rule text-ink-soft hover:bg-paper-raised")
              }
            >
              Kelas {k.nama}
            </a>
          ))}
        </div>
      )}

      <form action="/api/absensi" method="POST">
        <input type="hidden" name="kelasId" value={kelasAktif.id} />
        <div className="bg-paper-raised border border-rule rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-sunken text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="text-left px-4 py-2.5 font-bold w-10">No</th>
                <th className="text-left px-4 py-2.5 font-bold">Nama Siswa</th>
                <th className="text-left px-4 py-2.5 font-bold">NISN</th>
                <th className="text-left px-4 py-2.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {siswa.map((s, i) => {
                const statusSekarang = absensiMap.get(s.id) ?? "HADIR";
                return (
                  <tr key={s.id} className="border-t border-rule">
                    <td className="px-4 py-2.5 tabnum">{i + 1}</td>
                    <td className="px-4 py-2.5 font-semibold">{s.nama}</td>
                    <td className="px-4 py-2.5 tabnum text-ink-soft">{s.nisn}</td>
                    <td className="px-4 py-2.5">
                      <input type="hidden" name="siswaId" value={s.id} />
                      <div className="inline-flex gap-1">
                        {STATUS_OPTIONS.map((opt) => (
                          <label key={opt.value}>
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              value={opt.value}
                              defaultChecked={statusSekarang === opt.value}
                              className="peer hidden"
                            />
                            <span
                              className={
                                "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold cursor-pointer bg-paper-sunken text-ink-soft " +
                                opt.peerClass
                              }
                            >
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button type="submit">Simpan absensi</Button>
      </form>

      <div className="mt-4">
        <Callout>
          Begitu absensi disimpan, orang tua dari siswa yang Sakit/Izin/Alpa otomatis dianggap
          dapat notifikasi (simulasi — prototype ini belum kirim WhatsApp sungguhan).
        </Callout>
      </div>
    </AppShell>
  );
}
