import { useRef, useState } from 'react'
import type { Session } from '../../db/db'
import { deleteSet, restoreSession, updateSet } from '../../db/actions'
import { useData } from '../../hooks/useData'
import { useToast } from '../../components/Toast'
import { Sheet } from '../../components/Sheet'
import { Stepper } from '../../components/Stepper'
import { IconTrash } from '../../components/Icons'

interface Props {
  session: Session
  seId: string
  setId: string
  onClose: () => void
}

/** Modifier ou supprimer une série. Chaque changement est enregistré tout de suite. */
export function EditSetSheet({ session, seId, setId, onClose }: Props) {
  const { exMap } = useData()
  const toast = useToast()
  const se = session.exercises.find((e) => e.id === seId)
  const index = se?.sets.findIndex((s) => s.id === setId) ?? -1
  const set = se?.sets[index]
  const snapshot = useRef(structuredClone(session))
  const changed = useRef(false)
  const [vals, setVals] = useState({ weight: set?.weight ?? 0, reps: set?.reps ?? 1 })
  const ex = se ? exMap.get(se.exerciseId) : undefined

  if (!se || !set || !ex) return null
  const n = index + 1

  const update = (patch: Partial<typeof vals>) => {
    setVals((v) => ({ ...v, ...patch }))
    changed.current = true
    updateSet(session.id, seId, setId, patch)
  }
  const close = () => {
    onClose()
    if (changed.current) toast.show(`Série ${n} modifiée`, () => restoreSession(snapshot.current))
  }
  const remove = async () => {
    onClose()
    await deleteSet(session.id, seId, setId)
    toast.show(`Série ${n} supprimée`, () => restoreSession(snapshot.current))
  }

  return (
    <Sheet open onClose={close} label={`Modifier la série ${n}`}>
      <div className="flex flex-col gap-3 px-4 pt-1 pb-2">
        <div className="px-1 pt-1">
          <h2 className="text-[22px] font-extrabold tracking-tight">Série {n}</h2>
          <p className="mt-0.5 text-[15px] text-muted">{ex.name}</p>
        </div>
        <Stepper
          label={ex.bodyweight ? 'Lest' : 'Poids'}
          unit="kg"
          decimal
          step={2.5}
          max={999}
          stepLabel="2,5 kg"
          value={vals.weight}
          onChange={(weight) => update({ weight })}
        />
        <Stepper
          label="Répétitions"
          step={1}
          min={1}
          max={999}
          stepLabel="1 répétition"
          value={vals.reps}
          onChange={(reps) => update({ reps })}
        />
        <div className="mt-1 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={remove}
            className="press flex h-14 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[#4a2a27] bg-[#241614] text-[16px] font-bold text-danger"
          >
            <IconTrash size={20} />
            Supprimer
          </button>
          <button type="button" onClick={close} className="press h-14 rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink">
            OK
          </button>
        </div>
        <p className="text-center text-[13px] text-muted">Les changements sont enregistrés automatiquement.</p>
      </div>
    </Sheet>
  )
}
