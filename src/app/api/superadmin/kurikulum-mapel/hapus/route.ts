import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.peran !== "SUPERADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const formData = await req.formData();
  const kurikulumMapelId = String(formData.get("kurikulumMapelId") ?? "");
  const kurikulumId = String(formData.get("kurikulumId") ?? "");

  await prisma.kurikulumMapel.deleteMany({ where: { id: kurikulumMapelId, kurikulumId } });

  const url = req.nextUrl.clone();
  url.pathname = `/superadmin/kurikulum/${kurikulumId}`;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
