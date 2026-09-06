import { getPengumumanTerbaru } from "@/lib/data";
import { formatTanggal } from "@/lib/utils";

/**
 * Widget "Pengumuman terbaru" (1.20) — dipakai di dashboard guru/murid/ortu/TU/kepsek.
 *
 * Padanan `SA.pengumumanBanner()` di prototipe (assets/app.js: "Banner pengumuman gradient
 * (carousel horizontal) — pengganti callout polos di dashboard") — sebelumnya di sini dirender
 * sbg <Card> polos standar (list vertikal, border netral), yang justru persis gaya "callout polos"
 * yang menurut komentar aslinya SUDAH SENGAJA diganti. Warna #e6d3a4/#5a4321/#7a6540 di bawah
 * hardcode persis nilai prototipe — dekoratif khusus banner ini, sengaja gak ditokenkan di sana.
 */
export async function PengumumanWidget({ sekolahId }: { sekolahId: string }) {
  const pengumuman = await getPengumumanTerbaru(sekolahId, 3);
  if (pengumuman.length === 0) return null;

  return (
    <div
      className="flex gap-4 overflow-x-auto rounded-2xl border border-[#e6d3a4] px-5 py-4"
      style={{ background: "linear-gradient(120deg, var(--accent-tint), var(--accent-tint-2))" }}
    >
      {pengumuman.map((p) => (
        <div key={p.id} className="min-w-[240px] flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="m-0 min-w-0 flex-1 text-[13.5px] font-bold text-[#5a4321]">📣 {p.judul}</h4>
            <span className="whitespace-nowrap text-[10.5px] text-accent-deep">{formatTanggal(p.createdAt)}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-[#7a6540] line-clamp-2">{p.isi}</p>
        </div>
      ))}
    </div>
  );
}
