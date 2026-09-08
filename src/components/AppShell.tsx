import { Suspense } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { GantiPasswordForm } from "@/components/GantiPasswordForm";
import { ValidasiFormProvider } from "@/components/ValidasiFormProvider";
import { Sidebar, NavLinks } from "@/components/Sidebar";
import { getSession } from "@/lib/auth";
import { getAccountBadge } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/nav";
import { NotifBell } from "@/components/NotifBell";
import {
  getNotifikasi,
  getNotifikasiUnreadCount,
  syncNotifikasiAbsensiBelum,
  syncNotifikasiReminderGuru,
  syncNotifikasiTugasJatuhTempo,
  syncNotifikasiTagihanOrtu,
  syncNotifikasiTagihanBendahara,
  syncNotifikasiHasilUjianMurid,
  syncNotifikasiHasilUjianOrtu,
} from "@/lib/notifikasi";
import type { Notifikasi } from "@/generated/prisma/client";

export type NavItem = { href: string; label: string; icon: string };
export type NavGroup = { label?: string; items: NavItem[] };

export async function AppShell({
  groups,
  activeHref,
  userName,
  userRoleLabel,
  pageTitle,
  pageSubtitle,
  headerAction,
  showBack = true,
  lebarPenuh = false,
  children,
}: {
  groups: NavGroup[];
  activeHref: string;
  userName: string;
  userRoleLabel: string;
  pageTitle: string;
  pageSubtitle?: string;
  headerAction?: React.ReactNode;
  /** Sembunyikan tombol "Kembali" — cuma dipakai di halaman beranda/dashboard tiap peran (§5.5). */
  showBack?: boolean;
  /** 1.15 — lepas batas max-w-[1100px] default, dipakai utk halaman tabel lebar (mis. daftar sekolah dgn banyak kolom) supaya benar-benar mengisi layar, bukan cuma di area sempit lalu sisa layar kosong. */
  lebarPenuh?: boolean;
  children: React.ReactNode;
}) {
  const session = await getSession();
  const badge = session ? await getAccountBadge(session) : null;
  // 1.20 — peran lain (selain yg sedang aktif) yg dimiliki akun ini, utk tombol switch-role.
  const peranLain = session
    ? (session.perans ?? []).filter(
        (p) => !(p.peran === session.peran && p.sekolahId === session.sekolahId)
      )
    : [];
  // Sinkronisasi notifikasi state-based (absensi belum, reminder guru, tugas jatuh tempo, tagihan)
  // dijalankan di SETIAP render AppShell (bukan cuma dashboard) utk peran yg relevan — padanan
  // evaluator live prototipe yang dihitung ulang tiap panel bell dibuka, cuma titik hitungnya
  // dipindah ke sini krn gak ada infra cron. Query di-scope per akun, murah (lihat notifikasi.ts).
  if (session) {
    if (session.peran === "GURU") {
      await Promise.all([syncNotifikasiAbsensiBelum(session.userId), syncNotifikasiReminderGuru(session.userId)]);
    } else if (session.peran === "MURID") {
      await Promise.all([syncNotifikasiTugasJatuhTempo(session.userId), syncNotifikasiHasilUjianMurid(session.userId)]);
    } else if (session.peran === "ORANG_TUA") {
      await Promise.all([syncNotifikasiTagihanOrtu(session.userId), syncNotifikasiHasilUjianOrtu(session.userId)]);
    } else if (session.peran === "BENDAHARA" || session.peran === "KEPALA_SEKOLAH") {
      await syncNotifikasiTagihanBendahara(session.userId, session.sekolahId);
    }
  }

  // Notifikasi bell — panel cuma butuh preview beberapa item teratas (NotifBell yg motong ke
  // PANEL_MAKS), tapi query semua sekalian di sini lebih simpel drpd tambah parameter limit;
  // jumlah baris per pengguna kecil (auto-resolve tiap kondisi clear, bukan log tanpa batas).
  const [notifRows, unreadCount] = session
    ? await Promise.all([getNotifikasi(session.userId), getNotifikasiUnreadCount(session.userId)])
    : [[], 0];
  const notifItems = notifRows.map((n: Notifikasi) => ({
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
    <div className="flex min-h-screen">
      <ValidasiFormProvider />
      {/* 1.16 — sidebar penuh cuma di layar md+; di layar sempit digantikan menu hamburger di header.
          Bisa diciutkan jadi mode ikon-saja (Sidebar.tsx, client component, preferensi di localStorage). */}
      <Sidebar groups={groups} activeHref={activeHref} />

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 md:px-7 py-3.5 md:py-4 border-b border-rule bg-paper sticky top-0 z-10 flex-wrap">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <details className="md:hidden relative shrink-0">
              <summary className="list-none cursor-pointer w-9 h-9 flex items-center justify-center rounded-lg border border-rule text-lg select-none">
                ☰
              </summary>
              <div className="fixed inset-0 z-30" style={{ top: "56px" }}>
                <div className="absolute left-0 top-0 bottom-0 w-64 max-w-[80vw] bg-paper-sunken border-r border-rule p-3.5 flex flex-col gap-1.5 overflow-y-auto shadow-lg">
                  <NavLinks groups={groups} activeHref={activeHref} />
                </div>
              </div>
            </details>
            {showBack && <BackButton />}
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl truncate">{pageTitle}</h1>
              {pageSubtitle && (
                <p className="text-xs text-ink-soft mt-0.5 truncate">{pageSubtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 md:gap-3 w-full md:w-auto md:shrink-0">
            {headerAction}
            <NotifBell initial={notifItems} unreadCount={unreadCount} />
            <AccountMenu
              userName={userName}
              userRoleLabel={userRoleLabel}
              detail={badge?.detail ?? null}
              fotoUrl={badge?.fotoUrl ?? null}
              peranLain={peranLain}
            />
          </div>
        </div>
        <main className={"p-4 md:p-7 w-full " + (lebarPenuh ? "max-w-none" : "max-w-[1100px]")}>{children}</main>
      </div>
    </div>
  );
}

function AccountMenu({
  userName,
  userRoleLabel,
  detail,
  fotoUrl,
  peranLain,
}: {
  userName: string;
  userRoleLabel: string;
  detail: string | null;
  fotoUrl: string | null;
  /** 1.20 — peran lain yg dimiliki akun ini (selain yg sedang aktif), utk tombol switch-role. */
  peranLain: { peran: string; sekolahId: string }[];
}) {
  const inisial = userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer flex items-center gap-2 select-none">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt={userName} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-primary-tint text-primary-deep flex items-center justify-center font-serif font-bold text-xs shrink-0">
            {inisial}
          </span>
        )}
      </summary>
      <div className="absolute right-0 mt-2 w-64 bg-paper-raised border border-rule rounded-xl shadow-lg p-3.5 z-20">
        <div className="flex items-center gap-2.5 mb-1">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt={userName} className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <span className="w-10 h-10 rounded-full bg-primary-tint text-primary-deep flex items-center justify-center font-serif font-bold text-sm shrink-0">
              {inisial}
            </span>
          )}
          <div className="min-w-0">
            <b className="block text-[13px] text-ink truncate">{userName}</b>
            <span className="text-xs text-ink-soft">{userRoleLabel}</span>
          </div>
        </div>
        {detail && <p className="text-xs text-ink-soft mt-1.5 mb-1">{detail}</p>}

        {peranLain.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-rule flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-ink-soft">Ganti peran</span>
            {peranLain.map((p) => (
              <form key={`${p.peran}|${p.sekolahId}`} action="/api/auth/switch-role" method="POST">
                <input type="hidden" name="peran" value={p.peran} />
                <input type="hidden" name="sekolahId" value={p.sekolahId} />
                <button
                  type="submit"
                  className="w-full text-xs font-semibold text-primary-deep bg-primary-tint rounded-lg px-3 py-1.5 hover:brightness-95"
                >
                  ⇄ Jadi {ROLE_LABEL[p.peran] ?? p.peran}
                </button>
              </form>
            ))}
          </div>
        )}

        <form action="/api/akun/foto" method="POST" encType="multipart/form-data" className="mt-2.5 pt-2.5 border-t border-rule flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-ink-soft">Ganti foto profil</span>
          {/* <label htmlFor=...> menjamin klik membuka pemilih berkas OS di semua browser — lebih
              andal daripada mengandalkan tombol native <input type=file> yang kecil & gampang
              meleset diklik, apalagi di dalam dropdown <details> yang sempit (1.9, diperbaiki). */}
          <label
            htmlFor="input-foto-akun"
            className="cursor-pointer text-xs bg-paper border border-rule rounded-lg px-3 py-1.5 text-center hover:bg-paper-sunken"
          >
            📷 Pilih dari galeri/berkas…
          </label>
          <input id="input-foto-akun" type="file" name="foto" accept="image/*" required className="hidden" />
          <button type="submit" className="text-xs font-semibold text-primary-deep hover:underline self-start">
            Unggah
          </button>
        </form>

        <details className="mt-2.5 pt-2.5 border-t border-rule">
          <summary className="cursor-pointer text-[11px] font-semibold text-ink-soft list-none">Ganti password</summary>
          <Suspense fallback={null}>
            <GantiPasswordForm />
          </Suspense>
        </details>

        <form action="/api/auth/logout" method="POST" className="mt-2.5 pt-2.5 border-t border-rule">
          <button className="text-xs text-ink-soft hover:text-warning underline">
            Keluar
          </button>
        </form>
      </div>
    </details>
  );
}
