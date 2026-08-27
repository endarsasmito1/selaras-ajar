import { getSession } from "@/lib/auth";
import { getKelasDiampu, getMateriKelas, getKomentar, getBabMapel, getSemuaMapel } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { DiskusiPanel } from "@/components/DiskusiPanel";
import { formatTanggal } from "@/lib/utils";
import { toEmbedVideo } from "@/lib/video-embed";

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
  const mapelUnikUntukKelas = Array.from(new Map(mapelUntukKelas.map((p) => [p.mapel.id, p.mapel])).values());
  const [babPerMapelList, semuaMapelDenganSilabus] = await Promise.all([
    Promise.all(mapelUnikUntukKelas.map((m) => getBabMapel(session.sekolahId, m.id))),
    getSemuaMapel(session.sekolahId),
  ]);
  const babPerMapel: Record<string, { id: string; nama: string }[]> = Object.fromEntries(
    mapelUnikUntukKelas.map((m, i) => [m.id, babPerMapelList[i].map((b) => ({ id: b.id, nama: b.nama }))])
  );
  const silabusPerMapel: Record<string, string | null> = Object.fromEntries(
    semuaMapelDenganSilabus.map((m) => [m.id, m.silabusUrl])
  );
  const defaultMapelId = mapelUntukKelas[0]?.mapel.id ?? "";
  const babDefault = babPerMapel[defaultMapelId] ?? [];
  const silabusDefault = silabusPerMapel[defaultMapelId] ?? null;

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
        <div className="flex flex-wrap gap-2 mb-5">
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
        encType="multipart/form-data"
        className="bg-paper-raised border border-rule rounded-xl p-5 mb-6"
      >
        <input type="hidden" name="kelasId" value={kelasAktif.id} />
        <h3 className="text-base font-semibold mb-3">+ Tambah materi</h3>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Mata pelajaran</label>
            <select name="mapelId" id="materi-mapel-select" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              {mapelUntukKelas.map((p) => (
                <option key={p.mapel.id} value={p.mapel.id}>
                  {p.mapel.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Tipe</label>
            <select name="tipe" id="tipe-materi" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              <option value="dokumen">Dokumen (unggah berkas)</option>
              <option value="video">Video</option>
              <option value="catatan">Catatan teks</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mb-3">
          <label className="text-xs font-semibold">Judul</label>
          <input name="judul" required className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. Rangkuman Bilangan Bulat" />
        </div>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Bab</label>
            <select name="babId" id="bab-select" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
              <option value="">— Tanpa bab —</option>
              {babDefault.map((b) => (
                <option key={b.id} value={b.id}>{b.nama}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Atau tambah bab baru (opsional)</label>
            <input name="babBaru" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="mis. Bab 1 - Bilangan Bulat" />
          </div>
        </div>

        <div id="video-sumber-field" className="flex flex-col gap-1.5 mb-3" style={{ display: "none" }}>
          <label className="text-xs font-semibold">Sumber video</label>
          <div className="flex gap-4">
            <label className="text-xs flex items-center gap-1.5">
              <input type="radio" name="sumberVideo" value="tautan" defaultChecked className="video-sumber-radio" /> Tautan (YouTube/Vimeo)
            </label>
            <label className="text-xs flex items-center gap-1.5">
              <input type="radio" name="sumberVideo" value="file" className="video-sumber-radio" /> Unggah berkas video
            </label>
          </div>
        </div>

        <div id="materi-file-field" className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-semibold">Berkas</label>
          <input type="file" name="file" className="text-sm" />
        </div>
        <div id="materi-isi-field" className="flex flex-col gap-1.5 mb-4" style={{ display: "none" }}>
          <label className="text-xs font-semibold">Tautan / catatan</label>
          <textarea name="isi" rows={2} className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" placeholder="Tempel tautan video (YouTube/Vimeo), atau tulis catatan" />
        </div>

        <div id="silabus-field" className="flex flex-col gap-1.5 mb-4 bg-paper border border-rule rounded-lg p-3">
          <label className="text-xs font-semibold">Silabus mapel ini</label>
          <p id="silabus-belum-ada" className="text-xs text-ink-soft mb-1.5" style={{ display: silabusDefault ? "none" : "block" }}>
            Belum ada silabus untuk mapel ini — opsional, sekali upload dipakai bareng semua bab &amp; materi mapel ini.
          </p>
          <div id="silabus-sudah-ada" style={{ display: silabusDefault ? "block" : "none" }}>
            <a href={silabusDefault ?? "#"} id="silabus-link" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-deep font-semibold hover:underline">📎 Lihat silabus tersimpan</a>
            <p className="text-xs text-ink-soft mt-1">Upload berkas baru di sini kalau mau mengganti.</p>
          </div>
          <input type="file" name="silabusFile" accept=".pdf,.doc,.docx" className="text-sm" />
        </div>

        <Button type="submit" size="sm">Tambah materi</Button>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            var BAB_PER_MAPEL = ${JSON.stringify(babPerMapel)};
            var SILABUS_PER_MAPEL = ${JSON.stringify(silabusPerMapel)};
            function updateBabOptions(){
              var mapelId = document.getElementById('materi-mapel-select').value;
              var select = document.getElementById('bab-select');
              var babList = BAB_PER_MAPEL[mapelId] || [];
              select.innerHTML = '<option value="">— Tanpa bab —</option>' +
                babList.map(function(b){ return '<option value="' + b.id + '">' + b.nama + '</option>'; }).join('');
            }
            function updateSilabusField(){
              var mapelId = document.getElementById('materi-mapel-select').value;
              var url = SILABUS_PER_MAPEL[mapelId];
              var ada = document.getElementById('silabus-sudah-ada');
              var belum = document.getElementById('silabus-belum-ada');
              if (url) {
                ada.style.display = 'block';
                belum.style.display = 'none';
                document.getElementById('silabus-link').setAttribute('href', url);
              } else {
                ada.style.display = 'none';
                belum.style.display = 'block';
              }
            }
            document.getElementById('materi-mapel-select')?.addEventListener('change', function(){
              updateBabOptions();
              updateSilabusField();
            });

            function updateVideoSumber(){
              var tipe = document.getElementById('tipe-materi').value;
              var checked = document.querySelector('.video-sumber-radio:checked');
              var sumber = checked ? checked.value : 'tautan';
              var isDokumen = tipe === 'dokumen';
              var isVideoFile = tipe === 'video' && sumber === 'file';
              var isVideoTautan = tipe === 'video' && sumber === 'tautan';
              var isCatatan = tipe === 'catatan';
              document.getElementById('video-sumber-field').style.display = tipe === 'video' ? 'flex' : 'none';
              document.getElementById('materi-file-field').style.display = (isDokumen || isVideoFile) ? 'flex' : 'none';
              document.getElementById('materi-isi-field').style.display = (isVideoTautan || isCatatan) ? 'flex' : 'none';
            }
            document.getElementById('tipe-materi')?.addEventListener('change', updateVideoSumber);
            document.querySelectorAll('.video-sumber-radio').forEach(function(r){ r.addEventListener('change', updateVideoSumber); });
            // Sengaja TIDAK dipanggil eager di sini (beda dari pola script lain di app ini) — JSX
            // di atas sudah render state default yang benar (tipe=dokumen, sumberVideo=tautan,
            // bab utk mapel pertama, blok silabus sesuai mapel pertama); manggil fungsi ini saat
            // load duluan sebelum React sempat hydrate bikin mismatch (DOM kemutasi sebelum
            // React bandingin sama hasil render server-nya).
          `,
        }}
      />

      <div className="flex flex-col gap-2.5">
        {materi.length === 0 && <p className="text-sm text-ink-soft">Belum ada materi.</p>}
        {materi.map((m) => (
          <MateriRow key={m.id} materi={m} penggunaId={session.userId} />
        ))}
      </div>
    </AppShell>
  );
}

async function MateriRow({
  materi: m,
  penggunaId,
}: {
  materi: Awaited<ReturnType<typeof getMateriKelas>>[number];
  penggunaId: string;
}) {
  const komentar = await getKomentar({ materiId: m.id });
  return (
    <details className="bg-paper-raised border border-rule rounded-xl px-4 py-3">
      <summary className="flex items-center gap-3.5 cursor-pointer list-none">
        <div className="w-9 h-9 rounded-lg bg-primary-tint text-primary-deep flex items-center justify-center text-base shrink-0">
          {TIPE_ICON[m.tipe] ?? "📄"}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{m.judul}</div>
          <div className="text-xs text-ink-soft">{m.mapel.nama}{m.bab ? ` · ${m.bab.nama}` : ""}</div>
        </div>
        <div className="text-xs text-ink-soft text-right">{formatTanggal(m.createdAt)}{komentar.length > 0 ? ` · ${komentar.length} komentar` : ""}</div>
      </summary>
      <div className="mt-3 pt-3 border-t border-rule">
        {m.tipe === "dokumen" ? (
          <a href={m.isi} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-deep font-semibold hover:underline mb-3 inline-block">📎 Unduh berkas</a>
        ) : m.tipe === "video" ? (
          <VideoPreview url={m.isi} />
        ) : (
          <p className="text-sm mb-3">{m.isi}</p>
        )}
        <DiskusiPanel komentar={komentar} targetType="materi" targetId={m.id} canModerate={m.penggunaId === penggunaId} />
      </div>
    </details>
  );
}

/** 1.23 — guru bisa preview video yang diupload/ditautkan langsung di halaman materi, bukan cuma link. */
function VideoPreview({ url }: { url: string }) {
  const embed = toEmbedVideo(url);
  if (embed.tipe === "file") {
    return <video src={embed.url} controls className="w-full max-w-md rounded-lg mb-3" />;
  }
  if (embed.tipe === "youtube" || embed.tipe === "vimeo") {
    return (
      <iframe
        src={embed.url}
        className="w-full max-w-md aspect-video rounded-lg mb-3"
        allowFullScreen
        frameBorder="0"
      />
    );
  }
  return (
    <a href={embed.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-deep font-semibold hover:underline mb-3 inline-block">▶ Buka video</a>
  );
}
