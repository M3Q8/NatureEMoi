import { useState } from 'react'
import { ExerciseProgress } from './ExerciseProgress'
import { WeekProgress } from './WeekProgress'
import { BodyWeightProgress } from './BodyWeightProgress'
import { readLS, writeLS } from './storage'

const VIEWS = [
  { id: 'exercice', label: 'Exercice' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'poids', label: 'Poids' },
] as const
type View = (typeof VIEWS)[number]['id']

export function ProgresScreen() {
  const [view, setView] = useState<View>(() => {
    const v = readLS('muscu.progres.view')
    return VIEWS.some((x) => x.id === v) ? (v as View) : 'exercice'
  })

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-area pt-safe flex flex-1 flex-col gap-3 px-4 pb-24">
        <h1 className="mx-1 mt-3 mb-1 text-[34px] font-extrabold tracking-tight">Progrès</h1>
        <div role="tablist" aria-label="Affichage" className="grid grid-cols-3 gap-1 rounded-[14px] border border-[#24262b] bg-surface p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={v.id === view}
              onClick={() => {
                setView(v.id)
                writeLS('muscu.progres.view', v.id)
              }}
              className={`h-11 rounded-[10px] text-[15px] font-bold transition-colors ${v.id === view ? 'bg-ink text-bg' : 'text-muted active:text-ink'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {view === 'exercice' && <ExerciseProgress />}
        {view === 'semaine' && <WeekProgress />}
        {view === 'poids' && <BodyWeightProgress />}
      </div>
    </div>
  )
}
