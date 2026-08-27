import { getSession } from "@/lib/auth";
import { getConsentPDP, getAnakDariOrtu } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { NAV_ORTU, ROLE_LABEL } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Pill } from "@/components/ui/Pill";
import { formatTanggal } from "@/lib/utils";

export default async function ConsentPage() {
  const session = await getSession();
  if (!session) return null;

  const [consent, anak] = await Promise.all([
    getConsentPDP(session.userId),
    getAnakDariOrtu(session.userId),
  ]);

  return (
    <AppShell
      groups={NAV_ORTU}
      activeHref="/ortu/consent"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Privasi Data Anak"
      pageSubtitle="Persetujuan pemrosesan data — sesuai UU Pelindungan Data Pribadi (UU PDP)"
    >
      <div className="bg-paper-raised border border-rule rounded-xl p-6 max-w-xl">
        <h3 className="text-base font-semibold mb-3">Data yang kami kelola untuk {anak.map((a) => a.nama).join(", ")}</h3>
        <ul className="text-sm text-ink-soft list-disc pl-5 mb-5 flex flex-col gap-1.5">
          <li>Data identitas (nama, NISN, kelas)</li>
          <li>Data kehadiran &amp; nilai akademik</li>
          <li>Hasil ujian/tugas yang dikerjakan</li>
          <li>Riwayat pembayaran SPP terkait anak Anda</li>
        </ul>
        <p className="text-sm text-ink-soft mb-5">
          Data ini digunakan sekolah untuk keperluan administrasi akademik &amp; komunikasi dengan Anda. Data tidak pernah dibagikan ke pihak ketiga tanpa izin, dan tersimpan di server Indonesia.
        </p>

        {consent?.disetujui ? (
          <Callout>✓ Anda sudah menyetujui pemrosesan data pada {formatTanggal(consent.waktuPersetujuan!)} (versi kebijakan {consent.versiKebijakan}).</Callout>
        ) : (
          <Callout tone="warn">Anda belum memberi persetujuan — sebagian fitur yang butuh data anak mungkin terbatas.</Callout>
        )}

        <form action="/api/consent" method="POST" className="mt-5">
          <label className="flex items-start gap-3 text-sm mb-4">
            <input type="checkbox" name="disetujui" defaultChecked={consent?.disetujui ?? false} className="mt-1 w-4 h-4 accent-[color:var(--primary)]" />
            <span>
              Saya memberikan persetujuan eksplisit atas pemrosesan data anak saya sebagaimana dijelaskan di atas, terpisah dari syarat &amp; ketentuan umum penggunaan aplikasi.
            </span>
          </label>
          <Button type="submit">Simpan pilihan</Button>
        </form>
      </div>

      {consent && (
        <div className="mt-4">
          <Pill tone={consent.disetujui ? "ok" : "warn"}>{consent.disetujui ? "Disetujui" : "Belum disetujui"}</Pill>
        </div>
      )}
    </AppShell>
  );
}
