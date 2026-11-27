import { useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import { Sheet } from '../../components/Sheet'
import { IconArrowDown, IconArrowUp, IconChevronDown, IconTrophy } from '../../components/Icons'
import { fmtDate, fmtNum1, plural } from '../../lib/format'
import {
  countInMonth, exerciseHistory, fmtMetric, metricsFor, personalRecords, usageByExercise, weeklyAverage, weeklyCounts,
} from '../../lib/stats'
import { ProgressChart } from './ProgressChart'

const LS_KEY = 'muscu.progres.exercise'
const readLS = () => {
  try {
    return localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}
const writeLS = (v: string) => {
  try {
    localStorage.setItem(LS_KEY, v)
  } catch {
    /* navigation privée : sans importance */
  }
}

export function ProgresScreen() {
  const { sessions, exercises } = useData()
  const [chosenId, setChosenId] = useState<string | null>(readLS)
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
  const defs = metricsFor(ex?.bodyweight ?? false)
  const def = defs[metricIdx]
  const records = ex ? personalRecords(history, ex.bodyweight) : []
  const data = history.map((p) => ({ date: p.date, value: Math.round(p.stats[def.key] * 10) / 10 }))
  const first = data[0]
  const last = data[data.length - 1]
  const delta = first && last ? last.value - first.value : 0

  const now = Date.now()
  const weeks = weeklyCounts(done, now, 12)
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count))
  const monthCount = countInMonth(done, now)
  const avg = weeklyAverage(done, now)

  const fmtDelta = () => {
    const abs = Math.abs(delta)
    const txt = def.unit === 'reps' ? plural(Math.round(abs), 'rep', 'reps') : `${fmtNum1(abs)} kg`
    return `${delta > 0 ? '+' : '−'}${txt} depuis le ${fmtDate(first.date)}`
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-area pt-safe flex flex-1 flex-col gap-3 px-4 pb-24">
        <h1 className="mx-1 mt-3 mb-1 text-[34px] font-extrabold tracking-tight">Progrès</h1>

        {!ex ? (
          <p className="mx-1 mt-8 text-center text-[16px] leading-relaxed text-muted">
            Termine ta première séance
            <br />
            pour voir ta progression ici.
          </p>
        ) : (
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

            <div role="tablist" aria-label="Indicateur" className="grid grid-cols-3 gap-1 rounded-[14px] border border-[#24262b] bg-surface p-1">
              {defs.map((d, i) => (
                <button
                  key={d.key}
                  type="button"
                  role="tab"
                  aria-selected={i === metricIdx}
                  onClick={() => setMetricIdx(i)}
                  className={`h-11 rounded-[10px] text-[15px] font-bold transition-colors ${i === metricIdx ? 'bg-ink text-bg' : 'text-muted active:text-ink'}`}
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
                  {delta === 0 ? `Stable depuis le ${fmtDate(first.date)}` : fmtDelta()}
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
            <div className="grid grid-cols-3 gap-2">
              {records.map((r) => (
                <div key={r.def.key} className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-[#24262b] bg-surface p-3">
                  <span className="text-[12px] font-semibold text-muted">{r.def.label}</span>
                  <span className="truncate text-[18px] font-extrabold">{r.value > 0 ? fmtMetric(r.def, r.value) : '—'}</span>
                  <span className="text-[12px] text-muted">{r.value > 0 ? fmtDate(r.date) : 'pas encore'}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="mx-1 mt-3 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">Régularité</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-2xl border border-[#24262b] bg-surface p-3.5">
            <span className="text-[13px] font-semibold text-muted">Ce mois-ci</span>
            <span className="text-[24px] font-extrabold">
              {monthCount} <span className="text-[15px] font-semibold text-muted">{monthCount > 1 ? 'séances' : 'séance'}</span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl border border-[#24262b] bg-surface p-3.5">
            <span className="text-[13px] font-semibold text-muted">Moyenne</span>
            <span className="text-[24px] font-extrabold">
              {fmtNum1(avg)} <span className="text-[15px] font-semibold text-muted">/ semaine</span>
            </span>
          </div>
        </div>
        <section aria-label="Séances par semaine, 12 dernières semaines" className="flex flex-col gap-2 rounded-[18px] border border-[#24262b] bg-surface px-4 py-3.5">
          <span className="text-[14px] font-semibold text-muted">Séances par semaine</span>
          <div className="flex h-[104px] items-end gap-1.5">
            {weeks.map((w, i) => (
              <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[12px] font-bold text-soft">{w.count || ''}</span>
                <div
                  title={`Semaine du ${fmtDate(w.weekStart)} : ${w.count}`}
                  className={`w-full rounded-t ${i === weeks.length - 1 ? 'bg-accent' : 'bg-accent-dim'}`}
                  style={{ height: w.count ? `${(w.count / maxWeek) * 80}px` : '3px', opacity: w.count ? 1 : 0.35 }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[12px] text-muted">
            <span>il y a 11 sem.</span>
            <span>cette semaine</span>
          </div>
        </section>
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
                    writeLS(e.id)
                    setChoosing(false)
                  }}
                  className={`flex min-h-14 items-center justify-between gap-3 px-4 py-2 text-left active:bg-control ${e.id === ex?.id ? 'bg-control' : 'bg-raised'}`}
                >
                  <span className="text-[17px] font-semibold">{e.name}</span>
                  <span className="shrink-0 text-[13px] text-muted">{plural(usage.get(e.id)!.count, 'séance', 'séances')}</span>
                </button>
              ))}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
