import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";

const PERAN = [
  { icon: "🏫", nama: "Kepala Sekolah", pesan: "Semua fitur & harga ada di halaman ini — coba dulu sebelum bicara kontrak." },
  { icon: "👩‍🏫", nama: "Guru", pesan: "Satu tempat buat absen, nilai, dan ujian — tanpa nomor HP pribadi jadi hotline." },
  { icon: "🗂", nama: "Tata Usaha", pesan: "Data siswa, jadwal, sampai PPDB — tak perlu bolak-balik spreadsheet berbeda." },
  { icon: "₽", nama: "Bendahara", pesan: "SPP tercatat rapi per siswa, rekonsiliasi dari berhari-hari jadi menit." },
  { icon: "👨‍👩‍👧", nama: "Orang Tua", pesan: "Tahu kehadiran & nilai anak hari itu juga, gak perlu nunggu bagi rapor." },
  { icon: "🎒", nama: "Murid", pesan: "Materi, tugas, dan jadwal ada di satu tempat, gak perlu nanya-nanya lagi." },
];

const FITUR = [
  {
    badge: "Akademik harian",
    judul: "Absensi & nilai, gak nunggu rapor",
    desc: "Guru isi absensi & nilai langsung dari HP; wali kelas dan orang tua bisa lihat progresnya hari itu juga — bukan pas terima rapor semester.",
  },
  {
    badge: "Ujian & CBT",
    judul: "Bank soal sekali bikin, dipakai berkali-kali",
    desc: "Ujian online dinilai otomatis — pilihan ganda sampai esai. Soal & jawaban diacak per murid, dan bank soal bisa dipakai ulang lintas kelas maupun tahun ajaran.",
  },
  {
    badge: "Materi & tanya jawab",
    judul: "Materi tersusun per bab, bukan tumpukan file",
    desc: "Video, dokumen, dan silabus rapi per bab & mata pelajaran. Murid bisa tanya langsung di forum kelasnya — boleh anonim kalau malu bertanya.",
  },
  {
    badge: "Hormat privasi",
    judul: "Nomor guru bukan CS sekolah",
    desc: "Guru berkomunikasi ke orang tua & murid lewat sistem. Nomor HP pribadinya tidak pernah jadi hotline yang harus siap 24 jam.",
  },
  {
    badge: "Hemat waktu admin",
    judul: "Dari jadwal sampai kenaikan kelas, satu tempat",
    desc: "Jadwal pelajaran, RPP, PPDB online, sampai proses kenaikan kelas tahunan — tak perlu pindah-pindah aplikasi atau spreadsheet.",
  },
  {
    badge: "Transparan",
    judul: "SPP tercatat, bukan cuma \"lunas/belum\"",
    desc: "Orang tua tahu jelas tagihan & riwayat pembayaran anaknya; sekolah tak perlu cocokkan mutasi bank manual tiap bulan.",
  },
];

const PAKET = [
  {
    nama: "Rintis",
    harga: "Rp5.000",
    satuan: "/siswa/bln",
    cocok: "Untuk sekolah kecil yang baru mulai digital.",
    fitur: ["Absensi & nilai digital", "Tugas & materi belajar per bab", "Notifikasi WhatsApp ke orang tua", "Impor data siswa lewat CSV"],
    featured: false,
  },
  {
    nama: "Selaras",
    harga: "Rp7.000",
    satuan: "/siswa/bln",
    cocok: "Untuk sekolah yang mau semua modul terhubung.",
    fitur: ["Semua di paket Rintis", "Ujian online (CBT) & bank soal", "RPP & Capaian Pembelajaran", "PPDB online & ekspor format Dapodik"],
    featured: true,
  },
  {
    nama: "Yayasan",
    harga: "Hubungi",
    satuan: "kami",
    cocok: "Untuk yayasan dengan beberapa sekolah sekaligus.",
    fitur: ["Semua di paket Selaras", "Multi-sekolah dalam satu yayasan", "Pendampingan onboarding & migrasi data", "Prioritas dukungan"],
    featured: false,
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <nav className="max-w-[1100px] mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-serif font-bold text-lg text-primary-deep">
          <span className="w-[11px] h-[11px] rounded-[3px] bg-accent inline-block" />
          Selaras Ajar
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm text-ink-soft">
          <a href="#fitur" className="hover:text-ink">Fitur</a>
          <a href="#harga" className="hover:text-ink">Harga</a>
          <Link href="/login" className="hover:text-ink">Masuk</Link>
          <LinkButton href="/login" size="sm">Coba Gratis</LinkButton>
        </div>
        <Link href="/login" className="md:hidden text-sm font-semibold text-primary-deep">Masuk</Link>
      </nav>

      {/* Hero — satu-satunya tempat teal dipakai sebagai latar penuh (aturan design system §11). */}
      <header className="bg-primary-deep text-white">
        <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <h1 className="text-[32px] md:text-[40px] leading-[1.12] text-white text-balance">
              Biar semua pihak sekolah gerak bareng.
            </h1>
            <p className="text-[17px] opacity-90 mt-4 mb-6 max-w-[460px]">
              Absensi, nilai, ujian online, materi belajar, sampai SPP — satu sistem, tanpa data simpang siur, tanpa nomor HP pribadi guru jadi hotline.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/login" variant="accent">Coba Gratis 14 Hari</LinkButton>
              <a
                href="#harga"
                className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold px-5 py-2.5 text-sm min-h-11 border border-white/40 text-white hover:bg-white/10 transition-colors"
              >
                Lihat Harga
              </a>
            </div>
            <p className="text-[13.5px] opacity-85 mt-4 flex items-center gap-2">
              💡 <span>Mulai <b className="text-accent">Rp5.000</b>/siswa/bulan — gak perlu telepon sales buat tahu harganya.</span>
            </p>
          </div>

          <div className="bg-white/[0.07] border border-white/15 rounded-2xl p-2">
            <div className="bg-paper rounded-[11px] p-4 text-ink">
              <p className="font-serif text-sm text-primary-deep mb-1.5">Ringkasan Hari Ini — SD Harapan Bangsa</p>
              <div className="flex items-center justify-between py-2.5 border-b border-rule text-[13px]">
                <span>Kehadiran siswa</span>
                <Pill tone="ok">96%</Pill>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-rule text-[13px]">
                <span>Ujian Matematika · 5B</span>
                <Pill tone="info">28/30 selesai</Pill>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-rule text-[13px]">
                <span>Ahmad Fauzi — SPP Agustus</span>
                <Pill tone="ok">Lunas</Pill>
              </div>
              <div className="flex items-center justify-between py-2.5 text-[13px]">
                <span>Siti Nurhaliza — SPP Agustus</span>
                <Pill tone="warn">Belum bayar</Pill>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Untuk siapa — beroperasionalkan pesan per-persona dari brand guideline */}
      <section className="max-w-[1100px] mx-auto px-6 py-14">
        <p className="text-center text-[11.5px] tracking-[.14em] uppercase text-primary-deep font-bold">Satu sistem, semua peran</p>
        <h2 className="text-center text-[26px] mt-2 mb-10 text-balance">Setiap pihak sekolah dapat versinya sendiri</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {PERAN.map((p) => (
            <div key={p.nama} className="text-center px-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary-tint flex items-center justify-center text-xl mb-3">
                {p.icon}
              </div>
              <div className="text-sm font-semibold mb-1">{p.nama}</div>
              <p className="text-xs text-ink-soft leading-snug">{p.pesan}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 py-16" id="fitur">
        <p className="text-center text-[11.5px] tracking-[.14em] uppercase text-primary-deep font-bold">Kenapa Selaras Ajar</p>
        <h2 className="text-center text-[28px] mt-2 mb-2 text-balance">Dibangun untuk masalah nyata sekolah</h2>
        <p className="text-center text-ink-soft max-w-[560px] mx-auto mb-10 text-[15px]">
          Bukan sekadar &quot;sistem terintegrasi&quot; — tiap modul menjawab keluhan yang benar-benar sering muncul di sekolah.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FITUR.map((f) => (
            <div key={f.judul} className="bg-paper-raised border border-rule rounded-2xl p-6 shadow-sm">
              <span className="inline-block text-[11px] font-bold text-accent-deep bg-accent-tint px-2.5 py-1 rounded-full mb-3">
                {f.badge}
              </span>
              <h3 className="text-[17px] mb-2">{f.judul}</h3>
              <p className="text-[13.5px] text-ink-soft">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-paper-raised border-y border-rule">
        <div className="max-w-[1100px] mx-auto px-6 py-16" id="harga">
          <p className="text-center text-[11.5px] tracking-[.14em] uppercase text-primary-deep font-bold">Harga</p>
          <h2 className="text-center text-[28px] mt-2 mb-2 text-balance">Terbuka, per siswa, tanpa kejutan</h2>
          <p className="text-center text-ink-soft max-w-[560px] mx-auto mb-10 text-[15px]">
            Bayar sesuai jumlah siswa aktif. Tak ada biaya tersembunyi, tak ada kontrak mengikat di awal.
          </p>
          <div className="grid md:grid-cols-3 gap-5 max-w-[1000px] mx-auto">
            {PAKET.map((p) => (
              <div
                key={p.nama}
                className={
                  "bg-paper border rounded-2xl p-7 relative " +
                  (p.featured ? "border-primary shadow-[0_8px_30px_rgba(61,108,95,0.14)]" : "border-rule")
                }
              >
                {p.featured && (
                  <span className="absolute -top-[11px] left-6 bg-accent text-[#3A2C10] text-[11px] font-bold px-3 py-1 rounded-full">
                    Paling sesuai
                  </span>
                )}
                <h3 className="text-lg">{p.nama}</h3>
                <div className="font-serif text-[34px] mt-3 mb-0.5 tabular-nums">
                  {p.harga}
                  <small className="text-sm text-ink-soft font-sans"> {p.satuan}</small>
                </div>
                <p className="text-[13px] text-ink-soft">{p.cocok}</p>
                <ul className="flex flex-col gap-2.5 my-5">
                  {p.fitur.map((item) => (
                    <li key={item} className="text-[13.5px] flex gap-2 items-start">
                      <span className="text-success font-bold">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <LinkButton
                  href="/login"
                  variant={p.featured ? "primary" : "ghost"}
                  className="w-full justify-center"
                >
                  {p.nama === "Yayasan" ? "Jadwalkan Ngobrol" : `Pilih ${p.nama}`}
                </LinkButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-6 py-16 text-center">
        <p className="text-[11.5px] tracking-[.14em] uppercase text-primary-deep font-bold">Data anak, diperlakukan serius</p>
        <h2 className="text-[26px] mt-2 mb-3 text-balance max-w-[560px] mx-auto">
          Sesuai UU PDP sejak desain awal, bukan ditambal belakangan
        </h2>
        <p className="text-ink-soft max-w-[540px] mx-auto text-[15px]">
          Consent orang tua eksplisit sebelum data anak disimpan, akses dibatasi sesuai peran, dan tak ada data yang dibagikan ke pihak lain tanpa izin.
        </p>
      </section>

      <footer className="max-w-[1100px] mx-auto px-6 py-8 border-t border-rule flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-soft">
        <div>
          <span className="font-serif font-bold text-primary-deep">Selaras Ajar</span> · Sistem sekolah yang selaras.
        </div>
        <div className="flex gap-4">
          <span>Kebijakan Privasi</span>
          <span>Keamanan Data</span>
          <span>Kontak</span>
        </div>
      </footer>
    </div>
  );
}
