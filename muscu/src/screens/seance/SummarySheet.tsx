import { useState } from 'react'
import type { Session } from '../../db/db'
import { createTemplate, resumeSession } from '../../db/actions'
import { useData } from '../../hooks/useData'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { IconCheck, IconPlus, IconTrophy } from '../../components/Icons'
import { fmtDayLong, fmtDuration, fmtInt, fmtTime, plural } from '../../lib/format'
import { fmtMetric, recordsBroken, sessionTotals } from '../../lib/stats'

/** Petit résumé de fin de séance. */
export function SummarySheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const { sessions, exMap } = useData()
  const toast = useToast()
  const [naming, setNaming] = useState(false)
  const [saved, setSaved] = useState(false)
  const t = sessionTotals(session, exMap)
  const exerciseIds = session.exercises.filter((e) => e.sets.length > 0).map((e) => e.exerciseId)
  const defaultName = [...new Set(exerciseIds.map((id) => exMap.get(id)?.group).filter(Boolean))].slice(0, 3).join(' · ')
  const [name, setName] = useState(defaultName)
  const records = recordsBroken(session, sessions, exMap)
  const recordCount = records.reduce((n, r) => n + r.items.length, 0)

  const tiles = [
    { label: 'Durée', value: fmtDuration(t.durationMs) },
    { label: 'Exercices', value: fmtInt(t.exerciseCount) },
    { label: 'Séries', value: fmtInt(t.setCount) },
    { label: 'Volume total', value: fmtInt(t.volume), unit: 'kg' },
  ]

  return (
    <Sheet open full onClose={onClose} label="Séance terminée">
      <div className="scroll-area flex flex-1 flex-col gap-5 px-4 pt-6 pb-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="animate-pop flex h-[76px] w-[76px] items-center justify-center rounded-full bg-accent text-accent-ink">
            <IconCheck size={40} strokeWidth={3} />
          </div>
          <h2 className="text-[30px] font-extrabold tracking-tight">Séance terminée</h2>
          <p className="text-[15px] text-muted">
            {fmtDayLong(session.startedAt)} · {fmtTime(session.startedAt)} – {fmtTime(session.endedAt ?? Date.now())}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {tiles.map((x) => (
            <div key={x.label} className="flex flex-col gap-1 rounded-[18px] border border-[#24262b] bg-raised px-4 py-3.5">
              <span className="text-[13px] font-semibold text-muted">{x.label}</span>
              <span className="text-[28px] font-extrabold">
                {x.value}
                {x.unit && <span className="text-[17px] font-semibold text-muted"> {x.unit}</span>}
              </span>
            </div>
          ))}
        </div>

        {records.length > 0 ? (
          <section aria-labelledby="records" className="flex flex-col gap-3 rounded-[18px] border border-[#4a3a16] bg-[#1f1a10] p-4">
            <h3 id="records" className="flex items-center gap-2.5 text-[17px] font-extrabold text-gold">
              <IconTrophy size={22} />
              {recordCount > 1 ? `${recordCount} records battus` : '1 record battu'}
            </h3>
            {records.map((r, i) => (
              <div key={r.exerciseId} className={`flex flex-col gap-1 ${i > 0 ? 'border-t border-[#3a2f15] pt-3' : ''}`}>
                <strong className="text-[16px] font-bold">{r.name}</strong>
                {r.items.map((it) => (
                  <div key={it.def.key} className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] text-[#c9c2b0]">{it.def.label}</span>
                    <span className="text-[18px] font-extrabold whitespace-nowrap">{fmtMetric(it.def, it.value)}</span>
                  </div>
                ))}
              </div>
            ))}
          </section>
        ) : (
          <p className="text-center text-[15px] text-muted">
            Pas de nouveau record cette fois, mais {plural(t.setCount, 'série de plus', 'séries de plus')} au compteur.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1 px-4 pt-2">
        {naming ? (
          <form
            className="mb-2 flex flex-col gap-2 rounded-[18px] bg-raised p-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const n = name.trim() || 'Ma séance'
              await createTemplate(n, exerciseIds)
              setNaming(false)
              setSaved(true)
              toast.show(`Séance type « ${n} » enregistrée`)
            }}
          >
            <label className="px-1 text-[13px] font-bold tracking-[0.06em] text-muted uppercase" htmlFor="tpl-name">
              Nom de la séance type
            </label>
            <div className="flex gap-2">
              <input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                enterKeyHint="done"
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-well px-3 text-[17px] outline-none focus:border-accent"
              />
              <button type="submit" className="press h-12 shrink-0 rounded-xl bg-accent px-4 text-[16px] font-extrabold text-accent-ink">
                Enregistrer
              </button>
            </div>
          </form>
        ) : (
          exerciseIds.length > 0 && (
            <button
              type="button"
              disabled={saved}
              onClick={() => setNaming(true)}
              className="press mb-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-control text-[15px] font-bold disabled:text-muted"
            >
              {saved ? <IconCheck size={18} className="text-accent" /> : <IconPlus size={18} className="text-accent" />}
              {saved ? 'Enregistrée dans « Mes séances types »' : 'Enregistrer comme séance type'}
            </button>
          )
        )}
        <button type="button" onClick={onClose} className="press h-16 rounded-[20px] bg-accent text-[18px] font-extrabold text-accent-ink">
          Fermer
        </button>
        <button
          type="button"
          onClick={async () => {
            await resumeSession(session.id)
            onClose()
          }}
          className="press h-12 text-[15px] font-semibold text-muted"
        >
          Oups, reprendre la séance
        </button>
      </div>
    </Sheet>
  )
}
