import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "selaras_session";
const secretKey = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-ganti-di-produksi-selaras-ajar"
);

const HOME_BY_ROLE: Record<string, string> = {
  KEPALA_SEKOLAH: "/kepsek",
  BENDAHARA: "/keuangan",
  GURU: "/guru",
  ORANG_TUA: "/ortu",
  MURID: "/murid",
};

const ROLE_BY_PATH_PREFIX: { prefix: string; roles: string[] }[] = [
  { prefix: "/kepsek", roles: ["KEPALA_SEKOLAH"] },
  { prefix: "/keuangan", roles: ["KEPALA_SEKOLAH", "BENDAHARA"] },
  { prefix: "/guru", roles: ["GURU"] },
  { prefix: "/ortu", roles: ["ORANG_TUA"] },
  { prefix: "/murid", roles: ["MURID"] },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const matched = ROLE_BY_PATH_PREFIX.find((r) => pathname.startsWith(r.prefix));
  if (!matched) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const peran = payload.peran as string;

    if (!matched.roles.includes(peran)) {
      const url = req.nextUrl.clone();
      url.pathname = HOME_BY_ROLE[peran] ?? "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/kepsek/:path*", "/keuangan/:path*", "/guru/:path*", "/ortu/:path*", "/murid/:path*"],
};
