import { useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import { fmtDate, fmtInt, fmtNum1, plural } from '../../lib/format'
import { addDays, countInMonth, groupWeek, startOfWeek, weeklyAverage, weeklyCounts } from '../../lib/stats'

/** Régularité et répartition par groupe musculaire. */
export function WeekProgress() {
  const { sessions, exMap } = useData()
  const [lastWeek, setLastWeek] = useState(false)
  const done = useMemo(() => sessions.filter((s) => s.endedAt !== null), [sessions])

  const now = Date.now()
  const weeks = weeklyCounts(done, now, 12)
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count))
  const monthCount = countInMonth(done, now)
  const avg = weeklyAverage(done, now)

  const weekStart = lastWeek ? addDays(startOfWeek(now), -7) : startOfWeek(now)
  const groups = groupWeek(done.concat(sessions.filter((s) => s.endedAt === null)), exMap, weekStart)
  const maxSets = Math.max(1, ...groups.map((g) => g.sets))

  return (
    <>
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

      <section aria-label="Séries par groupe musculaire" className="flex flex-col gap-3 rounded-[18px] border border-[#24262b] bg-surface px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-muted">Séries par groupe musculaire</span>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-well p-1" role="tablist" aria-label="Semaine">
          {[false, true].map((lw) => (
            <button
              key={String(lw)}
              type="button"
              role="tab"
              aria-selected={lastWeek === lw}
              onClick={() => setLastWeek(lw)}
              className={`h-10 rounded-lg text-[14px] font-bold ${lastWeek === lw ? 'bg-ink text-bg' : 'text-muted'}`}
            >
              {lw ? 'Semaine dernière' : 'Cette semaine'}
            </button>
          ))}
        </div>
        <ul className="flex flex-col gap-2.5">
          {groups.map((g) => (
            <li key={g.group} className="flex items-center gap-3">
              <span className={`w-[84px] shrink-0 text-[15px] font-semibold ${g.sets ? 'text-ink' : 'text-muted'}`}>{g.group}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="h-3 overflow-hidden rounded-full bg-well">
                  <span
                    className="block h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: g.sets ? `${Math.max(4, (g.sets / maxSets) * 100)}%` : 0 }}
                  />
                </span>
                {g.volume > 0 && <span className="text-[12px] text-muted">{fmtInt(g.volume)} kg</span>}
              </span>
              <span className={`w-[68px] shrink-0 text-right text-[14px] font-bold ${g.sets ? 'text-ink' : 'text-muted'}`}>
                {g.sets ? plural(g.sets, 'série', 'séries') : '—'}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[12px] leading-relaxed text-muted">Séries de travail (sans l’échauffement), semaine du lundi au dimanche.</p>
      </section>
    </>
  )
}
