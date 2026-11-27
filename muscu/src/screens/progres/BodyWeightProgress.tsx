import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { addBodyWeight, deleteBodyWeight, restoreBodyWeight } from '../../db/actions'
import { useToast } from '../../components/Toast'
import { Sheet } from '../../components/Sheet'
import { Stepper } from '../../components/Stepper'
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '../../components/Icons'
import { fmtDate, fmtDayShort, fmtKg, fmtNum1 } from '../../lib/format'
import type { MetricDef } from '../../lib/stats'
import { ProgressChart } from './ProgressChart'

const DEF: MetricDef = { key: 'maxWeight', label: 'Poids', unit: 'kg' }

/** Courbe du poids du corps, noté de temps en temps. */
export function BodyWeightProgress() {
  const toast = useToast()
  const entries = useLiveQuery(() => db.bodyweights.orderBy('date').toArray(), [])
  const [adding, setAdding] = useState(false)
  const [kg, setKg] = useState(75)

  if (!entries) return null
  const last = entries[entries.length - 1]
  const first = entries[0]
  const delta = last && first ? last.kg - first.kg : 0

  const open = () => {
    setKg(last?.kg ?? 75)
    setAdding(true)
  }
  const save = async () => {
    setAdding(false)
    const { entry, replaced } = await addBodyWeight(kg)
    toast.show(`${fmtKg(entry.kg)} noté`, () => (replaced ? restoreBodyWeight(replaced) : deleteBodyWeight(entry.id)))
  }

  return (
    <>
      <section aria-label="Poids du corps" className="flex flex-col gap-1.5 rounded-[18px] border border-[#24262b] bg-surface p-4">
        {last ? (
          <>
            <span className="text-[14px] font-semibold text-muted">Poids · {fmtDate(last.date)}</span>
            <span className="text-[36px] leading-tight font-extrabold tracking-tight">{fmtKg(last.kg)}</span>
            {entries.length > 1 && (
              <span className="flex items-center gap-1.5 text-[14px] font-semibold text-soft">
                {delta > 0 && <IconArrowUp size={16} className="text-muted" />}
                {delta < 0 && <IconArrowDown size={16} className="text-muted" />}
                {delta === 0
                  ? `Stable depuis le ${fmtDate(first.date)}`
                  : `${delta > 0 ? '+' : '−'}${fmtNum1(Math.abs(delta))} kg depuis le ${fmtDate(first.date)}`}
              </span>
            )}
            {entries.length > 1 && (
              <div className="mt-2 -ml-1">
                <ProgressChart data={entries.map((e) => ({ date: e.date, value: e.kg }))} def={DEF} />
              </div>
            )}
          </>
        ) : (
          <p className="py-4 text-center text-[16px] leading-relaxed text-muted">
            Note ton poids de temps en temps
            <br />
            pour voir sa courbe ici.
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={open}
        className="press flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink"
      >
        <IconPlus size={22} strokeWidth={3} />
        Noter mon poids
      </button>

      {entries.length > 0 && (
        <section aria-label="Dernières mesures" className="flex flex-col gap-1.5">
          <h2 className="mx-1 mt-3 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">Dernières mesures</h2>
          <ul className="flex flex-col gap-px overflow-hidden rounded-2xl bg-line">
            {entries
              .slice(-10)
              .reverse()
              .map((e) => (
                <li key={e.id} className="flex min-h-14 items-center gap-3 bg-surface py-1 pr-1 pl-4">
                  <span className="flex-1 text-[15px] text-soft">{fmtDayShort(e.date)}</span>
                  <span className="text-[17px] font-bold">{fmtKg(e.kg)}</span>
                  <button
                    type="button"
                    aria-label={`Supprimer la mesure du ${fmtDate(e.date)}`}
                    onClick={async () => {
                      const before = await deleteBodyWeight(e.id)
                      if (before) toast.show('Mesure supprimée', () => restoreBodyWeight(before))
                    }}
                    className="press flex h-11 w-11 items-center justify-center rounded-lg text-muted active:text-danger"
                  >
                    <IconTrash size={18} />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {adding && (
        <Sheet open onClose={() => setAdding(false)} label="Noter mon poids">
          <div className="flex flex-col gap-3 px-4 pt-1 pb-2">
            <div className="px-1 pt-1">
              <h2 className="text-[22px] font-extrabold tracking-tight">Mon poids aujourd’hui</h2>
              <p className="mt-0.5 text-[15px] text-muted">Une seule mesure par jour : la dernière remplace la précédente.</p>
            </div>
            <Stepper label="Poids" unit="kg" decimal step={0.1} min={20} max={400} stepLabel="100 grammes" value={kg} onChange={setKg} />
            <button type="button" onClick={save} className="press mt-1 h-14 rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink">
              Noter {fmtKg(kg)}
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
