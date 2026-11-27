import type { Exercise, SessionExercise, WorkSet } from '../../db/db'
import { IconCheck, IconNote, IconTarget } from '../../components/Icons'
import { fmtDate, fmtSet, plural, summarizeSets } from '../../lib/format'
import type { Suggestion } from '../../lib/stats'

interface Props {
  se: SessionExercise
  ex: Exercise
  active: boolean
  live: boolean
  last: { date: number; sets: WorkSet[] } | null
  suggestion: Suggestion | null
  onActivate: () => void
  onEditSet: (setId: string) => void
  onRemove: () => void
  onEditNote: () => void
  onApplySuggestion: () => void
}

/** Un exercice de la séance. Ouvert = celui en cours de saisie (avec ses séries) ; replié sinon. */
export function ExerciseCard(props: Props) {
  const { se, ex, active, live, last, suggestion, onActivate, onEditSet, onRemove, onEditNote, onApplySuggestion } = props
  const lastText = last ? summarizeSets(last.sets, ex) : null
  const workCount = se.sets.filter((s) => !s.warmup).length

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
          {workCount > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-muted">
              <IconCheck size={18} className="text-accent" />
              {plural(workCount, 'série', 'séries')}
            </span>
          )}
        </span>
        <span className="mt-1 block text-[15px] text-muted">
          {workCount > 0
            ? summarizeSets(se.sets, ex)
            : se.sets.length > 0
              ? 'Échauffement fait'
              : lastText
                ? `Dernière fois : ${lastText}`
                : 'Pas encore de série'}
        </span>
      </button>
    )
  }

  const now = Date.now()
  let workIndex = 0
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

      {suggestion && (
        <button
          type="button"
          onClick={onApplySuggestion}
          className="press mt-2 flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-[#3a4a14] bg-[#151a08] py-1.5 pr-1.5 pl-3 text-left"
        >
          <IconTarget size={18} className="shrink-0 text-accent" />
          <span className="flex-1 text-[14px] leading-snug text-soft">
            Objectif : <strong className="text-ink">{suggestion.label}</strong>
          </span>
          <span className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-[13px] font-extrabold text-accent-ink">Appliquer</span>
        </button>
      )}

      <button
        type="button"
        onClick={onEditNote}
        className="mt-1 flex min-h-11 w-full items-center gap-2 text-left text-[14px] text-muted active:text-ink"
      >
        <IconNote size={17} className="shrink-0" />
        {ex.note ? <span className="line-clamp-2 text-soft italic">{ex.note}</span> : <span>Ajouter une note</span>}
      </button>

      {se.sets.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-2" aria-label="Séries">
          {se.sets.map((s) => {
            const n = s.warmup ? null : ++workIndex
            const text = fmtSet(s, ex)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onEditSet(s.id)}
                  aria-label={`${n ? `Série ${n}` : 'Échauffement'} : ${text}. Modifier`}
                  className={`press flex h-11 items-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold active:bg-control ${
                    s.warmup ? 'border border-dashed border-[#5a4a20] text-soft' : 'bg-[#23252a]'
                  } ${now - s.at < 1500 ? 'animate-pop' : ''}`}
                >
                  <span className={`text-[13px] font-bold ${s.warmup ? 'text-gold' : 'text-muted'}`}>{n ?? 'É'}</span>
                  {text}
                </button>
              </li>
            )
          })}
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
