import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const ids = formData.getAll("scaleId") as string[];

  // Tenant-scoping: scaleId mentah dari form, tanpa cek ini KEPSEK/TU sekolah lain bisa
  // nimpa band nilai (GradeScale) sekolah lain kalau kebetulan/sengaja tau id-nya.
  const scaleMilikSekolah = ids.length
    ? await prisma.gradeScale.findMany({ where: { id: { in: ids }, sekolahId: session.sekolahId }, select: { id: true } })
    : [];
  const scaleIdValid = new Set(scaleMilikSekolah.map((s) => s.id));

  for (const scaleId of ids) {
    if (!scaleIdValid.has(scaleId)) continue;
    const min = Number(formData.get(`min_${scaleId}`));
    const max = Number(formData.get(`max_${scaleId}`));
    const label = String(formData.get(`label_${scaleId}`));
    await prisma.gradeScale.update({ where: { id: scaleId }, data: { minSkor: min, maxSkor: max, label } });
  }

  const labelBaru = String(formData.get("labelBaru") ?? "");
  if (labelBaru.trim() !== "") {
    await prisma.gradeScale.create({
      data: {
        sekolahId: session.sekolahId,
        minSkor: Number(formData.get("minBaru") ?? 0),
        maxSkor: Number(formData.get("maxBaru") ?? 0),
        label: labelBaru,
        urutan: 99,
      },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/master-data";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
