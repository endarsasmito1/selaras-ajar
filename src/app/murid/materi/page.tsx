import { getSession } from "@/lib/auth";
import { getSiswaByAkun, getMateriKelas, getKomentar } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_MURID, ROLE_LABEL } from "@/lib/nav";
import { DiskusiPanel } from "@/components/DiskusiPanel";
import { formatTanggal } from "@/lib/utils";
import { toEmbedVideo } from "@/lib/video-embed";

const TIPE_ICON: Record<string, string> = { dokumen: "📄", video: "▶", catatan: "✎" };

export default async function MateriMuridPage() {
  const session = await getSession();
  if (!session) return null;

  const siswa = await getSiswaByAkun(session.userId);
  if (!siswa) return null;

  const materi = await getMateriKelas(siswa.kelasId);
  const perMapel = new Map<string, { nama: string; items: typeof materi }>();
  for (const m of materi) {
    const cur = perMapel.get(m.mapelId) ?? { nama: m.mapel.nama, items: [] };
    cur.items.push(m);
    perMapel.set(m.mapelId, cur);
  }

  return (
    <AppShell
      groups={NAV_MURID}
      activeHref="/murid/materi"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Materi Belajar"
      pageSubtitle={`Kelas ${siswa.kelas.nama} (MT-3)`}
    >
      <div className="flex flex-col gap-3">
        {Array.from(perMapel.values()).map((grup) => (
          <details key={grup.nama} className="bg-paper-raised border border-rule rounded-xl px-4 py-3.5">
            <summary className="cursor-pointer font-semibold text-sm">{grup.nama} ({grup.items.length})</summary>
            <div className="flex flex-col gap-2 mt-3">
              {grup.items.map((m) => (
                <MateriRow key={m.id} materi={m} />
              ))}
            </div>
          </details>
        ))}
        {perMapel.size === 0 && <p className="text-sm text-ink-soft">Belum ada materi untuk kelasmu.</p>}
      </div>
    </AppShell>
  );
}

async function MateriRow({ materi: m }: { materi: Awaited<ReturnType<typeof getMateriKelas>>[number] }) {
  const komentar = await getKomentar({ materiId: m.id });
  return (
    <details className="bg-paper border border-rule rounded-lg px-3.5 py-3">
      <summary className="flex items-center gap-3 cursor-pointer list-none">
        <span className="text-base">{TIPE_ICON[m.tipe] ?? "📄"}</span>
        <div className="flex-1">
          <div className="font-semibold text-sm">{m.judul}</div>
          {m.bab && <div className="text-xs text-ink-soft">{m.bab.nama}</div>}
        </div>
        <div className="text-xs text-ink-soft">{formatTanggal(m.createdAt)}</div>
      </summary>
      <div className="mt-3 pt-3 border-t border-rule">
        {m.tipe === "dokumen" ? (
          <a href={m.isi} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-deep font-semibold hover:underline mb-3 inline-block">📎 Unduh berkas</a>
        ) : m.tipe === "video" ? (
          <VideoPreview url={m.isi} />
        ) : (
          <p className="text-sm mb-3">{m.isi}</p>
        )}
        <DiskusiPanel komentar={komentar} targetType="materi" targetId={m.id} canModerate={false} />
      </div>
    </details>
  );
}

function VideoPreview({ url }: { url: string }) {
  const embed = toEmbedVideo(url);
  if (embed.tipe === "file") {
    return <video src={embed.url} controls className="w-full max-w-md rounded-lg mb-3" />;
  }
  if (embed.tipe === "youtube" || embed.tipe === "vimeo") {
    return <iframe src={embed.url} className="w-full max-w-md aspect-video rounded-lg mb-3" allowFullScreen frameBorder="0" />;
  }
  return (
    <a href={embed.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-deep font-semibold hover:underline mb-3 inline-block">▶ Buka video</a>
  );
}
