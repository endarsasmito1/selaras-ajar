import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession, HOME_BY_ROLE } from "@/lib/auth";
import type { Peran } from "@/generated/prisma/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const url = req.nextUrl.clone();
  if (!session) {
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url, { status: 303 });
  }

  const formData = await req.formData();
  const targetPeran = String(formData.get("peran") ?? "") as Peran;
  const targetSekolahId = String(formData.get("sekolahId") ?? "");

  const cocok = (session.perans ?? []).find(
    (p) => p.peran === targetPeran && p.sekolahId === targetSekolahId
  );
  if (!cocok) {
    url.pathname = HOME_BY_ROLE[session.peran];
    url.search = "?error=1";
    return NextResponse.redirect(url, { status: 303 });
  }

  await createSession({ ...session, peran: cocok.peran, sekolahId: cocok.sekolahId });
  url.pathname = HOME_BY_ROLE[cocok.peran];
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
