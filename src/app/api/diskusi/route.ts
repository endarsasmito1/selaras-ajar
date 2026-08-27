import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "GURU" && session.peran !== "MURID")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const materiId = formData.get("materiId") ? String(formData.get("materiId")) : null;
  const tugasId = formData.get("tugasId") ? String(formData.get("tugasId")) : null;
  const parentIdRaw = formData.get("parentId");
  const isi = String(formData.get("isi") ?? "").trim();

  const url = req.nextUrl.clone();
  const backTo = materiId
    ? session.peran === "GURU" ? "/guru/materi" : "/murid/materi"
    : tugasId
      ? (session.peran === "GURU" ? `/guru/tugas/${tugasId}` : `/murid/tugas/${tugasId}`)
      : "/";
  url.pathname = backTo;

  // Tepat satu target harus terisi (DK, satu komponen dipasang di dua konteks).
  if ((!materiId && !tugasId) || (materiId && tugasId) || !isi) {
    url.search = `?error=${encodeURIComponent("Komentar tidak valid")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  let parentId: string | null = null;
  if (parentIdRaw) {
    // Thread cuma 1 level — kalau parent yang dirujuk sendiri punya parent, tolak nesting lebih dalam.
    const parent = await prisma.komentarKonten.findUnique({ where: { id: String(parentIdRaw) } });
    if (parent && !parent.parentId) parentId = parent.id;
  }

  await prisma.komentarKonten.create({
    data: { penggunaId: session.userId, materiId, tugasId, isi, parentId },
  });

  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
