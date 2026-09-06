import { getPengumumanTerbaru } from "@/lib/data";
import { formatTanggal } from "@/lib/utils";

/**
 * Dua gaya "Pengumuman" prototipe — BUKAN satu komponen serba-guna, krn prototipe sendiri sengaja
 * pakai dua treatment beda tergantung role (dicek satu-satu di tiap file .html, bukan diasumsikan
 * sama semua): `SA.pengumumanBanner()` (banner gradient horizontal-scroll) CUMA dipanggil di
 * guru/index.html; role lain (murid/kepsek, & TU yg beranda-nya /kepsek/siswa) pakai `.notif-card`
 * biasa di dalam <Card> berjudul "📣 Pengumuman" — jauh lebih senyap/gak menonjol drpd banner guru.
 * Ortu/index.html prototipe malah SAMA SEKALI GAK PUNYA elemen pengumuman di beranda (fokus ke
 * tagihan SPP per anak) — belum diputuskan apakah field ini di app sungguhan mau ikut dihapus dari
 * dashboard ortu atau dipertahankan sbg tambahan fungsional; belum diubah, ditandai TODO.
 */

/** Banner gradient emas, horizontal-scroll — KHUSUS dashboard Guru. */
export async function PengumumanBanner({ sekolahId }: { sekolahId: string }) {
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

/** Padanan `.notif-card.n-info` di dalam <Card> "📣 Pengumuman" — dipakai Murid, Kepsek, & TU. */
export async function PengumumanNotifCard({ sekolahId }: { sekolahId: string }) {
  const pengumuman = await getPengumumanTerbaru(sekolahId, 3);
  if (pengumuman.length === 0) return null;

  return (
    <div className="bg-paper-raised border border-rule rounded-xl p-5 mb-4">
      <h3 className="text-base font-semibold mb-3">📣 Pengumuman</h3>
      <div className="flex flex-col gap-2.5">
        {pengumuman.map((p) => (
          <div key={p.id} className="border-l-[3px] border-primary-deep bg-paper-raised rounded-r-xl px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{p.judul}</span>
              <span className="text-[11px] text-ink-soft shrink-0">{formatTanggal(p.createdAt)}</span>
            </div>
            <p className="text-xs text-ink-soft mt-1 whitespace-pre-line">{p.isi}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
