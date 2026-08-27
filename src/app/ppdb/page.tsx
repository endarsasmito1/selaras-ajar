import { PPDBForm } from "./PPDBForm";
import { ValidasiFormProvider } from "@/components/ValidasiFormProvider";

export default async function PPDBPublikPage({
  searchParams,
}: {
  searchParams: Promise<{ sukses?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
      <ValidasiFormProvider />
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-1 justify-center">
          <span className="w-3 h-3 rounded-[3px] bg-accent inline-block" />
          <span className="font-serif font-bold text-lg text-primary-deep">Selaras Ajar</span>
        </div>
        <h1 className="text-2xl text-center mt-3 mb-1">Pendaftaran Siswa Baru</h1>
        <p className="text-sm text-ink-soft text-center mb-6">SD Harapan Bangsa — Tahun Ajaran 2027/2028</p>

        {params.sukses ? (
          <div className="bg-success-tint text-success rounded-xl p-6 text-center">
            <div className="text-2xl mb-2">✓</div>
            <p className="font-semibold mb-1">Pendaftaran terkirim!</p>
            <p className="text-sm">Sekolah akan menghubungi Anda untuk proses selanjutnya.</p>
          </div>
        ) : (
          <PPDBForm />
        )}
      </div>
    </div>
  );
}
