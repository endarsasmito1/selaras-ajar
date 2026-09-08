import { NextRequest, NextResponse } from "next/server";
import { loginWithCredentials, HOME_BY_ROLE } from "@/lib/auth";
import { isLoginLocked, recordLoginFailure, clearLoginFailures, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = "/login";

  // Rate limit (Sep 2026, feedback teknis) — lockout per-email (cegah brute-force 1 akun) DAN
  // per-IP (cegah password-spraying byk akun berbeda dari 1 sumber) sebelum sempat cek password.
  const ip = getClientIp(req);
  if (isLoginLocked(email) || isLoginLocked(`ip:${ip}`)) {
    url.search = "?error=locked";
    return NextResponse.redirect(url, { status: 303 });
  }

  const user = email && password ? await loginWithCredentials(email, password) : null;

  if (!user) {
    recordLoginFailure(email);
    recordLoginFailure(`ip:${ip}`);
    url.search = "?error=1";
    return NextResponse.redirect(url, { status: 303 });
  }

  clearLoginFailures(email);
  clearLoginFailures(`ip:${ip}`);
  url.pathname = HOME_BY_ROLE[user.peran];
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
