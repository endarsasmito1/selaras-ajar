import { getSession } from "@/lib/auth";
import { getDaftarSiswa, getDaftarSiswaHierarkis } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { groupsForPeran, ROLE_LABEL } from "@/lib/nav";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { PengumumanWidget } from "@/components/PengumumanWidget";
import { HasilPencarianTable } from "./HasilPencarianTable";

export default async function DataSiswaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; impor_dibuat?: string; impor_diperbarui?: string; siswa_diubah?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const params = await searchParams;
  const q = (params.q ?? "").toLowerCase().trim();

  return (
    <AppShell
      groups={groupsForPeran(session.peran)}
      activeHref="/kepsek/siswa"
      userName={session.nama}
      userRoleLabel={ROLE_LABEL[session.peran]}
      pageTitle="Data Siswa"
      pageSubtitle="Disusun hierarkis per kelas — pilih kelas untuk lihat performa & siswanya (K-4)"
      headerAction={
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/kepsek/siswa/riwayat" variant="ghost" size="sm">Riwayat Siswa</LinkButton>
          <LinkButton href="/kepsek/siswa/mutasi" variant="ghost" size="sm">Mutasi</LinkButton>
          <LinkButton href="/kepsek/ekspor" size="sm">Ekspor / Impor CSV</LinkButton>
        </div>
      }
    >
      {params.impor_dibuat !== undefined && (
        <Callout>
          ✓ Impor selesai — {params.impor_dibuat} siswa baru dibuat, {params.impor_diperbarui} siswa diperbarui. Data hasil impor tetap bisa diedit satu per satu.
        </Callout>
      )}
      {params.siswa_diubah && <div className="mb-4"><Callout>✓ Data siswa &quot;{params.siswa_diubah}&quot; diperbarui.</Callout></div>}

      {session.peran === "TU" && <div className="mb-5"><PengumumanWidget sekolahId={session.sekolahId} /></div>}

      <form method="GET" className="mb-5">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Cari nama, NISN, atau kelas… (mengabaikan hierarki kelas)"
          className="bg-paper-raised border border-rule rounded-lg px-3.5 py-2 text-sm w-80"
        />
      </form>

      {q ? <HasilPencarian sekolahId={session.sekolahId} q={q} /> : <DaftarKelas sekolahId={session.sekolahId} />}
    </AppShell>
  );
}

async function DaftarKelas({ sekolahId }: { sekolahId: string }) {
  const hierarki = await getDaftarSiswaHierarkis(sekolahId);
  return (
    <div className="grid md:grid-cols-2 gap-3.5">
      {hierarki.map(({ kelas, waliKelas, siswa }) => (
        <a key={kelas.id} href={`/kepsek/siswa/kelas/${kelas.id}`} className="block">
          <Card className="hover:border-primary">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold">Kelas {kelas.nama}</h3>
              <Pill tone="info">{siswa.length} siswa</Pill>
            </div>
            <p className="text-xs text-ink-soft">Wali kelas: {waliKelas?.nama ?? "belum ditentukan"}</p>
          </Card>
        </a>
      ))}
      {hierarki.length === 0 && <p className="text-sm text-ink-soft">Belum ada kelas.</p>}
    </div>
  );
}

async function HasilPencarian({ sekolahId, q }: { sekolahId: string; q: string }) {
  const semuaSiswa = await getDaftarSiswa(sekolahId);
  const siswa = semuaSiswa.filter(
    (s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q) || s.kelas.nama.toLowerCase().includes(q)
  );
  return <HasilPencarianTable siswa={siswa} />;
}
