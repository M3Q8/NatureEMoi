import { useRef, useState } from 'react'
import type { Session } from '../../db/db'
import { deleteSet, restoreSession, updateSet } from '../../db/actions'
import { useData } from '../../hooks/useData'
import { useToast } from '../../components/Toast'
import { Sheet } from '../../components/Sheet'
import { SetInputs } from '../../components/SetInputs'
import { Switch } from '../../components/Switch'
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
  const set = se?.sets.find((s) => s.id === setId)
  const snapshot = useRef(structuredClone(session))
  const changed = useRef(false)
  const [vals, setVals] = useState({ weight: set?.weight ?? 0, reps: set?.reps ?? 1, warmup: !!set?.warmup })
  const ex = se ? exMap.get(se.exerciseId) : undefined

  if (!se || !set || !ex) return null
  const n = se.sets.filter((s) => !s.warmup || s.id === setId).findIndex((s) => s.id === setId) + 1
  const title = vals.warmup ? 'Échauffement' : `Série ${n}`

  const update = (patch: Partial<typeof vals>) => {
    setVals((v) => ({ ...v, ...patch }))
    changed.current = true
    updateSet(session.id, seId, setId, patch)
  }
  const close = () => {
    onClose()
    if (changed.current) toast.show('Série modifiée', () => restoreSession(snapshot.current))
  }
  const remove = async () => {
    onClose()
    await deleteSet(session.id, seId, setId)
    toast.show(vals.warmup ? 'Échauffement supprimé' : 'Série supprimée', () => restoreSession(snapshot.current))
  }

  return (
    <Sheet open onClose={close} label={`Modifier : ${title}`}>
      <div className="flex flex-col gap-3 px-4 pt-1 pb-2">
        <div className="px-1 pt-1">
          <h2 className="text-[22px] font-extrabold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-[15px] text-muted">{ex.name}</p>
        </div>
        <SetInputs ex={ex} weight={vals.weight} reps={vals.reps} onChange={update} />
        <Switch
          label="Série d’échauffement"
          hint="Ne compte pas dans les records ni le volume"
          checked={vals.warmup}
          onChange={(warmup) => update({ warmup })}
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
