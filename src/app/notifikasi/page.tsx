import { getSession } from "@/lib/auth";
import { getNotifikasi } from "@/lib/notifikasi";
import type { Notifikasi } from "@/generated/prisma/client";
import { AppShell } from "@/components/AppShell";
import { navGroupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { NotifPageClient } from "@/components/NotifPageClient";

// Satu halaman dipakai bersama SEMUA peran (bukan folder per-role kayak prototipe
// guru/murid/ortu/notifikasi.html) — kontennya cuma daftar milik akun yg login, jadi gak ada
// alasan duplikasi 7 file identik. Lihat ROLE_BY_PATH_PREFIX di lib/auth.ts & proxy.ts.
export default async function NotifikasiPage() {
  const session = await getSession();
  if (!session) return null;

  const rows = await getNotifikasi(session.userId);
  const items = rows.map((n: Notifikasi) => ({
    id: n.id,
    tipe: n.tipe,
    judul: n.judul,
    deskripsi: n.deskripsi,
    href: n.href,
    prioritas: n.prioritas,
    dibacaPada: n.dibacaPada ? n.dibacaPada.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <AppShell
      groups={navGroupsForPeran(session.peran)}
      activeHref="/notifikasi"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Semua Notifikasi"
      pageSubtitle="Riwayat lengkap — panel bell di topbar cuma menampilkan beberapa item terbaru"
    >
      <NotifPageClient initial={items} />
    </AppShell>
  );
}
