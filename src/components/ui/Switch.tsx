/** §6.11 ui-design-system-selaras-ajar.md — toggle on/off buat pengaturan boolean (acak soal,
 * sekali akses, dst). Checkbox asli tetap ada (cuma transparan, BUKAN `sr-only`) — form submission
 * gak berubah, cukup styling di atas `<input type="checkbox">` biasa lewat Tailwind `peer`.
 * `sr-only` diklip jadi 1x1px sehingga area klik aslinya gak nutupin track visual — bikin Playwright
 * (dan pengguna keyboard/switch-access) klik "meleset". `opacity-0` + `absolute inset-0` memastikan
 * input persis menutupi track, tetap gak keliatan, tapi area klik/tap-nya benar. */
export function Switch({
  name,
  defaultChecked = false,
  label,
  hint,
  value = "on",
}: {
  name: string;
  defaultChecked?: boolean;
  label?: string;
  hint?: string;
  value?: string;
}) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <span className="relative inline-block w-10 h-[22px] shrink-0">
        <input
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
        />
        <span className="absolute inset-0 rounded-full bg-paper-sunken peer-checked:bg-primary transition-colors pointer-events-none" />
        <span className="absolute left-0.5 top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all peer-checked:left-[20px] pointer-events-none" />
      </span>
      {(label || hint) && (
        <span className="flex flex-col leading-tight">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {hint && <span className="text-xs text-ink-soft">{hint}</span>}
        </span>
      )}
    </label>
  );
}
