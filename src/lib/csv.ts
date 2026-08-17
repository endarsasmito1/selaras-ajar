/** Parser CSV sederhana — cukup untuk data sekolah (menangani quote dasar). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  for (const line of lines) {
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  return lines.join("\n");
}

/**
 * Staging area impor CSV — disimpan sebagai file JSON sementara (bukan in-memory Map).
 * Next.js dev server (Turbopack) bisa menjalankan route handler & page render di module
 * instance berbeda, jadi in-memory Map di top-level module tidak reliable dipakai lintas
 * request untuk kebutuhan ini. File di disk lebih robust untuk prototype single-server.
 * Produksi nyata: ganti dengan tabel DB (mis. `ImportBatch`) + job TTL cleanup.
 */
import fs from "fs";
import path from "path";
import os from "os";

export type BarisImporSiswa = {
  baris: number;
  nisn: string;
  nama: string;
  kelasNama: string;
  jenisKelamin: string;
  waliNama?: string;
  waliTelepon?: string;
  error?: string;
  aksi?: "buat" | "perbarui";
};

export type ImportBatch = {
  jenis: "siswa";
  valid: BarisImporSiswa[];
  bermasalah: BarisImporSiswa[];
  createdAt: number;
};

const BATCH_DIR = path.join(os.tmpdir(), "selaras-ajar-import-batches");

function pastikanDir() {
  if (!fs.existsSync(BATCH_DIR)) fs.mkdirSync(BATCH_DIR, { recursive: true });
}

export function simpanBatch(batch: ImportBatch): string {
  pastikanDir();
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  fs.writeFileSync(path.join(BATCH_DIR, `${id}.json`), JSON.stringify(batch), "utf-8");
  return id;
}

export function ambilBatch(id: string): ImportBatch | undefined {
  try {
    const raw = fs.readFileSync(path.join(BATCH_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as ImportBatch;
  } catch {
    return undefined;
  }
}

export function hapusBatch(id: string) {
  try {
    fs.unlinkSync(path.join(BATCH_DIR, `${id}.json`));
  } catch {
    // sudah tidak ada, abaikan
  }
}
