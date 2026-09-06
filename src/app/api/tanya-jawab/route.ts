import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { upsertNotifikasi } from "@/lib/notifikasi";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "GURU" && session.peran !== "MURID")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kelasId = String(formData.get("kelasId") ?? "");
  const mapelId = String(formData.get("mapelId") ?? "");
  const parentIdRaw = formData.get("parentId");
  const isi = String(formData.get("isi") ?? "").trim();
  const anonim = formData.get("anonim") === "1";

  const url = req.nextUrl.clone();
  url.pathname = session.peran === "GURU" ? "/guru/tanya-jawab" : "/murid/tanya-jawab";
  url.search = `?kelas=${kelasId}&mapel=${mapelId}`;

  if (!kelasId || !mapelId || !isi) {
    url.search += `&error=${encodeURIComponent("Pertanyaan tidak valid")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  // Tenant-scoping: murid cuma boleh posting di kelasnya sendiri; guru cuma boleh posting
  // di kelas+mapel yang benar-benar diampunya (bukan sekadar kelas yg diampu di mapel lain).
  if (session.peran === "MURID") {
    const siswa = await prisma.siswa.findUnique({ where: { akunId: session.userId } });
    if (!siswa || siswa.kelasId !== kelasId) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
  } else {
    const guru = await prisma.guruProfil.findUnique({ where: { penggunaId: session.userId } });
    const penugasan = guru
      ? await prisma.penugasanGuru.findFirst({ where: { guruId: guru.id, kelasId, mapelId } })
      : null;
    if (!penugasan) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
  }

  let parentId: string | null = null;
  let parentAsker: { id: string; peran: string } | null = null;
  if (parentIdRaw) {
    // Thread cuma 1 level — kalau parent yang dirujuk sendiri punya parent, tolak nesting lebih dalam.
    const parent = await prisma.tanyaJawabKelas.findUnique({ where: { id: String(parentIdRaw) }, include: { pengguna: true } });
    if (parent && !parent.parentId) {
      parentId = parent.id;
      parentAsker = { id: parent.pengguna.id, peran: parent.pengguna.peran };
    }
  }

  const dibuat = await prisma.tanyaJawabKelas.create({
    data: { kelasId, mapelId, penggunaId: session.userId, isi, anonim, parentId },
    include: { kelas: true, mapel: true },
  });

  if (!parentId && session.peran === "MURID") {
    // NTF-G-06 — pertanyaan baru dari murid, beritahu guru yang mengampu kelas+mapel ini.
    const penugasan = await prisma.penugasanGuru.findMany({
      where: { kelasId, mapelId },
      include: { guru: true },
    });
    await Promise.all(
      penugasan.map((p) =>
        upsertNotifikasi({
          penggunaId: p.guru.penggunaId,
          tipe: "tanya-jawab-baru",
          entitasKey: dibuat.id,
          judul: `Pertanyaan baru di ${dibuat.mapel.nama} — Kelas ${dibuat.kelas.nama}`,
          deskripsi: isi.length > 80 ? isi.slice(0, 80) + "…" : isi,
          href: `/guru/tanya-jawab?kelas=${kelasId}&mapel=${mapelId}`,
          prioritas: "SEDANG",
        })
      )
    );
  } else if (parentId && session.peran === "GURU" && parentAsker && parentAsker.peran === "MURID") {
    // NTF-M-08 — guru membalas pertanyaan murid, beritahu murid yang bertanya. entitasKey dipatok
    // ke THREAD (parentId) bukan balasan ini sendiri — biar balasan susulan cuma update satu baris
    // notif yang sama (upsert), bukan numpuk notif baru tiap kali guru nambah komentar di thread itu.
    await upsertNotifikasi({
      penggunaId: parentAsker.id,
      tipe: "tanya-jawab-dibalas",
      entitasKey: parentId,
      judul: `Pertanyaanmu di ${dibuat.mapel.nama} dibalas`,
      deskripsi: isi.length > 80 ? isi.slice(0, 80) + "…" : isi,
      href: `/murid/tanya-jawab?mapel=${mapelId}`,
      prioritas: "SEDANG",
    });
  }

  url.search = `?kelas=${kelasId}&mapel=${mapelId}`;
  return NextResponse.redirect(url, { status: 303 });
}
