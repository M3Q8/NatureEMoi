import { isTimed, type Exercise } from '../../db/db'
import type { RestTimer } from '../../hooks/useRestTimer'
import { SetInputs } from '../../components/SetInputs'
import { IconClose, IconPlates, IconPlus, IconTimer } from '../../components/Icons'
import { fmtSeconds } from '../../lib/format'

export interface Draft {
  weight: number
  reps: number
  warmup?: boolean
}

interface Props {
  ex: Exercise
  /** numéro de la prochaine série de travail */
  setNumber: number
  draft: Draft
  onDraft: (d: Draft) => void
  onAdd: () => void
  rest: RestTimer | null
  onPlates: () => void
}

function RestStrip({ rest }: { rest: RestTimer }) {
  const small = 'press flex h-11 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold'
  return (
    <div
      role="timer"
      aria-live="off"
      className={`flex items-center gap-1.5 rounded-2xl py-1.5 pr-1.5 pl-3 transition-colors ${rest.done ? 'animate-flash bg-accent text-accent-ink' : 'bg-well text-ink'}`}
    >
      <IconTimer size={22} className={rest.done ? '' : 'text-accent'} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pl-1">
        <span className="text-[13px] leading-none font-bold">{rest.done ? 'Repos terminé !' : 'Repos'}</span>
        {!rest.done && (
          <span className="h-1.5 overflow-hidden rounded-full bg-control">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${rest.progress * 100}%` }} />
          </span>
        )}
      </div>
      <span className="min-w-[3.4ch] text-right text-[26px] leading-none font-extrabold">{fmtSeconds(rest.remaining)}</span>
      {!rest.done && (
        <>
          <button type="button" onClick={() => rest.add(-15)} aria-label="15 secondes de moins" className={`${small} w-11 bg-control`}>
            −15
          </button>
          <button type="button" onClick={() => rest.add(15)} aria-label="15 secondes de plus" className={`${small} w-11 bg-control`}>
            +15
          </button>
        </>
      )}
      <button
        type="button"
        onClick={rest.stop}
        aria-label="Arrêter le minuteur"
        className={`${small} w-11 ${rest.done ? 'bg-accent-ink/10' : 'bg-control'}`}
      >
        <IconClose size={18} />
      </button>
    </div>
  )
}

/** Panneau de saisie, toujours au même endroit en bas de l'écran (à portée de pouce). */
export function SetDock({ ex, setNumber, draft, onDraft, onAdd, rest, onPlates }: Props) {
  const showPlates = !ex.bodyweight && !isTimed(ex)
  return (
    <div className="flex flex-col gap-2.5 rounded-t-3xl border-t border-line bg-surface px-4 pt-3 pb-3.5 shadow-[0_-12px_32px_rgba(0,0,0,0.45)]">
      {rest?.active && <RestStrip rest={rest} />}
      <div className="flex items-center gap-2 pl-1">
        <strong className="min-w-0 flex-1 truncate text-[16px] font-bold">{ex.name}</strong>
        {showPlates && (
          <button
            type="button"
            onClick={onPlates}
            className="press flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-control px-3 text-[13px] font-bold"
          >
            <IconPlates size={18} className="text-accent" />
            Disques
          </button>
        )}
        <button
          type="button"
          aria-pressed={!!draft.warmup}
          onClick={() => onDraft({ ...draft, warmup: !draft.warmup })}
          className={`press h-11 shrink-0 rounded-xl border px-3 text-[13px] font-bold ${
            draft.warmup ? 'border-gold bg-[#2a2210] text-gold' : 'border-transparent bg-control text-muted'
          }`}
        >
          Échauffement
        </button>
      </div>
      <SetInputs ex={ex} weight={draft.weight} reps={draft.reps} onChange={(p) => onDraft({ ...draft, ...p })} />
      <button
        type="button"
        onClick={onAdd}
        className={`press flex h-[60px] items-center justify-center gap-2.5 rounded-[18px] text-[18px] font-extrabold ${
          draft.warmup ? 'bg-gold text-accent-ink active:bg-[#e69e1c]' : 'bg-accent text-accent-ink active:bg-[#b3db2b]'
        }`}
      >
        <IconPlus size={22} strokeWidth={3} />
        {draft.warmup ? 'Ajouter l’échauffement' : `Ajouter la série ${setNumber}`}
      </button>
    </div>
  )
}
