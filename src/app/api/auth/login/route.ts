import { NextRequest, NextResponse } from "next/server";
import { loginWithCredentials, HOME_BY_ROLE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const user = await loginWithCredentials(email, password);

  const url = req.nextUrl.clone();
  if (!user) {
    url.pathname = "/login";
    url.search = "?error=1";
  } else {
    url.pathname = HOME_BY_ROLE[user.peran];
    url.search = "";
  }
  return NextResponse.redirect(url, { status: 303 });
}
