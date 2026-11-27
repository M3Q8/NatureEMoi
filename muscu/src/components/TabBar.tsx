import { IconChart, IconClock, IconDumbbell, IconSliders } from './Icons'

export type Tab = 'seance' | 'historique' | 'progres' | 'reglages'

const TABS = [
  { id: 'seance', label: 'Séance', Icon: IconDumbbell },
  { id: 'historique', label: 'Historique', Icon: IconClock },
  { id: 'progres', label: 'Progrès', Icon: IconChart },
  { id: 'reglages', label: 'Réglages', Icon: IconSliders },
] as const

export function TabBar({ tab, onChange, sessionActive }: { tab: Tab; onChange: (t: Tab) => void; sessionActive: boolean }) {
  return (
    <nav aria-label="Navigation principale" className="pb-safe shrink-0 border-t border-[#26282d] bg-[#111214]">
      <div className="grid h-[58px] grid-cols-4">
        {TABS.map(({ id, label, Icon }) => {
          const on = id === tab
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${on ? 'font-bold text-accent' : 'font-semibold text-muted active:text-ink'}`}
            >
              <span className="relative">
                <Icon size={26} strokeWidth={on ? 2.2 : 2} />
                {id === 'seance' && sessionActive && !on && (
                  <span className="absolute -top-0.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-[#111214]" />
                )}
              </span>
              {label}
              {id === 'seance' && sessionActive && <span className="sr-only">(séance en cours)</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
