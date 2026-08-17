import Link from "next/link";

export type NavItem = { href: string; label: string; icon: string };
export type NavGroup = { label?: string; items: NavItem[] };

export function AppShell({
  groups,
  activeHref,
  userName,
  userRoleLabel,
  pageTitle,
  pageSubtitle,
  headerAction,
  children,
}: {
  groups: NavGroup[];
  activeHref: string;
  userName: string;
  userRoleLabel: string;
  pageTitle: string;
  pageSubtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-[220px] shrink-0 bg-paper-sunken border-r border-rule p-3.5 flex flex-col gap-1.5">
        <Link
          href="/"
          className="font-serif font-bold text-[17px] text-primary-deep px-2.5 pb-4 pt-1 flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-[3px] bg-accent inline-block" />
          Selaras Ajar
        </Link>

        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && (
              <div className="text-[10px] tracking-wider uppercase text-ink-soft font-bold px-2.5 pt-3.5 pb-1">
                {g.label}
              </div>
            )}
            {g.items.map((item) => {
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] mb-0.5 " +
                    (active
                      ? "bg-primary-tint text-primary-deep font-semibold"
                      : "text-ink-soft hover:bg-paper-raised hover:text-ink")
                  }
                >
                  <span className="w-4 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="flex-1" />

        <div className="border-t border-rule pt-3 mt-2 px-2.5">
          <b className="block text-[13px] text-ink">{userName}</b>
          <span className="text-xs text-ink-soft">{userRoleLabel}</span>
          <form action="/api/auth/logout" method="POST" className="mt-2">
            <button className="text-xs text-ink-soft hover:text-warning underline">
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between gap-4 px-7 py-4 border-b border-rule bg-paper sticky top-0 z-10">
          <div>
            <h1 className="text-xl">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="text-xs text-ink-soft mt-0.5">{pageSubtitle}</p>
            )}
          </div>
          {headerAction}
        </div>
        <div className="p-7 max-w-[1100px] w-full">{children}</div>
      </div>
    </div>
  );
}
