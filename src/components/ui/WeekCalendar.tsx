/**
 * Padanan `.gcal` prototipe (assets/styles.css §"Kalender minggu ala Google Calendar", dipakai
 * guru/jadwal-kelas.html & murid/jadwal.html) — grid mingguan BERBASIS WAKTU, event diposisikan
 * absolut proporsional jam (bukan sekadar daftar kartu per-kolom-hari yang dipakai sebelumnya di
 * sini). Server component murni, tanpa JS — prototipe hitung tinggi jam dinamis dari sisa layar
 * (`resize` listener) supaya muat 1 layar tanpa scroll; di sini SENGAJA pakai tinggi jam TETAP
 * (`pxPerJam`) drpd nambah client JS cuma buat itu — konsisten dgn filosofi app ini (minim JS di
 * halaman server-rendered), trade-off: bisa perlu scroll di layar pendek, gak reflow live saat
 * resize window. Popover aksi (Tandai hadir/Edit/Hapus) prototipe diganti Drawer/ConfirmSubmitLink
 * yang sudah ada — bukan reimplementasi popover custom.
 */

export type WeekEvent = {
  id: string;
  hari: number; // 1=Senin..6=Sabtu
  jamMulai: string; // "07:30"
  jamSelesai: string; // "08:40"
  /** Beri warna beda utk milik-sendiri vs sesi lain (kelas lain guru ini, atau read-only murid) */
  tone?: "own" | "other";
  content: React.ReactNode;
};

function keMenit(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function WeekCalendar({
  hariList,
  hariAktif,
  events,
  rangeMulaiJam = 7,
  rangeSelesaiJam = 17,
  pxPerJam = 56,
}: {
  /** Label hari, index 0 = hari ke-1 (Senin). Panjang array = jumlah kolom. */
  hariList: string[];
  hariAktif?: number;
  events: WeekEvent[];
  rangeMulaiJam?: number;
  rangeSelesaiJam?: number;
  pxPerJam?: number;
}) {
  const rangeMulai = rangeMulaiJam * 60;
  const rangeSelesai = rangeSelesaiJam * 60;
  const pxPerMenit = pxPerJam / 60;
  const tinggiTotal = (rangeSelesai - rangeMulai) * pxPerMenit;
  const jamList = Array.from({ length: rangeSelesaiJam - rangeMulaiJam + 1 }, (_, i) => rangeMulaiJam + i);

  const diLuarRentang = events.filter((e) => keMenit(e.jamMulai) < rangeMulai || keMenit(e.jamSelesai) > rangeSelesai);

  return (
    <div>
      {diLuarRentang.length > 0 && (
        <div className="bg-warning-tint text-warning rounded-lg px-3.5 py-2.5 text-xs mb-3">
          ⚠ {diLuarRentang.length} sesi di luar rentang tampilan kalender ({rangeMulaiJam.toString().padStart(2, "0")}.00–
          {rangeSelesaiJam.toString().padStart(2, "0")}.00), <b>tidak kelihatan di grid di bawah</b>.
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `52px repeat(${hariList.length}, 1fr)` }}>
          <div />
          {hariList.map((h, i) => {
            const hari = i + 1;
            return (
              <div key={hari} className={"text-center pb-2 text-xs font-semibold " + (hari === hariAktif ? "text-primary-deep" : "text-ink-soft")}>
                {h}
                {hari === hariAktif && <span className="block text-[10px] font-normal">Hari ini</span>}
              </div>
            );
          })}

          <div className="relative" style={{ height: tinggiTotal }}>
            {jamList.map((jam) => (
              <span
                key={jam}
                className="absolute -translate-y-1/2 text-[10.5px] text-ink-soft tabnum"
                style={{ top: (jam * 60 - rangeMulai) * pxPerMenit }}
              >
                {String(jam).padStart(2, "0")}.00
              </span>
            ))}
          </div>

          {hariList.map((_, i) => {
            const hari = i + 1;
            const sesiHari = events.filter((e) => e.hari === hari && keMenit(e.jamMulai) >= rangeMulai && keMenit(e.jamSelesai) <= rangeSelesai);
            return (
              <div
                key={hari}
                className={"relative border-l border-rule-soft " + (hari === hariAktif ? "bg-primary-tint/20" : "")}
                style={{ height: tinggiTotal }}
              >
                {/* Garis tiap jam — cuma dekorasi visual, bukan pembatas fungsional. */}
                {jamList.map((jam) => (
                  <div key={jam} className="absolute inset-x-0 border-t border-rule-soft" style={{ top: (jam * 60 - rangeMulai) * pxPerMenit }} />
                ))}
                {sesiHari.map((e) => {
                  const top = (keMenit(e.jamMulai) - rangeMulai) * pxPerMenit;
                  const tinggi = Math.max(24, (keMenit(e.jamSelesai) - keMenit(e.jamMulai)) * pxPerMenit);
                  return (
                    <div
                      key={e.id}
                      className={
                        "absolute inset-x-0.5 rounded-md px-1.5 py-1 overflow-hidden text-[11px] leading-tight " +
                        (e.tone === "other"
                          ? "bg-paper-sunken text-ink-soft border border-dashed border-rule"
                          : "bg-primary-deep text-white")
                      }
                      style={{ top, height: tinggi }}
                    >
                      {e.content}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
