import { getSession } from "@/lib/auth";
import { getProfilSiswa360, getCatatanSiswaVisibleTo } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { PerformaSiswaView } from "@/components/PerformaSiswaView";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { formatTanggal, formatRupiah } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function ProfilSiswa360Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; wali_dibuat?: string; email?: string; password?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;
  const { error } = sp;

  const profil = await getProfilSiswa360(id, session.sekolahId);
  if (!profil) notFound();
  const { siswa, wali, performa, tagihan, prestasi } = profil;
  if (!performa) return null;

  const catatan = await getCatatanSiswaVisibleTo(id, {
    penggunaId: session.userId,
    peran: session.peran,
    isWaliKelasSiswa: false,
  });

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/siswa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle={`Profil Siswa — ${siswa.nama}`}
      pageSubtitle="Profil 360°: pembelajaran, keuangan, dan prestasi dalam satu halaman (F-15)"
      headerAction={
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/kepsek/siswa/${id}/edit`} variant="ghost" size="sm">Edit data</LinkButton>
          <LinkButton href={`/kepsek/siswa/${id}/buku-induk`} size="sm">Cetak Buku Induk</LinkButton>
        </div>
      }
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      {sp.wali_dibuat && (
        <div className="mb-4">
          <Callout>
            ✓ Akun wali dibuat — email <code>{sp.email}</code>, password sementara <code>{sp.password}</code>. Simpan sekarang, tak ditampilkan lagi setelah halaman ini di-refresh.
          </Callout>
        </div>
      )}
      <a href={`/kepsek/siswa/kelas/${siswa.kelasId}`} className="text-xs font-semibold text-primary-deep hover:underline mb-4 inline-block">
        ← Kelas {siswa.kelas.nama}
      </a>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-3">Data dasar & kontak orang tua</h3>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div><span className="text-ink-soft text-xs block">NISN</span>{siswa.nisn}</div>
          <div><span className="text-ink-soft text-xs block">Jenis kelamin</span>{siswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</div>
          <div><span className="text-ink-soft text-xs block">Tanggal lahir</span>{siswa.tanggalLahir ? formatTanggal(siswa.tanggalLahir) : "—"}</div>
          <div className="md:col-span-3"><span className="text-ink-soft text-xs block">Alamat</span>{siswa.alamat || "—"}</div>
          {wali.map((w) => (
            <div key={w.id}>
              <span className="text-ink-soft text-xs block">{w.hubungan} — {w.pengguna.nama}</span>
              {w.pengguna.telepon || "—"}
            </div>
          ))}
        </div>
        {wali.length === 0 && (
          <div className="mt-3">
            <Callout tone="warn">Belum ada wali terdaftar untuk siswa ini.</Callout>
            <details className="mt-2.5">
              <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Tambah wali</summary>
              <form action="/api/siswa/tambah-wali" method="POST" className="mt-2.5 flex flex-col gap-2.5 max-w-md">
                <input type="hidden" name="siswaId" value={id} />
                <div className="grid grid-cols-2 gap-2.5">
                  <input name="nama" required placeholder="Nama lengkap" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm col-span-2" />
                  <select name="hubungan" defaultValue="Ayah" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                    <option value="Ayah">Ayah</option>
                    <option value="Ibu">Ibu</option>
                    <option value="Wali">Wali</option>
                  </select>
                  <input name="telepon" placeholder="No. HP (opsional)" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                  <select name="jenisKelamin" defaultValue="" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
                    <option value="">Jenis kelamin (opsional)</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                  <input name="email" type="email" required placeholder="Email" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm col-span-2" />
                </div>
                <p className="text-xs text-ink-soft">Akun baru dapat password sementara — tampil sekali setelah disimpan.</p>
                <Button type="submit" size="sm" className="self-start">Simpan wali</Button>
              </form>
            </details>
          </div>
        )}
      </Card>

      <PerformaSiswaView
        performa={performa}
        basePath="/guru/ujian"
        hrefKehadiran={`/kepsek/siswa/${id}/kehadiran`}
      />

      <Card className="mt-4">
        <h3 className="text-sm font-semibold mb-3">Riwayat pembayaran SPP</h3>
        {tagihan.length === 0 && <p className="text-xs text-ink-soft">Belum ada tagihan.</p>}
        <div className="flex flex-col gap-1.5">
          {tagihan.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm border-b border-rule last:border-0 py-1.5">
              <span>{t.tipe.nama} — {t.periode}</span>
              <div className="flex items-center gap-2">
                <span className="tabnum">{formatRupiah(t.nominal)}</span>
                <Pill tone={t.status === "LUNAS" ? "ok" : t.status === "CICILAN" ? "info" : "warn"}>{t.status}</Pill>
                {t.dibayarPada && <span className="text-xs text-ink-soft">{formatTanggal(t.dibayarPada)}</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h3 className="text-sm font-semibold mb-3">Prestasi & Penghargaan</h3>
        {prestasi.length === 0 && <p className="text-xs text-ink-soft mb-3">Belum ada catatan prestasi.</p>}
        <div className="flex flex-col gap-2 mb-3">
          {prestasi.map((p) => (
            <div key={p.id} className="border-b border-rule last:border-0 pb-2">
              <div className="text-sm font-semibold">{p.judul}</div>
              <div className="text-xs text-ink-soft">{formatTanggal(p.tanggal)} · dicatat {p.dicatatOleh.nama}</div>
              {p.keterangan && <p className="text-xs mt-1">{p.keterangan}</p>}
            </div>
          ))}
        </div>
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Tambah prestasi</summary>
          <form action="/api/siswa/prestasi" method="POST" className="flex flex-col gap-2 mt-2">
            <input type="hidden" name="siswaId" value={id} />
            <input type="hidden" name="kembaliKe" value={`/kepsek/siswa/${id}`} />
            <input name="judul" required placeholder="mis. Juara 1 Lomba Cerdas Cermat" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            <input name="tanggal" type="date" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            <textarea name="keterangan" rows={2} placeholder="Keterangan (opsional)" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
            <button type="submit" className="text-xs font-semibold text-primary-deep self-start">Simpan</button>
          </form>
        </details>
      </Card>

      <Card className="mt-4">
        <h3 className="text-sm font-semibold mb-1">Catatan Guru</h3>
        <p className="text-xs text-ink-soft mb-3">Ditulis guru, privat ke ortu & kepsek — murid tidak melihat ini.</p>
        {catatan.length === 0 && <p className="text-xs text-ink-soft">Belum ada catatan.</p>}
        <div className="flex flex-col gap-2">
          {catatan.map((c) => (
            <div key={c.id} className="bg-paper border border-rule rounded-lg p-3">
              <span className="text-xs font-semibold">
                {c.penulis.nama}{c.mapelKonteks ? ` — ${c.mapelKonteks}` : ""} <span className="text-ink-soft font-normal">· {formatTanggal(c.createdAt)}</span>
              </span>
              <p className="text-sm mt-1">{c.isi}</p>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
