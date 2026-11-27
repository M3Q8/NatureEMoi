import { useMemo, useState } from 'react'
import type { Session } from '../../db/db'
import { useData } from '../../hooks/useData'
import { SessionEditor } from '../seance/SessionEditor'
import { fmtDayShort, fmtDuration, fmtInt, fmtMonth, fmtTime, plural } from '../../lib/format'
import { hasSets, sessionTotals } from '../../lib/stats'

export function HistoriqueScreen() {
  const { sessions, exMap } = useData()
  const [openId, setOpenId] = useState<string | null>(null)

  const months = useMemo(() => {
    const groups: { key: string; label: string; items: Session[] }[] = []
    for (const s of sessions) {
      if (s.endedAt === null || !hasSets(s)) continue
      const d = new Date(s.startedAt)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const last = groups[groups.length - 1]
      if (last?.key === key) last.items.push(s)
      else groups.push({ key, label: fmtMonth(s.startedAt), items: [s] })
    }
    return groups
  }, [sessions])

  const open = openId ? sessions.find((s) => s.id === openId && s.endedAt !== null) : undefined
  if (open) return <SessionEditor key={open.id} session={open} mode="history" onBack={() => setOpenId(null)} />

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-area pt-safe flex-1 px-4 pb-24">
        <h1 className="mx-1 mt-3 mb-2 text-[34px] font-extrabold tracking-tight">Historique</h1>

        {months.length === 0 && (
          <p className="mx-1 mt-10 text-center text-[16px] leading-relaxed text-muted">
            Aucune séance pour l’instant.
            <br />
            Tes séances terminées apparaîtront ici.
          </p>
        )}

        {months.map((m) => (
          <section key={m.key} aria-label={m.label} className="flex flex-col gap-2.5">
            <h2 className="mx-1 mt-4 mb-0.5 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">
              {m.label} · {plural(m.items.length, 'séance', 'séances')}
            </h2>
            {m.items.map((s) => {
              const t = sessionTotals(s)
              const names = s.exercises
                .filter((e) => e.sets.length > 0)
                .map((e) => exMap.get(e.exerciseId)?.name)
                .filter(Boolean)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOpenId(s.id)}
                  className="press flex w-full flex-col gap-1 rounded-[18px] border border-[#24262b] bg-surface px-4 py-3.5 text-left active:bg-raised"
                >
                  <span className="flex w-full items-baseline justify-between gap-3">
                    <strong className="text-[17px] font-bold">
                      {fmtDayShort(s.startedAt)} · {fmtTime(s.startedAt)}
                    </strong>
                    <span className="shrink-0 text-[14px] font-semibold text-muted">{fmtDuration(t.durationMs)}</span>
                  </span>
                  <span className="text-[14px] font-semibold text-soft">
                    {plural(t.exerciseCount, 'exercice', 'exercices')} · {fmtInt(t.volume)} kg
                    {s.demo && <span className="ml-2 rounded-md bg-control px-1.5 py-0.5 text-[12px] font-bold text-muted">démo</span>}
                  </span>
                  <span className="w-full truncate text-[14px] text-muted">{names.join(', ')}</span>
                </button>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
