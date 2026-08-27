import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { Callout } from "@/components/ui/Callout";
import { notFound } from "next/navigation";

function bumpNamaKelas(nama: string, tingkatBaru: number) {
  return nama.replace(/^\d+/, String(tingkatBaru));
}

export default async function TinjauKenaikanKelasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tahunBaruId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { tahunBaruId } = await params;
  const { error } = await searchParams;

  const tahunBaru = await prisma.tahunAjaran.findFirst({ where: { id: tahunBaruId, sekolahId: session.sekolahId, aktif: false } });
  if (!tahunBaru) notFound();
  const tahunLama = await prisma.tahunAjaran.findFirst({ where: { sekolahId: session.sekolahId, aktif: true } });
  if (!tahunLama) notFound();

  const [kelasLama, kelasTujuanSemua] = await Promise.all([
    prisma.kelas.findMany({
      where: { tahunAjaranId: tahunLama.id },
      include: { siswa: { where: { aktif: true }, orderBy: { nama: "asc" } } },
      orderBy: [{ tingkat: "asc" }, { nama: "asc" }],
    }),
    prisma.kelas.findMany({ where: { tahunAjaranId: tahunBaruId }, orderBy: [{ tingkat: "asc" }, { nama: "asc" }] }),
  ]);

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/tahun-ajaran"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Tinjau Kenaikan Kelas — ${tahunLama.label} → ${tahunBaru.label}`}
      pageSubtitle="Langkah 2/2 — cek/ubah rombel tujuan tiap siswa sebelum dijalankan. Belum ada yang berubah di data sampai kamu klik tombol di bawah."
      headerAction={<LinkButton href="/kepsek/tahun-ajaran" variant="ghost" size="sm">Batalkan</LinkButton>}
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}

      {/* Form kecil "tambah rombel" dirender terpisah (bukan nested) dari form besar "Jalankan
          Kenaikan Kelas" di bawah — <form> di dalam <form> tak valid HTML. Input/tombolnya di
          kartu kelas terhubung ke sini lewat atribut form="..." (HTML5), jadi tetap terlihat
          menyatu secara visual dengan kartu kelasnya masing-masing. */}
      {kelasLama.map((k) => (
        <form key={k.id} id={`tambah-kelas-${k.id}`} action="/api/tahun-ajaran/kenaikan-kelas/tambah-kelas" method="POST" className="hidden">
          <input type="hidden" name="tahunBaruId" value={tahunBaru.id} />
        </form>
      ))}

      <form action="/api/tahun-ajaran/kenaikan-kelas/jalankan" method="POST" className="flex flex-col gap-4">
        <input type="hidden" name="tahunBaruId" value={tahunBaru.id} />

        {kelasLama.map((k) => {
          const defaultTarget = kelasTujuanSemua.find((kt) => kt.nama === bumpNamaKelas(k.nama, k.tingkat + 1));
          return (
            <div key={k.id} className="bg-paper-raised border border-rule rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold">
                  Kelas {k.nama} <span className="text-ink-soft font-normal">({k.siswa.length} siswa)</span>
                </h3>
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Tambah rombel tujuan lain (pecah kelas ini)</summary>
                  <div className="mt-2 flex items-center gap-2">
                    <input form={`tambah-kelas-${k.id}`} name="nama" required placeholder={`mis. ${bumpNamaKelas(k.nama, k.tingkat + 1)}C`} className="bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs w-32" />
                    <input form={`tambah-kelas-${k.id}`} type="number" name="tingkat" defaultValue={k.tingkat + 1} className="bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs w-16" />
                    <Button form={`tambah-kelas-${k.id}`} type="submit" size="sm" variant="ghost">Tambah</Button>
                  </div>
                </details>
              </div>

              <div className="flex flex-col gap-1.5">
                {k.siswa.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-1.5">
                    <span>{s.nama}</span>
                    <select
                      name={`target_${s.id}`}
                      defaultValue={defaultTarget?.id ?? "LULUS"}
                      className="bg-paper border border-rule rounded-lg px-2.5 py-1.5 text-xs w-48"
                    >
                      {kelasTujuanSemua.map((kt) => (
                        <option key={kt.id} value={kt.id}>→ Kelas {kt.nama} (tingkat {kt.tingkat})</option>
                      ))}
                      <option value="LULUS">🎓 Lulus</option>
                      <option value="PINDAH">↪ Pindah sekolah</option>
                    </select>
                  </div>
                ))}
                {k.siswa.length === 0 && <p className="text-xs text-ink-soft">Tidak ada siswa aktif di kelas ini.</p>}
              </div>
            </div>
          );
        })}

        <div className="bg-paper-raised border border-rule rounded-xl p-4">
          <label className="text-xs font-semibold block mb-1.5">Keterangan untuk siswa yang ditandai &quot;Pindah sekolah&quot; (opsional, berlaku untuk semua)</label>
          <textarea name="keteranganPindah" rows={2} placeholder="mis. Pindah mengikuti orang tua" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm w-full" />
        </div>

        <ConfirmSubmitButton className="self-start" confirmMessage={`Jalankan kenaikan kelas dari ${tahunLama.label} ke ${tahunBaru.label}? Semua siswa akan dipindahkan ke rombel tujuan sesuai pilihan di atas — tindakan ini tidak bisa dibatalkan begitu saja.`}>
          ✓ Jalankan Kenaikan Kelas
        </ConfirmSubmitButton>
      </form>
    </AppShell>
  );
}
