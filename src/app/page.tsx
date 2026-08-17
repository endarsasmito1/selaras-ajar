import { redirect } from "next/navigation";
import { getSession, HOME_BY_ROLE } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (session) redirect(HOME_BY_ROLE[session.peran]);
  redirect("/login");
}
