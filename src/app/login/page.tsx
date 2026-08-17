import { Button } from "@/components/ui/Button";

const DEMO_ACCOUNTS = [
  { email: "hendra@selarasajar.demo", label: "Pak Hendra", role: "Kepala Sekolah", icon: "🏫" },
  { email: "tuti@selarasajar.demo", label: "Bu Tuti", role: "Bendahara / TU", icon: "₽" },
  { email: "rina@selarasajar.demo", label: "Bu Rina", role: "Guru · Wali Kelas 5B", icon: "👩‍🏫" },
  { email: "fauzan@selarasajar.demo", label: "Bpk. Fauzan", role: "Orang Tua (wali Ahmad Fauzi)", icon: "👨‍👩‍👧" },
  { email: "ahmad@selarasajar.demo", label: "Ahmad Fauzi", role: "Murid · Kelas 5B", icon: "🎒" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-[860px] grid md:grid-cols-2 gap-8 items-start">
        {/* Login form */}
        <div className="bg-paper-raised border border-rule rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-[3px] bg-accent inline-block" />
            <span className="font-serif font-bold text-lg text-primary-deep">
              Selaras Ajar
            </span>
          </div>
          <h1 className="text-2xl mt-3">Masuk ke akun Anda</h1>
          <p className="text-sm text-ink-soft mt-1 mb-6">
            Sistem sekolah yang selaras — untuk kepala sekolah, guru, orang tua, dan murid.
          </p>

          {params.error && (
            <div className="bg-warning-tint text-warning text-sm rounded-lg px-4 py-3 mb-4">
              Email atau kata sandi salah. Coba lagi.
            </div>
          )}

          <form action="/api/auth/login" method="POST" className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="nama@sekolah.id"
                className="bg-paper border border-rule rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" htmlFor="password">
                Kata sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="bg-paper border border-rule rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <Button type="submit" className="mt-1.5 w-full">
              Masuk
            </Button>
          </form>

          <p className="text-xs text-ink-soft mt-5">
            Semua akun demo pakai kata sandi: <code className="bg-paper-sunken px-1.5 py-0.5 rounded">selaras123</code>
          </p>
        </div>

        {/* Demo quick login */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary-deep mb-3">
            Coba cepat — akun demo
          </p>
          <div className="flex flex-col gap-2.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <form action="/api/auth/login" method="POST" key={acc.email}>
                <input type="hidden" name="email" value={acc.email} />
                <input type="hidden" name="password" value="selaras123" />
                <button className="w-full flex items-center gap-3 bg-paper-raised border border-rule rounded-xl px-4 py-3 text-left hover:border-primary hover:bg-primary-tint/40 transition-colors">
                  <span className="text-xl">{acc.icon}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{acc.label}</span>
                    <span className="block text-xs text-ink-soft">{acc.role}</span>
                  </span>
                  <span className="text-ink-soft text-sm">→</span>
                </button>
              </form>
            ))}
          </div>
          <p className="text-xs text-ink-soft mt-4">
            Klik salah satu untuk langsung masuk sebagai peran itu — tak perlu ketik apapun.
          </p>
        </div>
      </div>
    </div>
  );
}
