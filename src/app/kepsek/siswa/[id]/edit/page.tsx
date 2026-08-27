import { getSession } from "@/lib/auth";
import { getSemuaKelas } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { notFound } from "next/navigation";

export default async function EditSiswaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const { error } = await searchParams;

  const [siswa, kelas] = await Promise.all([
    prisma.siswa.findFirst({ where: { id, sekolahId: session.sekolahId }, include: { wali: { include: { pengguna: true } } } }),
    getSemuaKelas(session.sekolahId),
  ]);
  if (!siswa) notFound();

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/siswa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Edit — ${siswa.nama}`}
      pageSubtitle="Data ini bisa diedit kapan saja, termasuk hasil impor CSV"
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <Callout>NISN <b>{siswa.nisn}</b> tidak bisa diubah — dipakai sebagai kunci unik saat impor ulang.</Callout>

      <form action="/api/siswa/update" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-md mt-4">
        <input type="hidden" name="siswaId" value={siswa.id} />
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Nama lengkap</label>
          <input name="nama" defaultValue={siswa.nama} required className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Kelas</label>
            <select name="kelasId" defaultValue={siswa.kelasId} className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
              {kelas.map((k) => (<option key={k.id} value={k.id}>{k.nama}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Jenis kelamin</label>
            <select name="jenisKelamin" defaultValue={siswa.jenisKelamin} className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tanggal lahir</label>
            <input
              type="date"
              name="tanggalLahir"
              defaultValue={siswa.tanggalLahir ? siswa.tanggalLahir.toISOString().slice(0, 10) : ""}
              className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Alamat</label>
            <input name="alamat" defaultValue={siswa.alamat ?? ""} className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2.5 text-sm mb-5">
          <input type="checkbox" name="aktif" defaultChecked={siswa.aktif} />
          Siswa aktif
        </label>
        {siswa.wali[0] && (
          <p className="text-xs text-ink-soft mb-4">Wali: {siswa.wali[0].pengguna.nama} ({siswa.wali[0].hubungan})</p>
        )}
        <Button type="submit">Simpan perubahan</Button>
      </form>
    </AppShell>
  );
}
