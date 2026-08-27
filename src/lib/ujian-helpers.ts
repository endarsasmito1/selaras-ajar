import { prisma } from "@/lib/prisma";

function acak<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ambil pengerjaan murid untuk suatu ujian; buat baru (dengan urutan soal & opsi teracak) kalau belum ada. */
export async function getOrCreatePengerjaan(ujianId: string, siswaId: string) {
  const existing = await prisma.ujianPengerjaan.findUnique({
    where: { ujianId_siswaId: { ujianId, siswaId } },
    include: { jawaban: true },
  });
  if (existing) return existing;

  const ujian = await prisma.ujian.findUnique({
    where: { id: ujianId },
    include: { soal: { include: { soal: true }, orderBy: { urutan: "asc" } } },
  });
  if (!ujian) throw new Error("Ujian tidak ditemukan");

  const soalIds = ujian.soal.map((s) => s.soalId);
  const urutanSoal = ujian.acakSoal ? acak(soalIds) : soalIds;

  const pengerjaan = await prisma.ujianPengerjaan.create({
    data: {
      ujianId,
      siswaId,
      status: "MENGERJAKAN",
      soalUrutan: JSON.stringify(urutanSoal),
      waktuMulai: new Date(),
    },
  });

  // Siapkan baris jawaban kosong per soal, dengan urutan opsi teracak (khusus PG)
  for (const us of ujian.soal) {
    let opsiUrutan: string | null = null;
    if ((us.soal.jenis === "PILIHAN_GANDA" || us.soal.jenis === "PILIHAN_GANDA_MINUS" || us.soal.jenis === "PILIHAN_GANDA_KOMPLEKS") && us.soal.opsi) {
      const opsiArr: string[] = JSON.parse(us.soal.opsi);
      const idxArr = opsiArr.map((_, i) => i);
      opsiUrutan = JSON.stringify(ujian.acakJawaban ? acak(idxArr) : idxArr);
    }
    await prisma.ujianJawaban.create({
      data: { pengerjaanId: pengerjaan.id, soalId: us.soalId, opsiUrutan },
    });
  }

  return prisma.ujianPengerjaan.findUnique({
    where: { id: pengerjaan.id },
    include: { jawaban: true },
  });
}

function normalisasi(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Auto-grade PG & jawaban singkat, hitung ulang nilaiTotal (esai yang belum dinilai tak dihitung dulu). */
export async function autoGradeDanHitungTotal(pengerjaanId: string) {
  const jawabanList = await prisma.ujianJawaban.findMany({
    where: { pengerjaanId },
    include: { soal: true },
  });
  const ujianSoalList = await prisma.ujianSoal.findMany({
    where: { ujianId: (await prisma.ujianPengerjaan.findUnique({ where: { id: pengerjaanId } }))!.ujianId },
  });
  const poinMap = new Map(ujianSoalList.map((us) => [us.soalId, us.poin]));

  let total = 0;
  for (const j of jawabanList) {
    const poin = poinMap.get(j.soalId) ?? 0;
    if (j.soal.jenis === "PILIHAN_GANDA") {
      const benar = j.jawabanPG !== null && String(j.jawabanPG) === j.soal.kunciJawaban;
      const skor = benar ? poin : 0;
      await prisma.ujianJawaban.update({
        where: { id: j.id },
        data: { benar, skor },
      });
      total += skor;
    } else if (j.soal.jenis === "PILIHAN_GANDA_MINUS") {
      // 1.23 — sama bentuk kunci/opsi dgn PILIHAN_GANDA biasa, tapi jawaban SALAH (bukan yang
      // dikosongkan — soal tak dijawab tetap skor 0 tanpa potongan) dipotong sesuai
      // `penguranganMode`/`penguranganNilai` per-soal, floor di 0 (skor satu soal tak pernah
      // negatif, jadi total ujian juga tak pernah tertarik negatif olehnya).
      const dijawab = j.jawabanPG !== null;
      const benar = dijawab && String(j.jawabanPG) === j.soal.kunciJawaban;
      let skor = 0;
      if (benar) {
        skor = poin;
      } else if (dijawab) {
        const potongan =
          j.soal.penguranganMode === "PERSEN" ? (poin * (j.soal.penguranganNilai ?? 0)) / 100 : (j.soal.penguranganNilai ?? 0);
        skor = Math.max(0, poin - potongan);
      }
      await prisma.ujianJawaban.update({
        where: { id: j.id },
        data: { benar, skor },
      });
      total += skor;
    } else if (j.soal.jenis === "PILIHAN_GANDA_KOMPLEKS") {
      // All-or-nothing (1.20, diminta eksplisit): dipilih harus PERSIS sama dgn kunci, tak
      // kurang tak lebih — dibandingkan sbg array index terurut, bukan set longgar.
      const kunci: number[] = j.soal.kunciJawaban ? JSON.parse(j.soal.kunciJawaban).slice().sort((a: number, b: number) => a - b) : [];
      const dipilih: number[] = j.jawabanPGMulti ? JSON.parse(j.jawabanPGMulti).slice().sort((a: number, b: number) => a - b) : [];
      const benar = kunci.length > 0 && kunci.length === dipilih.length && kunci.every((v, i) => v === dipilih[i]);
      const skor = benar ? poin : 0;
      await prisma.ujianJawaban.update({
        where: { id: j.id },
        data: { benar, skor },
      });
      total += skor;
    } else if (j.soal.jenis === "JAWABAN_SINGKAT") {
      const benar =
        !!j.jawabanTeks &&
        !!j.soal.kunciJawaban &&
        normalisasi(j.jawabanTeks) === normalisasi(j.soal.kunciJawaban);
      const skor = benar ? poin : 0;
      await prisma.ujianJawaban.update({
        where: { id: j.id },
        data: { benar, skor },
      });
      total += skor;
    } else {
      // ESAI — dinilai manual guru; kalau sudah ada skor, tetap dihitung
      total += j.skor ?? 0;
    }
  }

  await prisma.ujianPengerjaan.update({ where: { id: pengerjaanId }, data: { nilaiTotal: total } });
  return total;
}

/** U-26: cek semua jawaban esai (dinilai manual) di satu pengerjaan sudah berskor. */
export async function semuaJawabanManualSudahDinilai(pengerjaanId: string) {
  const jawabanList = await prisma.ujianJawaban.findMany({
    where: { pengerjaanId },
    include: { soal: true },
  });
  const belumDinilai = jawabanList.filter((j) => j.soal.jenis === "ESAI" && j.skor === null);
  return { selesai: belumDinilai.length === 0, belumDinilai };
}
