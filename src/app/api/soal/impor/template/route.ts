import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const csv = toCsv(
    ["jenis", "pertanyaan", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "kunci", "topik"],
    [
      ["PILIHAN_GANDA", "Berapa hasil dari 6 x 7?", "42", "36", "48", "40", "A", "Perkalian"],
      ["JAWABAN_SINGKAT", "Ibu kota Indonesia adalah?", "", "", "", "", "Jakarta", "Geografi"],
      ["ESAI", "Jelaskan proses fotosintesis pada tumbuhan.", "", "", "", "", "", "Biologi"],
    ]
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=template-soal.csv",
    },
  });
}
