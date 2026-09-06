/**
 * Padanan `.dropzone` prototipe (assets/styles.css, dipakai persis 1x — guru/bank-soal-impor.html)
 * — kotak putus-putus diklik utk buka file picker. Prototipe juga terima drag&drop file beneran,
 * tapi cuma efek visual (`onchange` sama persis kayak klik biasa) — di sini cukup `<label>` yang
 * membungkus `<input type="file">` tersembunyi, andal di semua browser tanpa perlu JS drag-handler.
 */
export function Dropzone({
  name,
  accept,
  required,
  label = "Klik untuk pilih berkas",
  hint,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  label?: string;
  hint?: string;
}) {
  return (
    <label
      htmlFor={`dropzone-${name}`}
      className="block border-2 border-dashed border-rule rounded-2xl px-6 py-10 text-center bg-paper text-ink-soft cursor-pointer hover:border-primary transition-colors"
    >
      <div className="font-serif text-lg text-ink mb-1.5">📄 {label}</div>
      {hint && <div className="text-sm">{hint}</div>}
      <input id={`dropzone-${name}`} type="file" name={name} accept={accept} required={required} className="hidden" />
    </label>
  );
}
