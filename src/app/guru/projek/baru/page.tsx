import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { NAV_GURU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

const DIMENSI_P5 = [
  "Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia",
  "Berkebinekaan Global",
  "Bergotong Royong",
  "Mandiri",
  "Bernalar Kritis",
  "Kreatif",
];

export default async function ProjekBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { error } = await searchParams;

  return (
    <AppShell
      groups={NAV_GURU}
      activeHref="/guru/projek"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Buat Projek P5"
    >
      {error && <div className="mb-4"><Callout tone="warn">{error}</Callout></div>}
      <form action="/api/projek" method="POST" className="bg-paper-raised border border-rule rounded-xl p-6 max-w-lg flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Tema projek</label>
          <input name="tema" required placeholder="mis. Gaya Hidup Berkelanjutan" className="bg-paper border border-rule rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1.5">Dimensi P5 yang dinilai</label>
          <div className="flex flex-col gap-1.5">
            {DIMENSI_P5.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="dimensi" value={d} />
                {d}
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" className="self-start">Simpan projek</Button>
      </form>
    </AppShell>
  );
}
