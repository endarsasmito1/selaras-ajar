import { getSession } from "@/lib/auth";
import { getSoalById } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SoalEditor } from "@/components/ui/SoalEditor";
import { notFound } from "next/navigation";

const JENIS_LABEL: Record<string, string> = {
  PILIHAN_GANDA: "Pilihan Ganda",
  PILIHAN_GANDA_KOMPLEKS: "Pilihan Ganda Kompleks",
  PILIHAN_GANDA_MINUS: "Pilihan Ganda (Nilai Minus)",
  JAWABAN_SINGKAT: "Jawaban Singkat",
  ESAI: "Esai",
};

export default async function EditSoalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const { error } = await searchParams;
  const soal = await getSoalById(id, session.sekolahId);
  if (!soal) notFound();

  const opsiList: string[] = soal.opsi ? JSON.parse(soal.opsi) : ["", "", "", ""];
  const kunciMultiList: number[] = soal.jenis === "PILIHAN_GANDA_KOMPLEKS" && soal.kunciJawaban ? JSON.parse(soal.kunciJawaban) : [];

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/bank-soal"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ubah Soal"
      pageSubtitle={JENIS_LABEL[soal.jenis]}
    >
      {error && (
        <div className="mb-4">
          <Callout tone="warn">{error}</Callout>
        </div>
      )}
      {soal.dibuatOlehId !== session.userId && (
        <div className="mb-4">
          <Callout tone="warn">
            Soal ini dipakai di ujian lain — jika sudah pernah dikerjakan murid, perubahan tak
            mengubah jawaban/nilai historis yang sudah tercatat.
          </Callout>
        </div>
      )}
      <div className="bg-paper-raised border border-rule rounded-xl p-6 max-w-xl">
        <form action="/api/soal/update" method="POST">
          <input type="hidden" name="soalId" value={soal.id} />
          <input type="hidden" name="jenis" value={soal.jenis} />

          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-semibold">Pertanyaan</label>
            <SoalEditor name="pertanyaan" defaultValue={soal.pertanyaan} />
          </div>

          {(soal.jenis === "PILIHAN_GANDA" || soal.jenis === "PILIHAN_GANDA_MINUS") && (
            <div className="mb-3">
              <label className="text-xs font-semibold block mb-1.5">Opsi jawaban</label>
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="kunciJawaban"
                      value={i}
                      defaultChecked={String(i) === soal.kunciJawaban}
                      required
                      className="accent-[color:var(--primary)]"
                      title="Tandai sebagai kunci jawaban"
                    />
                    <input
                      name="opsi"
                      required
                      defaultValue={opsiList[i] ?? ""}
                      placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                      className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-soft mt-1.5">Klik bulatan untuk ubah kunci jawaban — wajib.</p>
            </div>
          )}

          {soal.jenis === "PILIHAN_GANDA_MINUS" && (
            <div className="grid grid-cols-2 gap-3 mb-3 bg-paper border border-rule rounded-lg p-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Mode potongan kalau salah</label>
                <select name="penguranganMode" defaultValue={soal.penguranganMode ?? "PERSEN"} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm">
                  <option value="PERSEN">Persen dari poin soal</option>
                  <option value="POIN">Poin tetap</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Besaran potongan</label>
                <input name="penguranganNilai" type="number" step="0.1" min="0" defaultValue={soal.penguranganNilai ?? ""} className="bg-paper-raised border border-rule rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {soal.jenis === "PILIHAN_GANDA_KOMPLEKS" && (
            <div className="mb-3">
              <label className="text-xs font-semibold block mb-1.5">Opsi jawaban (centang semua kunci yang benar)</label>
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="kunciJawabanMulti"
                      value={i}
                      defaultChecked={kunciMultiList.includes(i)}
                      className="accent-[color:var(--primary)]"
                      title="Centang sbg kunci jawaban"
                    />
                    <input
                      name="opsi"
                      required
                      defaultValue={opsiList[i] ?? ""}
                      placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                      className="flex-1 bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-soft mt-1.5">Murid harus centang persis semua kunci (tak kurang tak lebih) baru dapat poin.</p>
            </div>
          )}

          {soal.jenis === "JAWABAN_SINGKAT" && (
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="text-xs font-semibold">Kunci jawaban</label>
              <input
                name="kunciSingkat"
                defaultValue={soal.kunciJawaban ?? ""}
                className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {(soal.jenis === "JAWABAN_SINGKAT" || soal.jenis === "ESAI") && (
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="text-xs font-semibold">Durasi pengerjaan soal ini (detik, opsional)</label>
              <input name="durasiDetik" type="number" min="1" defaultValue={soal.durasiDetik ?? ""} placeholder="mis. 120" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm w-40" />
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Topik</label>
              <input
                name="topik"
                defaultValue={soal.topik ?? ""}
                className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Tingkat kesulitan</label>
              <select
                name="tingkatKesulitan"
                defaultValue={soal.tingkatKesulitan ?? "sedang"}
                className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
              >
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Poin default</label>
              <input
                name="poinDefault"
                type="number"
                defaultValue={soal.poinDefault}
                className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">Simpan perubahan</Button>
            <a href={`/guru/bank-soal/mapel/${soal.mapelId}`} className="text-xs font-semibold text-ink-soft self-center hover:underline">
              Batal
            </a>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
