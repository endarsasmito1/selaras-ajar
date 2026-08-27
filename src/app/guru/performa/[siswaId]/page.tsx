import { getSession } from "@/lib/auth";
import {
  getPerformaSiswa,
  getKelasDiampu,
  getKontakOrtuSiswa,
  getCatatanSiswaVisibleTo,
  getPrestasiSiswa,
  getCatatanAsesmen,
} from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { PerformaSiswaView } from "@/components/PerformaSiswaView";
import { Card } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { ConfirmSubmitLink } from "@/components/ui/ConfirmSubmitButton";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function PerformaMuridGuruPage({
  params,
  searchParams,
}: {
  params: Promise<{ siswaId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { siswaId } = await params;
  const { error } = await searchParams;

  const performa = await getPerformaSiswa(siswaId, session.sekolahId);
  if (!performa) notFound();

  const penugasan = await getKelasDiampu(session.userId);
  const mengajarMuridIni = penugasan.some((p) => p.kelasId === performa.siswa.kelasId);
  const isWaliKelas = performa.siswa.kelas.waliKelasId === session.userId;

  const [wali, catatan, prestasi, asesmen] = mengajarMuridIni
    ? await Promise.all([
        getKontakOrtuSiswa(siswaId),
        getCatatanSiswaVisibleTo(siswaId, { penggunaId: session.userId, peran: session.peran, isWaliKelasSiswa: isWaliKelas }),
        getPrestasiSiswa(siswaId),
        getCatatanAsesmen(siswaId),
      ])
    : [[], [], [], []];

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/performa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Performa Murid"
      pageSubtitle="Halaman ini juga bisa diakses orang tua siswa (versi sama, sumber kebenaran tunggal)"
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <PerformaSiswaView
        performa={performa}
        hrefKehadiran={`/guru/performa/${siswaId}/kehadiran`}
        hrefTugas={`/guru/tugas/kelas/${performa.siswa.kelasId}`}
        hrefUjianList={`/guru/ujian/kelas/${performa.siswa.kelasId}`}
      />

      {mengajarMuridIni && (
        <>
          <Card className="mt-4">
            <h3 className="text-sm font-semibold mb-3">Data & kontak orang tua</h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-ink-soft text-xs block">Tanggal lahir</span>
                {performa.siswa.tanggalLahir ? formatTanggal(performa.siswa.tanggalLahir) : "—"}
              </div>
              <div>
                <span className="text-ink-soft text-xs block">Alamat</span>
                {performa.siswa.alamat || "—"}
              </div>
              {wali.map((w) => (
                <div key={w.id}>
                  <span className="text-ink-soft text-xs block">{w.hubungan} — {w.pengguna.nama}</span>
                  {w.pengguna.telepon || "—"}
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
                <input type="hidden" name="siswaId" value={siswaId} />
                <input type="hidden" name="kembaliKe" value={`/guru/performa/${siswaId}`} />
                <input name="judul" required placeholder="mis. Juara 1 Lomba Cerdas Cermat" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                <input name="tanggal" type="date" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                <textarea name="keterangan" rows={2} placeholder="Keterangan (opsional)" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                <button type="submit" className="text-xs font-semibold text-primary-deep self-start">Simpan</button>
              </form>
            </details>
          </Card>

          <Card className="mt-4">
            <h3 className="text-sm font-semibold mb-3">Riwayat Asesmen Deskriptif (N-5)</h3>
            {asesmen.length === 0 && <p className="text-xs text-ink-soft">Belum ada asesmen deskriptif.</p>}
            <div className="flex flex-col gap-2">
              {asesmen.map((a) => (
                <div key={a.id} className="border-b border-rule last:border-0 pb-2">
                  <span className="text-xs font-semibold">{a.mapel.nama} — {a.guru.nama} <span className="text-ink-soft font-normal">· {formatTanggal(a.createdAt)}</span></span>
                  <p className="text-sm mt-1">{a.isi}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mt-4">
            <h3 className="text-sm font-semibold mb-1">Catatan Guru</h3>
            <p className="text-xs text-ink-soft mb-3">Privat — hanya terlihat wali kelas, kepala sekolah, & orang tua. Murid tidak melihat ini.</p>
            {catatan.length === 0 && <p className="text-xs text-ink-soft mb-3">Belum ada catatan.</p>}
            <div className="flex flex-col gap-2 mb-3">
              {catatan.map((c) => (
                <div key={c.id} className="bg-paper border border-rule rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {c.penulis.nama}{c.mapelKonteks ? ` — ${c.mapelKonteks}` : ""} <span className="text-ink-soft font-normal">· {formatTanggal(c.createdAt)}</span>
                    </span>
                    {c.penggunaId === session.userId && (
                      <form action="/api/siswa/catatan/hapus" method="POST">
                        <input type="hidden" name="catatanId" value={c.id} />
                        <input type="hidden" name="siswaId" value={siswaId} />
                        <ConfirmSubmitLink confirmMessage="Hapus catatan ini?" className="text-[11px] text-danger hover:underline">Hapus</ConfirmSubmitLink>
                      </form>
                    )}
                  </div>
                  <p className="text-sm mt-1">{c.isi}</p>
                </div>
              ))}
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-primary-deep">+ Tambah catatan</summary>
              <form action="/api/siswa/catatan" method="POST" className="flex flex-col gap-2 mt-2">
                <input type="hidden" name="siswaId" value={siswaId} />
                <input name="mapelKonteks" placeholder="Konteks mapel (opsional)" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                <textarea name="isi" required rows={2} placeholder="Tulis observasi tentang murid ini…" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
                <button type="submit" className="text-xs font-semibold text-primary-deep self-start">Simpan catatan</button>
              </form>
            </details>
          </Card>
        </>
      )}
    </AppShell>
  );
}
