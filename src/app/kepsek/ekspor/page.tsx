import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { NAV_KEPSEK, ROLE_LABEL } from "@/lib/nav";
import { Card, CardHead } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export default async function EksporImporPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <AppShell
      groups={NAV_KEPSEK}
      activeHref="/kepsek/ekspor"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Ekspor & Impor Data"
      pageSubtitle="Format cocok Dapodik/e-Rapor — bukan integrasi API langsung (tak ada API resmi pihak ketiga)"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHead title="Ekspor data" subtitle="Unduh file siap diunggah ke aplikasi Dapodik/e-Rapor resmi" />
          <div className="flex flex-col gap-2.5">
            <LinkButton href="/api/ekspor/siswa" variant="ghost">⬇ Ekspor Data Siswa (CSV)</LinkButton>
            <LinkButton href="/api/ekspor/nilai" variant="ghost">⬇ Ekspor Nilai / e-Rapor (CSV)</LinkButton>
          </div>
        </Card>

        <Card>
          <CardHead title="Impor data siswa" subtitle="Ratusan baris sekali unggah — tetap bisa diedit satuan setelahnya" />
          <LinkButton href="/api/impor/siswa/template" variant="ghost" className="mb-4">⬇ Unduh template CSV</LinkButton>
          <form action="/api/impor/siswa/preview" method="POST" encType="multipart/form-data" className="flex flex-col gap-3">
            <input type="file" name="file" accept=".csv" required className="text-sm" />
            <Button type="submit" size="sm">Unggah & periksa</Button>
          </form>
        </Card>
      </div>

      <Callout>
        ℹ️ Setelah diunggah, kamu akan lihat <b>preview</b> dulu (baris valid vs bermasalah) sebelum data benar-benar masuk. Impor ulang file yang sama tidak akan menduplikat — dicocokkan lewat NISN.
      </Callout>
    </AppShell>
  );
}
