import { cn } from "@/lib/utils";

/** §6.12 ui-design-system-selaras-ajar.md ("Question builder", `.opt-row`/`.opt-row.correct`) —
 * preview opsi jawaban + kunci langsung di kartu soal, biar gak perlu klik "Ubah" dulu buat lihat
 * jawaban benarnya. Dipakai di halaman bank soal (superadmin & guru). */
export function OpsiPreview({
  jenis,
  opsi,
  kunciJawaban,
}: {
  jenis: string;
  opsi: string | null;
  kunciJawaban: string | null;
}) {
  if (jenis === "JAWABAN_SINGKAT") {
    if (!kunciJawaban) return null;
    return (
      <p className="text-xs text-ink-soft mt-2.5">
        Kunci: <span className="font-semibold text-ink">{kunciJawaban}</span>
      </p>
    );
  }

  if (!opsi) return null;
  let opsiList: string[] = [];
  try {
    opsiList = JSON.parse(opsi);
  } catch {
    return null;
  }

  const kunciSet = new Set<number>();
  if (jenis === "PILIHAN_GANDA_KOMPLEKS" && kunciJawaban) {
    try {
      for (const i of JSON.parse(kunciJawaban) as number[]) kunciSet.add(i);
    } catch {
      // biarkan kosong kalau parse gagal — jangan sampai bikin halaman error
    }
  } else if (kunciJawaban !== null && kunciJawaban !== "") {
    const idx = Number(kunciJawaban);
    if (!Number.isNaN(idx)) kunciSet.add(idx);
  }

  return (
    <div className="flex flex-col gap-1.5 mt-2.5">
      {opsiList.map((teks, i) => {
        const benar = kunciSet.has(i);
        return (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 text-xs border rounded-lg px-2.5 py-1.5",
              benar ? "border-success bg-success-tint" : "border-rule bg-paper"
            )}
          >
            <span className={cn("w-4 h-4 rounded-full border-2 shrink-0", benar ? "border-success bg-success" : "border-rule")} />
            <span className="flex-1">{teks}</span>
            {benar && <span className="text-[10px] font-bold text-success shrink-0">✓ Kunci</span>}
          </div>
        );
      })}
    </div>
  );
}
