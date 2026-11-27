import type { Exercise, SessionExercise, WorkSet } from '../../db/db'
import { IconCheck } from '../../components/Icons'
import { fmtDate, fmtSetWeight, plural, summarizeSets } from '../../lib/format'

interface Props {
  se: SessionExercise
  ex: Exercise
  active: boolean
  live: boolean
  last: { date: number; sets: WorkSet[] } | null
  onActivate: () => void
  onEditSet: (setId: string) => void
  onRemove: () => void
}

/** Un exercice de la séance. Ouvert = celui en cours de saisie (avec ses séries) ; replié sinon. */
export function ExerciseCard({ se, ex, active, live, last, onActivate, onEditSet, onRemove }: Props) {
  const lastText = last ? summarizeSets(last.sets, ex.bodyweight) : null

  if (!active) {
    return (
      <button
        type="button"
        id={`se-${se.id}`}
        onClick={onActivate}
        className="press w-full rounded-[18px] border border-[#24262b] bg-surface px-4 py-3.5 text-left active:bg-raised"
      >
        <span className="flex items-center justify-between gap-3">
          <strong className="text-[17px] font-bold">{ex.name}</strong>
          {se.sets.length > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-muted">
              <IconCheck size={18} className="text-accent" />
              {plural(se.sets.length, 'série', 'séries')}
            </span>
          )}
        </span>
        <span className="mt-1 block text-[15px] text-muted">
          {se.sets.length > 0
            ? summarizeSets(se.sets, ex.bodyweight)
            : lastText
              ? `Dernière fois : ${lastText}`
              : 'Pas encore de série'}
        </span>
      </button>
    )
  }

  const now = Date.now()
  return (
    <section
      id={`se-${se.id}`}
      aria-label={`${ex.name}${live ? ', en cours' : ''}`}
      className="animate-fade rounded-[18px] border-2 border-accent bg-surface px-4 pt-3.5 pb-1.5"
    >
      <button type="button" onClick={onActivate} className="flex w-full items-center justify-between gap-3 text-left">
        <h2 className="text-[17px] font-extrabold">{ex.name}</h2>
        {live && (
          <span className="shrink-0 rounded-lg bg-accent px-2 py-1 text-[12px] font-extrabold tracking-[0.06em] text-accent-ink uppercase">
            En cours
          </span>
        )}
      </button>
      <p className="mt-1.5 text-[14px] leading-snug text-muted">
        {lastText ? (
          <>
            Dernière fois : <strong className="font-semibold text-ink">{lastText}</strong>
            <span> · {fmtDate(last!.date)}</span>
          </>
        ) : (
          'Première fois sur cet exercice'
        )}
      </p>
      {se.sets.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Séries">
          {se.sets.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onEditSet(s.id)}
                aria-label={`Série ${i + 1} : ${fmtSetWeight(s.weight, ex.bodyweight)} × ${s.reps}. Modifier`}
                className={`press flex h-11 items-center gap-2 rounded-xl bg-[#23252a] px-3.5 text-[15px] font-semibold active:bg-control ${now - s.at < 1500 ? 'animate-pop' : ''}`}
              >
                <span className="text-[13px] font-bold text-muted">{i + 1}</span>
                {fmtSetWeight(s.weight, ex.bodyweight)} × {s.reps}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={onRemove} className="press h-11 px-1 text-[14px] font-semibold text-muted active:text-ink">
          Retirer l’exercice
        </button>
      </div>
    </section>
  )
}
