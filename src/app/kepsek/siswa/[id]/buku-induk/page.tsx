import { getSession } from "@/lib/auth";
import { getProfilSiswa360 } from "@/lib/data";
import { PrintButton } from "@/components/ui/PrintButton";
import { formatTanggal } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function BukuIndukSiswaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const profil = await getProfilSiswa360(id, session.sekolahId);
  if (!profil) notFound();
  const { siswa, wali } = profil;

  return (
    <div className="max-w-2xl mx-auto p-8 print:p-0">
      <div className="flex justify-end mb-4 print:hidden">
        <PrintButton />
      </div>
      <h1 className="font-serif text-xl text-center mb-1">BUKU INDUK SISWA</h1>
      <p className="text-center text-sm text-ink-soft mb-6">Format cetak — sumber data profil siswa 360°</p>

      <table className="w-full text-sm border border-rule">
        <tbody>
          <Baris label="Nomor Induk (NISN)" value={siswa.nisn} />
          <Baris label="Nama Lengkap" value={siswa.nama} />
          <Baris label="Jenis Kelamin" value={siswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"} />
          <Baris label="Tanggal Lahir" value={siswa.tanggalLahir ? formatTanggal(siswa.tanggalLahir) : "—"} />
          <Baris label="Alamat" value={siswa.alamat || "—"} />
          <Baris label="Kelas Saat Ini" value={siswa.kelas.nama} />
          <Baris label="Tanggal Masuk" value={formatTanggal(siswa.createdAt)} />
          <Baris label="Status" value={siswa.aktif ? "Aktif" : "Tidak aktif / keluar"} />
          {wali.map((w) => (
            <Baris key={w.id} label={`Orang Tua/Wali (${w.hubungan})`} value={`${w.pengguna.nama} — ${w.pengguna.telepon ?? "—"}`} />
          ))}
        </tbody>
      </table>

      <p className="text-xs text-ink-soft mt-6 text-center">Dicetak {formatTanggal(new Date())} — {session.sekolahId}</p>
    </div>
  );
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-rule">
      <td className="px-3 py-2 font-semibold w-1/3 bg-paper-sunken">{label}</td>
      <td className="px-3 py-2">{value}</td>
    </tr>
  );
}
