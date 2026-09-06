/** Standarisasi "belum ada data" yang sebelumnya ad-hoc tersebar (teks polos beda-beda tiap
 * halaman) — dipakai sapu bertahap ke halaman yang masih pakai teks manual. */
export function EmptyState({
  icon = "—",
  title,
  hint,
}: {
  icon?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="text-center py-12 px-5 text-ink-soft">
      <div className="text-3xl mb-2.5 opacity-60" aria-hidden="true">{icon}</div>
      <div className="font-serif text-base text-ink mb-1.5">{title}</div>
      {hint && <div className="text-sm">{hint}</div>}
    </div>
  );
}
