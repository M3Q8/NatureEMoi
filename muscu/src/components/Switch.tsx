/** Interrupteur façon iPhone, sur une ligne entière facile à toucher. */
export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="press flex min-h-[60px] w-full items-center justify-between gap-3 rounded-2xl bg-raised px-4 py-2 text-left"
    >
      <span className="flex flex-col">
        <span className="text-[17px] font-semibold">{label}</span>
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </span>
      <span className={`flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors ${checked ? 'bg-accent' : 'bg-[#3a3d44]'}`}>
        <span className={`h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}
