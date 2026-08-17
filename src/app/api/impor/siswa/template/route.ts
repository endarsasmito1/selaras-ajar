import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const csv = toCsv(
    ["nisn", "nama", "kelas", "jenis_kelamin", "nama_wali", "telepon_wali"],
    [
      ["0012345678", "Contoh Nama Siswa", "5B", "L", "Bpk. Contoh", "081200000000"],
      ["0012345679", "Contoh Siswa Lain", "5B", "P", "Ibu Contoh", "081200000001"],
    ]
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-impor-siswa.csv"',
    },
  });
}
