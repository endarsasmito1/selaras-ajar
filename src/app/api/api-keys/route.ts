import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateApiKey } from "@/lib/apikey";

/** 1.12, diminta eksplisit — kepsek/TU bikin API key baru utk sekolahnya sendiri. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.peran !== "KEPALA_SEKOLAH" && session.peran !== "TU")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const label = String(formData.get("label") ?? "").trim();

  const url = req.nextUrl.clone();
  url.pathname = "/kepsek/ekspor";

  if (!label) {
    url.search = `?error=${encodeURIComponent("Label API key wajib diisi")}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  const { plaintext, keyHash, keyPrefix } = generateApiKey();
  await prisma.apiKey.create({
    data: { sekolahId: session.sekolahId, label, keyHash, keyPrefix, createdById: session.userId },
  });

  // Plaintext cuma lewat sekali di URL redirect ini — tak pernah disimpan di DB. Halaman tujuan
  // wajib menampilkannya sbg one-time reveal lalu tak bisa diambil lagi setelah reload.
  url.search = `?apiKeyBaru=${encodeURIComponent(plaintext)}`;
  return NextResponse.redirect(url, { status: 303 });
}
