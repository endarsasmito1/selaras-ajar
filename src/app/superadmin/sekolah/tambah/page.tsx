import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { NAV_SUPERADMIN, ROLE_LABEL } from "@/lib/nav";
import { Callout } from "@/components/ui/Callout";
import { TambahSekolahFlow } from "@/components/TambahSekolahFlow";

export default async function TambahSekolahPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  return (
    <AppShell
      groups={NAV_SUPERADMIN}
      activeHref="/superadmin/sekolah"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Tambah Sekolah Baru"
      pageSubtitle="Cari dari database sekolah nasional supaya data lengkap otomatis, atau isi manual"
    >
      {sp.error && <div className="mb-4"><Callout tone="warn">{sp.error}</Callout></div>}
      <TambahSekolahFlow />
    </AppShell>
  );
}
