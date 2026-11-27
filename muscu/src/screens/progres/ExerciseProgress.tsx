import { useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import { Sheet } from '../../components/Sheet'
import { IconArrowDown, IconArrowUp, IconChevronDown, IconTrophy } from '../../components/Icons'
import { fmtDate, fmtNum1, fmtSeconds, plural } from '../../lib/format'
import { exerciseHistory, fmtMetric, metricsFor, personalRecords, usageByExercise } from '../../lib/stats'
import { ProgressChart } from './ProgressChart'
import { readLS, writeLS } from './storage'

/** Évolution d'un exercice : courbe et records personnels. */
export function ExerciseProgress() {
  const { sessions, exercises } = useData()
  const [chosenId, setChosenId] = useState<string | null>(() => readLS('muscu.progres.exercise'))
  const [metricIdx, setMetricIdx] = useState(1)
  const [choosing, setChoosing] = useState(false)

  const done = useMemo(() => sessions.filter((s) => s.endedAt !== null), [sessions])
  const usage = useMemo(() => usageByExercise(done), [done])
  const candidates = useMemo(
    () => exercises.filter((e) => usage.has(e.id)).sort((a, b) => usage.get(b.id)!.count - usage.get(a.id)!.count),
    [exercises, usage],
  )
  const ex = candidates.find((e) => e.id === chosenId) ?? candidates[0]
  const history = useMemo(() => (ex ? exerciseHistory(done, ex.id) : []), [done, ex])

  if (!ex || history.length === 0) {
    return (
      <p className="mx-1 mt-8 text-center text-[16px] leading-relaxed text-muted">
        Termine ta première séance
        <br />
        pour voir ta progression ici.
      </p>
    )
  }

  const defs = metricsFor(ex)
  const def = defs[Math.min(metricIdx, defs.length - 1)]
  const records = personalRecords(history, ex)
  const data = history.map((p) => ({ date: p.date, value: Math.round(p.stats[def.key] * 10) / 10 }))
  const first = data[0]
  const last = data[data.length - 1]
  const delta = last.value - first.value
  const deltaText = () => {
    const abs = Math.abs(delta)
    const txt = def.unit === 'reps' ? plural(Math.round(abs), 'rep', 'reps') : def.unit === 's' ? fmtSeconds(abs) : `${fmtNum1(abs)} kg`
    return `${delta > 0 ? '+' : '−'}${txt} depuis le ${fmtDate(first.date)}`
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setChoosing(true)}
        aria-label={`Choisir l’exercice : ${ex.name}`}
        className="press flex h-[60px] items-center justify-between rounded-2xl border border-line bg-surface px-4 active:bg-raised"
      >
        <span className="flex min-w-0 flex-col items-start">
          <span className="text-[12px] font-semibold text-muted">Exercice</span>
          <span className="truncate text-[18px] font-bold">{ex.name}</span>
        </span>
        <IconChevronDown size={22} className="shrink-0 text-muted" />
      </button>

      <div role="tablist" aria-label="Indicateur" className="flex gap-2">
        {defs.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={d.key === def.key}
            onClick={() => setMetricIdx(defs.indexOf(d))}
            className={`h-10 flex-1 rounded-full border text-[14px] font-bold transition-colors ${
              d.key === def.key ? 'border-accent bg-[#151a08] text-accent' : 'border-line text-muted active:text-ink'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <section aria-label="Graphique" className="flex flex-col gap-1.5 rounded-[18px] border border-[#24262b] bg-surface p-4">
        <span className="text-[14px] font-semibold text-muted">{def.label} · dernière séance</span>
        <span className="text-[36px] leading-tight font-extrabold tracking-tight">{fmtMetric(def, last.value)}</span>
        {data.length > 1 && (
          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-soft">
            {delta > 0 && <IconArrowUp size={16} className="text-accent" />}
            {delta < 0 && <IconArrowDown size={16} className="text-muted" />}
            {delta === 0 ? `Stable depuis le ${fmtDate(first.date)}` : deltaText()}
          </span>
        )}
        <div className="mt-2 -ml-1">
          <ProgressChart data={data} def={def} />
        </div>
        <p className="sr-only">
          {def.label} de {ex.name} : {data.map((p) => `${fmtDate(p.date)} ${fmtMetric(def, p.value)}`).join(', ')}
        </p>
      </section>

      <h2 className="mx-1 mt-3 flex items-center gap-2 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">
        <IconTrophy size={16} className="text-gold" />
        Records personnels
      </h2>
      <div className={`grid gap-2 ${records.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {records.map((r) => (
          <div key={r.def.key} className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-[#24262b] bg-surface p-3">
            <span className="text-[12px] font-semibold text-muted">{r.def.label}</span>
            <span className="truncate text-[18px] font-extrabold">{r.value > 0 ? fmtMetric(r.def, r.value) : '—'}</span>
            <span className="text-[12px] text-muted">{r.value > 0 ? fmtDate(r.date) : 'pas encore'}</span>
          </div>
        ))}
      </div>

      {choosing && (
        <Sheet open onClose={() => setChoosing(false)} label="Choisir un exercice">
          <h2 className="px-5 pt-2 pb-3 text-[22px] font-extrabold tracking-tight">Choisir un exercice</h2>
          <div className="scroll-area px-4 pb-2">
            <div className="flex flex-col gap-px overflow-hidden rounded-2xl bg-line">
              {candidates.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setChosenId(e.id)
                    writeLS('muscu.progres.exercise', e.id)
                    setChoosing(false)
                  }}
                  className={`flex min-h-14 items-center justify-between gap-3 px-4 py-2 text-left active:bg-control ${e.id === ex.id ? 'bg-control' : 'bg-raised'}`}
                >
                  <span className="text-[17px] font-semibold">{e.name}</span>
                  <span className="shrink-0 text-[13px] text-muted">{plural(usage.get(e.id)!.count, 'séance', 'séances')}</span>
                </button>
              ))}
            </div>
          </div>
        </Sheet>
      )}
    </>
  )
}
