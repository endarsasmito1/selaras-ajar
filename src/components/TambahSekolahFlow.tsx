"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

type HasilPencarianSekolah = {
  npsn: string;
  nama: string;
  jenjang: string;
  alamat: string;
  kecamatan: string;
  kecamatanCode: string;
  kabupatenKota: string;
  provinsi: string;
};

type Paging = { page: number; totalPage: number; totalItem: number };

const inputClass = "bg-paper border border-rule rounded-lg px-3 py-2 text-sm";
const lockedClass = "bg-paper-sunken border border-rule rounded-lg px-3 py-2 text-sm text-ink-soft";
const JENJANG_OPSI = ["SD", "SMP", "SMA", "SMK"];

// 1.18, diminta eksplisit — provider api.co.id kirim 100 hasil/halaman (fixed, tak bisa diubah di
// sisi mereka), tapi kita mau tampilkan cuma 20/halaman. Diakali dgn membagi tiap 100 hasil yang
// sudah kepanggil jadi 5 "halaman tampilan" client-side — request baru ke provider cuma dipicu
// kalau halaman tampilan yang diminta ada di luar 100 yang sedang di-cache.
const DISPLAY_PER_PAGE = 20;
const API_PER_PAGE = 100;
const SUBPAGE_PER_API_PAGE = API_PER_PAGE / DISPLAY_PER_PAGE;

/**
 * 1.17, diminta eksplisit — nomor halaman bergaya sama dgn pagination lain di app (mis. Kelola
 * Sekolah, Mutasi Siswa), tapi diberi jendela ±1 + "…" karena hasil api.co.id bisa sampai ratusan
 * halaman (nama umum spt "SD NEGERI") — menampilkan semua nomor akan tak masuk akal.
 */
function nomorHalaman(current: number, total: number): (number | "…")[] {
  const hasil: (number | "…")[] = [];
  const tampilkan = new Set([1, total, current - 1, current, current + 1]);
  let prev = 0;
  for (let h = 1; h <= total; h++) {
    if (!tampilkan.has(h) || h < 1 || h > total) continue;
    if (prev && h - prev > 1) hasil.push("…");
    hasil.push(h);
    prev = h;
  }
  return hasil;
}

/**
 * 1.12-1.14, diminta eksplisit — alur 2 langkah: (1) cari nama sekolah -> pilih dari daftar hasil
 * (semua hasil ditampilkan, dipaginasi lewat halaman provider; alamat/NPSN/kecamatan/kabupaten/
 * provinsi otomatis terisi & TERKUNCI karena itu data resmi), atau (2) kalau tak ketemu, tombol
 * "Tambah manual" ke form kosong yang bisa diisi bebas. Akun kepsek TIDAK dibuat di sini (1.14) —
 * ditambahkan belakangan dari halaman detail sekolah.
 */
export function TambahSekolahFlow() {
  const [step, setStep] = useState<"cari" | "isi">("cari");
  const [terkunci, setTerkunci] = useState(false);
  const [query, setQuery] = useState("");
  const [hasil, setHasil] = useState<HasilPencarianSekolah[]>([]);
  const [paging, setPaging] = useState<Paging | null>(null);
  const [subHalaman, setSubHalaman] = useState(0); // 0..4, irisan 20 dari 100 hasil yang di-cache
  const [sudahCari, setSudahCari] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nama, setNama] = useState("");
  const [npsn, setNpsn] = useState("");
  const [jenjang, setJenjang] = useState("SD");
  const [alamat, setAlamat] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [kabupatenKota, setKabupatenKota] = useState("");
  const [provinsi, setProvinsi] = useState("");
  const [kodePos, setKodePos] = useState("");
  const [kodePosLoading, setKodePosLoading] = useState(false);

  async function cari(q: string, halamanApi: number, subHalamanSetelah = 0) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/sekolah-search?q=${encodeURIComponent(q)}&halaman=${halamanApi}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal mencari sekolah");
      setHasil(json.hasil ?? []);
      setPaging(json.paging ?? null);
      setSubHalaman(subHalamanSetelah);
      setSudahCari(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencari sekolah");
      setHasil([]);
      setPaging(null);
      setSudahCari(true);
    } finally {
      setLoading(false);
    }
  }

  function submitCari(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3) {
      setError("Ketik minimal 3 huruf dulu");
      return;
    }
    cari(query, 1);
  }

  /** Pindah ke halaman TAMPILAN (20/halaman) ke-`target` — cuma fetch ulang ke provider kalau
   * halaman itu ada di luar 100 hasil yang sedang di-cache di `hasil`. */
  function gotoHalamanTampilan(target: number) {
    const halamanApiDibutuhkan = Math.ceil(target / SUBPAGE_PER_API_PAGE);
    const subHalamanDibutuhkan = (target - 1) % SUBPAGE_PER_API_PAGE;
    if (paging && halamanApiDibutuhkan === paging.page) {
      setSubHalaman(subHalamanDibutuhkan);
    } else {
      cari(query, halamanApiDibutuhkan, subHalamanDibutuhkan);
    }
  }

  async function pilihSekolah(s: HasilPencarianSekolah) {
    setNama(s.nama);
    setNpsn(s.npsn);
    setJenjang(JENJANG_OPSI.includes(s.jenjang) ? s.jenjang : "SD");
    setAlamat(s.alamat);
    setKecamatan(s.kecamatan);
    setKabupatenKota(s.kabupatenKota);
    setProvinsi(s.provinsi);
    setKodePos("");
    setTerkunci(true);
    setStep("isi");
    setKodePosLoading(true);
    try {
      const res = await fetch(`/api/superadmin/sekolah-kodepos?kecamatanCode=${encodeURIComponent(s.kecamatanCode)}`);
      const json = await res.json();
      setKodePos(json.kodePos ?? "");
    } finally {
      setKodePosLoading(false);
    }
  }

  function tambahManual() {
    setNama(query);
    setNpsn("");
    setJenjang("SD");
    setAlamat("");
    setKecamatan("");
    setKabupatenKota("");
    setProvinsi("");
    setKodePos("");
    setTerkunci(false);
    setStep("isi");
  }

  if (step === "cari") {
    const displayList = hasil.slice(subHalaman * DISPLAY_PER_PAGE, subHalaman * DISPLAY_PER_PAGE + DISPLAY_PER_PAGE);
    const totalHalamanTampilan = paging ? Math.ceil(paging.totalItem / DISPLAY_PER_PAGE) : 0;
    const halamanTampilanSaatIni = paging ? (paging.page - 1) * SUBPAGE_PER_API_PAGE + subHalaman + 1 : 1;

    return (
      <div className="max-w-lg">
        <form onSubmit={submitCari} className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama sekolah… (mis. SD Cendekia)"
            className={`${inputClass} flex-1`}
            autoFocus
          />
          <Button type="submit" disabled={loading}>{loading ? "Mencari…" : "Cari"}</Button>
        </form>

        {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}

        {sudahCari && !loading && (
          hasil.length === 0 ? (
            <div className="bg-paper-raised border border-rule rounded-xl p-5 text-center">
              <p className="text-sm text-ink-soft mb-3">Tidak ditemukan sekolah dengan nama &quot;{query}&quot; di database nasional.</p>
              <Button type="button" variant="ghost" onClick={tambahManual}>+ Tambah manual</Button>
            </div>
          ) : (
            <div>
              {paging && paging.totalItem > 0 && (
                <p className="text-xs text-ink-soft mb-2">{paging.totalItem} sekolah ditemukan — halaman {halamanTampilanSaatIni} dari {totalHalamanTampilan}</p>
              )}
              <div className="flex flex-col gap-2">
                {displayList.map((s) => (
                  <button
                    key={s.npsn}
                    type="button"
                    onClick={() => pilihSekolah(s)}
                    className="text-left bg-paper-raised border border-rule rounded-xl px-4 py-3 hover:border-primary transition-colors"
                  >
                    <div className="font-semibold text-sm">{s.nama}</div>
                    <div className="text-xs text-ink-soft mt-0.5">NPSN {s.npsn} · {s.jenjang} · {s.kecamatan}, {s.kabupatenKota}, {s.provinsi}</div>
                  </button>
                ))}
              </div>

              {totalHalamanTampilan > 1 && (
                <div className="flex items-center justify-center flex-wrap gap-1 mt-4 text-xs">
                  {nomorHalaman(halamanTampilanSaatIni, totalHalamanTampilan).map((h, i) =>
                    h === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-1.5 text-ink-soft">…</span>
                    ) : (
                      <button
                        key={h}
                        type="button"
                        disabled={loading}
                        onClick={() => gotoHalamanTampilan(h)}
                        className={
                          "px-2.5 py-1 rounded border tabnum disabled:opacity-50 " +
                          (h === halamanTampilanSaatIni
                            ? "bg-primary text-white border-primary font-semibold"
                            : "border-rule hover:bg-paper-raised")
                        }
                      >
                        {h}
                      </button>
                    )
                  )}
                </div>
              )}

              <p className="text-xs text-ink-soft mt-4">
                Sekolahmu tidak ada di atas?{" "}
                <button type="button" onClick={tambahManual} className="font-semibold text-primary-deep hover:underline">
                  Tambah manual
                </button>
              </p>
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <form action="/api/superadmin/sekolah" method="POST" className="flex flex-col gap-3 max-w-md">
      <button
        type="button"
        onClick={() => setStep("cari")}
        className="text-xs font-semibold text-primary-deep hover:underline self-start mb-1"
      >
        ← Kembali ke pencarian
      </button>

      {terkunci && (
        <Callout>🔒 Data di bawah diambil dari database sekolah nasional — terkunci supaya tetap akurat. Kalau ada yang salah, kembali ke pencarian &amp; pakai &quot;Tambah manual&quot; untuk isi bebas.</Callout>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Nama sekolah</label>
        {terkunci ? (
          <div className={lockedClass}>{nama}</div>
        ) : (
          <input name="nama" required value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} placeholder="mis. SD Cendekia Mandiri" />
        )}
        {terkunci && <input type="hidden" name="nama" value={nama} />}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Jenjang</label>
        {terkunci ? (
          <div className={lockedClass}>{jenjang}</div>
        ) : (
          <select name="jenjang" value={jenjang} onChange={(e) => setJenjang(e.target.value)} className={inputClass}>
            {JENJANG_OPSI.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        )}
        {terkunci && <input type="hidden" name="jenjang" value={jenjang} />}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">NPSN</label>
          {terkunci ? <div className={lockedClass}>{npsn || "—"}</div> : (
            <input name="npsn" value={npsn} onChange={(e) => setNpsn(e.target.value)} className={inputClass} placeholder="Opsional" />
          )}
          {terkunci && <input type="hidden" name="npsn" value={npsn} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Kode pos</label>
          <input
            name="kodePos"
            value={kodePos}
            onChange={(e) => setKodePos(e.target.value)}
            className={inputClass}
            placeholder={kodePosLoading ? "Mencari…" : "Opsional"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Alamat</label>
        {terkunci ? <div className={lockedClass}>{alamat || "—"}</div> : (
          <input name="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} className={inputClass} placeholder="Opsional" />
        )}
        {terkunci && <input type="hidden" name="alamat" value={alamat} />}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Kecamatan</label>
          {terkunci ? <div className={lockedClass}>{kecamatan || "—"}</div> : (
            <input name="kecamatan" value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} className={inputClass} />
          )}
          {terkunci && <input type="hidden" name="kecamatan" value={kecamatan} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Kabupaten/Kota</label>
          {terkunci ? <div className={lockedClass}>{kabupatenKota || "—"}</div> : (
            <input name="kabupatenKota" value={kabupatenKota} onChange={(e) => setKabupatenKota(e.target.value)} className={inputClass} />
          )}
          {terkunci && <input type="hidden" name="kabupatenKota" value={kabupatenKota} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Provinsi</label>
          {terkunci ? <div className={lockedClass}>{provinsi || "—"}</div> : (
            <input name="provinsi" value={provinsi} onChange={(e) => setProvinsi(e.target.value)} className={inputClass} />
          )}
          {terkunci && <input type="hidden" name="provinsi" value={provinsi} />}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Latitude (opsional)</label>
          <input name="latitude" type="number" step="any" className={inputClass} placeholder="mis. -6.914744" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Longitude (opsional)</label>
          <input name="longitude" type="number" step="any" className={inputClass} placeholder="mis. 107.609810" />
        </div>
      </div>
      <p className="text-[11px] text-ink-soft -mt-2">Salin dari Google Maps (klik kanan lokasi → salin koordinat) — dipakai utk peta sebaran sekolah di dashboard superadmin.</p>

      <Button type="submit" className="self-start mt-2">Buat sekolah</Button>
    </form>
  );
}
