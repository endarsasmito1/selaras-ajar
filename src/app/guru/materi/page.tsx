import { getSession } from "@/lib/auth";
import { getKelasDiampu, getMateriKelas } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { formatTanggal } from "@/lib/utils";

const TIPE_ICON: Record<string, string> = { dokumen: "📄", video: "▶", catatan: "✎" };

export default async function MateriPage({
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
  const mapelUntukKelas = penugasan.filter((p) => p.kelas.id === kelasAktif?.id);

  if (!kelasAktif) return null;

  const materi = await getMateriKelas(kelasAktif.id);

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/materi"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Materi Belajar"
      pageSubtitle={`Kelas ${kelasAktif.nama}`}
    >
      {kelasUnik.length > 1 && (
        <div className="flex gap-2 mb-5">
          {kelasUnik.map((k) => (
            <a
              key={k.id}
              href={`/guru/materi?kelas=${k.id}`}
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

      <form
        action="/api/materi"
        method="POST"
        className="bg-paper-raised border border-rule rounded-xl p-5 mb-6"
      >
        <input type="hidden" name="kelasId" value={kelasAktif.id} />
        <h3 className="text-base font-semibold mb-3">+ Tambah materi</h3>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Mata pelajaran</label>
            <select name="mapelId" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              {mapelUntukKelas.map((p) => (
                <option key={p.mapel.id} value={p.mapel.id}>
                  {p.mapel.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tipe</label>
            <select name="tipe" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              <option value="dokumen">Dokumen</option>
              <option value="video">Video (tautan)</option>
              <option value="catatan">Catatan teks</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mb-3">
          <label className="text-xs font-semibold">Judul</label>
          <input name="judul" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. Rangkuman Bilangan Bulat" />
        </div>
        <div className="flex flex-col gap-1.5 mb-3">
          <label className="text-xs font-semibold">Bab (opsional)</label>
          <input name="bab" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. Bab 1 - Bilangan Bulat" />
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Isi / tautan</label>
          <textarea name="isi" required rows={2} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="Tempel tautan video, atau tulis catatan" />
        </div>
        <Button type="submit" size="sm">Tambah materi</Button>
      </form>

      <div className="flex flex-col gap-2.5">
        {materi.length === 0 && <p className="text-sm text-ink-soft">Belum ada materi.</p>}
        {materi.map((m) => (
          <div key={m.id} className="flex items-center gap-3.5 bg-paper-raised border border-rule rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-primary-tint text-primary-deep flex items-center justify-center text-base shrink-0">
              {TIPE_ICON[m.tipe] ?? "📄"}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{m.judul}</div>
              <div className="text-xs text-ink-soft">
                {m.mapel.nama}{m.bab ? ` · ${m.bab}` : ""}
              </div>
            </div>
            <div className="text-xs text-ink-soft text-right">{formatTanggal(m.createdAt)}</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
