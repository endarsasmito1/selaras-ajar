import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CAPAIAN_VALID = new Set(["BB", "MB", "BSH", "SB"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "GURU") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const projekId = String(formData.get("projekId") ?? "");
  const siswaIds = formData.getAll("siswaId") as string[];
  const dimensiList = formData.getAll("dimensiList") as string[];

  const projek = await prisma.projek.findFirst({ where: { id: projekId, sekolahId: session.sekolahId } });
  if (!projek) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  const siswaValid = await prisma.siswa.findMany({ where: { id: { in: siswaIds }, sekolahId: session.sekolahId }, select: { id: true } });
  const siswaValidIds = new Set(siswaValid.map((s) => s.id));

  for (const siswaId of siswaIds.filter((id) => siswaValidIds.has(id))) {
    for (const dimensi of dimensiList) {
      const capaian = String(formData.get(`capaian_${siswaId}_${dimensi}`) ?? "");
      if (!CAPAIAN_VALID.has(capaian)) continue;
      await prisma.projekPenilaian.upsert({
        where: { projekId_siswaId_dimensi: { projekId, siswaId, dimensi } },
        update: { capaian: capaian as "BB" | "MB" | "BSH" | "SB" },
        create: { projekId, siswaId, dimensi, capaian: capaian as "BB" | "MB" | "BSH" | "SB" },
      });
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = `/guru/projek/${projekId}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
