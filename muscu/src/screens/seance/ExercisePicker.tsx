import { useMemo, useState } from 'react'
import { MUSCLE_GROUPS, type Exercise } from '../../db/db'
import { createExercise } from '../../db/actions'
import { useData } from '../../hooks/useData'
import { Sheet } from '../../components/Sheet'
import { ExerciseForm } from '../../components/ExerciseForm'
import { IconPlus, IconSearch } from '../../components/Icons'
import { normalize, summarizeSets } from '../../lib/format'
import { lastPerformance, usageByExercise } from '../../lib/stats'

interface Props {
  onClose: () => void
  onPick: (exerciseId: string) => void
  /** exercices déjà présents dans la séance */
  inSession: Set<string>
}

/** Liste des exercices : récents d'abord, puis par groupe musculaire, avec recherche. */
export function ExercisePicker({ onClose, onPick, inSession }: Props) {
  const { exercises, sessions } = useData()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)

  const usage = useMemo(() => usageByExercise(sessions), [sessions])
  const visible = useMemo(() => exercises.filter((e) => !e.archived), [exercises])
  const count = (e: Exercise) => usage.get(e.id)?.count ?? 0
  const byUse = (a: Exercise, b: Exercise) => count(b) - count(a) || a.name.localeCompare(b.name, 'fr')

  const sections = useMemo(() => {
    const nq = normalize(q)
    if (nq) {
      const hits = visible
        .filter((e) => normalize(e.name).includes(nq))
        .sort((a, b) => Number(normalize(b.name).startsWith(nq)) - Number(normalize(a.name).startsWith(nq)) || byUse(a, b))
      return hits.length ? [{ title: 'Résultats', items: hits, recent: false }] : []
    }
    const recents = visible
      .filter((e) => usage.has(e.id) && !inSession.has(e.id))
      .sort((a, b) => usage.get(b.id)!.lastUsed - usage.get(a.id)!.lastUsed)
      .slice(0, 6)
    const groups = MUSCLE_GROUPS.map((g) => ({
      title: g as string,
      items: visible.filter((e) => e.group === g).sort(byUse),
      recent: false,
    })).filter((s) => s.items.length > 0)
    return recents.length ? [{ title: 'Récents', items: recents, recent: true }, ...groups] : groups
  }, [q, visible, usage, inSession])

  const subtitle = (e: Exercise, recent: boolean): string | null => {
    if (inSession.has(e.id)) return 'Déjà dans la séance'
    if (recent) {
      const last = lastPerformance(sessions, e.id, Infinity)
      if (last) return `Dernière fois : ${summarizeSets(last.sets, e)}`
    }
    const tags = [e.kind === 'time' && e.group !== 'Cardio' && 'En durée', e.bodyweight && 'Poids du corps'].filter(Boolean).join(' · ')
    if (q) return e.group + (tags ? ` · ${tags.toLowerCase()}` : '')
    return tags || null
  }

  const trimmed = q.trim()

  return (
    <Sheet open full onClose={onClose} label="Ajouter un exercice">
      {creating ? (
        <>
          <h2 className="px-5 pt-2 pb-3 text-[22px] font-extrabold tracking-tight">Nouvel exercice</h2>
          <div className="scroll-area flex-1">
            <ExerciseForm
              initial={{ name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1), group: 'Pectoraux', bodyweight: false }}
              submitLabel="Créer et ajouter"
              onCancel={() => setCreating(false)}
              onSubmit={async (v) => onPick(await createExercise(v))}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-4 pt-1 pb-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[22px] font-extrabold tracking-tight">Ajouter un exercice</h2>
              <button type="button" onClick={onClose} className="press -mr-1 h-11 px-2 text-[16px] font-bold text-accent">
                Fermer
              </button>
            </div>
            <label className="flex h-[52px] items-center gap-2.5 rounded-[14px] border border-line bg-well px-3.5 focus-within:border-accent">
              <IconSearch size={20} className="shrink-0 text-muted" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (ex : couché)"
                aria-label="Rechercher un exercice"
                enterKeyHint="search"
                autoCorrect="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none"
              />
            </label>
          </div>

          <div className="scroll-area flex flex-1 flex-col gap-1.5 px-4 pb-4">
            {sections.map((sec) => (
              <section key={sec.title} aria-label={sec.title}>
                <h3 className="mx-1 mt-3 mb-1.5 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">{sec.title}</h3>
                <div className="flex flex-col gap-px overflow-hidden rounded-2xl bg-line">
                  {sec.items.map((e) => {
                    const sub = subtitle(e, sec.recent)
                    const already = inSession.has(e.id)
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onPick(e.id)}
                        className="flex min-h-14 items-center justify-between gap-3 bg-raised px-4 py-2 text-left active:bg-control"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[17px] font-semibold">{e.name}</span>
                          {sub && <span className={`truncate text-[13px] ${already ? 'text-accent' : 'text-muted'}`}>{sub}</span>}
                        </span>
                        <IconPlus size={22} className="shrink-0 text-accent" />
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
            {sections.length === 0 && <p className="mx-1 my-6 text-center text-[16px] text-muted">Aucun exercice ne correspond.</p>}
          </div>

          <div className="shrink-0 border-t border-[#26282d] px-4 pt-2.5">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="press flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-control px-4 text-[16px] font-bold"
            >
              <IconPlus size={20} className="shrink-0 text-accent" />
              <span className="truncate">{trimmed ? `Créer « ${trimmed} »` : 'Créer un exercice'}</span>
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
