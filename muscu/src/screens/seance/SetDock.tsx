import type { Exercise } from '../../db/db'
import { Stepper } from '../../components/Stepper'
import { IconPlus } from '../../components/Icons'

export interface Draft {
  weight: number
  reps: number
}

interface Props {
  ex: Exercise
  setNumber: number
  draft: Draft
  onDraft: (d: Draft) => void
  onAdd: () => void
}

/** Panneau de saisie, toujours au même endroit en bas de l'écran (à portée de pouce). */
export function SetDock({ ex, setNumber, draft, onDraft, onAdd }: Props) {
  return (
    <div className="flex flex-col gap-2.5 rounded-t-3xl border-t border-line bg-surface px-4 pt-3.5 pb-3.5 shadow-[0_-12px_32px_rgba(0,0,0,0.45)]">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <strong className="truncate text-[16px] font-bold">{ex.name}</strong>
        <span className="shrink-0 text-[14px] font-semibold text-muted">Série {setNumber}</span>
      </div>
      <Stepper
        label={ex.bodyweight ? 'Lest' : 'Poids'}
        unit="kg"
        decimal
        step={2.5}
        max={999}
        stepLabel="2,5 kg"
        value={draft.weight}
        onChange={(weight) => onDraft({ ...draft, weight })}
      />
      <Stepper
        label="Répétitions"
        step={1}
        min={1}
        max={999}
        stepLabel="1 répétition"
        value={draft.reps}
        onChange={(reps) => onDraft({ ...draft, reps })}
      />
      <button
        type="button"
        onClick={onAdd}
        className="press flex h-[60px] items-center justify-center gap-2.5 rounded-[18px] bg-accent text-[18px] font-extrabold text-accent-ink active:bg-[#b3db2b]"
      >
        <IconPlus size={22} strokeWidth={3} />
        Ajouter la série
      </button>
    </div>
  )
}
