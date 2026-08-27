import { redirect } from "next/navigation";
import { getSession, HOME_BY_ROLE } from "@/lib/auth";
import { LandingPage } from "@/components/LandingPage";

export default async function RootPage() {
  const session = await getSession();
  if (session) redirect(HOME_BY_ROLE[session.peran]);
  return <LandingPage />;
}
