import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSemuaKelas, getSemuaMapel, getTahunAjaranAktif } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { notFound } from "next/navigation";

export default async function EditGuruPage({
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

  const tahunAktif = await getTahunAjaranAktif(session.sekolahId);
  const guru = await prisma.pengguna.findFirst({
    where: { id, sekolahId: session.sekolahId },
    include: {
      guruProfil: {
        include: {
          penugasan: {
            where: tahunAktif ? { kelas: { tahunAjaranId: tahunAktif.id } } : undefined,
            include: { kelas: true, mapel: true },
          },
        },
      },
    },
  });
  if (!guru || guru.peran !== "GURU") notFound();
  const mapelDiampuSaatIni: string[] = guru.guruProfil?.mapelDiampu ? JSON.parse(guru.guruProfil.mapelDiampu) : [];

  const [kelasList, mapelList, waliKelasDari, peranTambahan] = await Promise.all([
    getSemuaKelas(session.sekolahId),
    getSemuaMapel(session.sekolahId),
    prisma.kelas.findFirst({ where: { sekolahId: session.sekolahId, waliKelasId: guru.id, ...(tahunAktif ? { tahunAjaranId: tahunAktif.id } : {}) } }),
    prisma.penggunaPeran.findMany({ where: { penggunaId: guru.id } }),
  ]);
  const OPSI_PERAN_TAMBAHAN = ["TU", "BENDAHARA"] as const;
  const opsiPeranBisaDitambah = OPSI_PERAN_TAMBAHAN.filter((p) => !peranTambahan.some((pt) => pt.peran === p));

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/guru"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Edit — ${guru.nama}`}
      pageSubtitle="MG-1 — kepsek bisa mengubah data guru kapan saja, bukan cuma saat input awal"
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <form action="/api/guru/update" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-md">
        <input type="hidden" name="penggunaId" value={guru.id} />
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Nama lengkap</label>
          <input name="nama" defaultValue={guru.nama} required className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">No. HP</label>
          <input name="telepon" defaultValue={guru.telepon ?? ""} className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">NIP/NUPTK</label>
          <input name="nip" defaultValue={guru.guruProfil?.nip ?? ""} className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Jenis kelamin</label>
          <select name="jenisKelamin" defaultValue={guru.jenisKelamin ?? ""} className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm">
            <option value="">— Belum diisi —</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Mapel yang diampu (bisa pilih lebih dari satu)</label>
          <select
            name="mapelDiampu"
            multiple
            size={Math.min(6, Math.max(3, mapelList.length))}
            defaultValue={mapelDiampuSaatIni}
            className="bg-paper border border-rule rounded-lg px-3 py-2.5 text-sm"
          >
            {mapelList.map((m) => (
              <option key={m.id} value={m.nama}>{m.nama}</option>
            ))}
          </select>
          <p className="text-[11px] text-ink-soft">Label kompetensi guru — bukan penugasan konkret (atur penugasan riil di bagian bawah).</p>
        </div>
        <label className="flex items-center gap-2.5 text-sm mb-5">
          <input type="checkbox" name="aktif" defaultChecked={guru.aktif} />
          Akun aktif
        </label>
        <Button type="submit">Simpan perubahan</Button>
      </form>

      <div className="bg-paper-raised border border-rule rounded-xl p-6 max-w-md mt-5">
        <h3 className="text-sm font-semibold mb-1">Wali kelas</h3>
        <p className="text-xs text-ink-soft mb-3">MG-1 (1.6) — atur langsung dari sini, tanpa pindah halaman.</p>
        <form action="/api/guru/wali-kelas" method="POST" className="flex items-center gap-2">
          <input type="hidden" name="penggunaId" value={guru.id} />
          <select name="kelasId" defaultValue={waliKelasDari?.id ?? ""} className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
            <option value="">— Bukan wali kelas —</option>
            {kelasList
              .filter((k) => !k.waliKelasId || k.waliKelasId === guru.id)
              .map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
          </select>
          <Button type="submit" size="sm">Simpan</Button>
        </form>
        <p className="text-[11px] text-ink-soft mt-2">Kelas yang sudah punya wali lain tak ditampilkan di sini (1.8) — satu kelas cuma boleh punya satu wali.</p>
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl p-6 max-w-md mt-5">
        <h3 className="text-sm font-semibold mb-1">Penugasan mengajar</h3>
        <p className="text-xs text-ink-soft mb-3">MG-2 (1.6) — kelas + mapel yang diampu guru ini.</p>
        <div className="flex flex-col gap-2 mb-4">
          {guru.guruProfil?.penugasan.map((p) => (
            <form key={p.id} action="/api/penugasan-guru/hapus" method="POST" className="flex items-center justify-between text-sm border-b border-rule last:border-0 pb-2">
              <input type="hidden" name="penugasanId" value={p.id} />
              <span>{p.kelas.nama} — {p.mapel.nama}</span>
              <ConfirmSubmitLink confirmMessage={`Hapus penugasan mengajar ${p.mapel.nama} di kelas ${p.kelas.nama}?`} className="text-xs text-danger hover:underline">Hapus</ConfirmSubmitLink>
            </form>
          ))}
          {(!guru.guruProfil || guru.guruProfil.penugasan.length === 0) && (
            <p className="text-xs text-ink-soft">Belum ada penugasan.</p>
          )}
        </div>
        <form action="/api/penugasan-guru" method="POST" className="flex items-center gap-2">
          <input type="hidden" name="penggunaId" value={guru.id} />
          <select name="kelasId" required className="flex-1 bg-paper border border-rule rounded-lg px-2.5 py-2 text-sm">
            <option value="">Kelas…</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
          <select name="mapelId" required className="flex-1 bg-paper border border-rule rounded-lg px-2.5 py-2 text-sm">
            <option value="">Mapel…</option>
            {mapelList.map((m) => (
              <option key={m.id} value={m.id}>{m.nama}</option>
            ))}
          </select>
          <Button type="submit" size="sm">+ Tambah</Button>
        </form>
      </div>

      <div className="bg-paper-raised border border-rule rounded-xl p-6 max-w-md mt-5">
        <h3 className="text-sm font-semibold mb-1">Peran tambahan (multi-role)</h3>
        <p className="text-xs text-ink-soft mb-3">1.20 — akun ini bisa merangkap peran lain (mis. Guru sekaligus TU). Saat login, akun bisa pindah peran lewat tombol di menu akun.</p>
        <div className="flex flex-col gap-2 mb-4">
          {peranTambahan.map((p) => (
            <form key={p.id} action="/api/guru/hapus-peran" method="POST" className="flex items-center justify-between text-sm border-b border-rule last:border-0 pb-2">
              <input type="hidden" name="penggunaPeranId" value={p.id} />
              <span>{ROLE_LABEL[p.peran] ?? p.peran}</span>
              <ConfirmSubmitLink confirmMessage={`Cabut peran ${ROLE_LABEL[p.peran] ?? p.peran} dari ${guru.nama}?`} className="text-xs text-danger hover:underline">Cabut</ConfirmSubmitLink>
            </form>
          ))}
          {peranTambahan.length === 0 && (
            <p className="text-xs text-ink-soft">Belum ada peran tambahan — akun ini cuma bisa masuk sebagai Guru.</p>
          )}
        </div>
        {opsiPeranBisaDitambah.length > 0 ? (
          <form action="/api/guru/tambah-peran" method="POST" className="flex items-center gap-2">
            <input type="hidden" name="penggunaId" value={guru.id} />
            <select name="peran" required className="flex-1 bg-paper border border-rule rounded-lg px-2.5 py-2 text-sm">
              <option value="">Peran…</option>
              {opsiPeranBisaDitambah.map((p) => (
                <option key={p} value={p}>{ROLE_LABEL[p]}</option>
              ))}
            </select>
            <Button type="submit" size="sm">+ Tambah peran</Button>
          </form>
        ) : (
          <p className="text-[11px] text-ink-soft">Semua opsi peran tambahan sudah diberikan.</p>
        )}
      </div>
    </AppShell>
  );
}
