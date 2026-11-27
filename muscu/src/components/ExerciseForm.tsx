import { useState } from 'react'
import { MUSCLE_GROUPS, type MuscleGroup } from '../db/db'
import { useData } from '../hooks/useData'
import { normalize } from '../lib/format'

export interface ExerciseValues {
  name: string
  group: MuscleGroup
  bodyweight: boolean
}

interface Props {
  initial: ExerciseValues
  submitLabel: string
  onSubmit: (v: ExerciseValues) => void
  onCancel: () => void
  /** id de l'exercice modifié (pour ne pas se signaler soi-même comme doublon) */
  editingId?: string
}

/** Formulaire nom + groupe musculaire + poids du corps. */
export function ExerciseForm({ initial, submitLabel, onSubmit, onCancel, editingId }: Props) {
  const { exercises } = useData()
  const [v, setV] = useState(initial)
  const name = v.name.trim()
  const duplicate = exercises.some((e) => !e.archived && e.id !== editingId && normalize(e.name) === normalize(name))
  const canSubmit = name.length > 0 && !duplicate

  return (
    <form
      className="flex flex-col gap-4 px-4 pt-1 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) onSubmit({ ...v, name })
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">Nom</span>
        <input
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          placeholder="Ex : Hack squat"
          autoCapitalize="sentences"
          enterKeyHint="done"
          className="h-[52px] rounded-[14px] border border-line bg-well px-3.5 text-[17px] text-ink outline-none focus:border-accent"
        />
        {duplicate && <span className="px-1 text-[14px] text-danger">Un exercice porte déjà ce nom.</span>}
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 px-1 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">Groupe musculaire</legend>
        <div className="grid grid-cols-3 gap-2">
          {MUSCLE_GROUPS.map((g) => {
            const on = v.group === g
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                onClick={() => setV({ ...v, group: g })}
                className={`press h-11 rounded-xl text-[15px] font-semibold ${on ? 'bg-ink text-bg' : 'bg-control text-ink'}`}
              >
                {g}
              </button>
            )
          })}
        </div>
      </fieldset>

      <button
        type="button"
        role="switch"
        aria-checked={v.bodyweight}
        onClick={() => setV({ ...v, bodyweight: !v.bodyweight })}
        className="press flex min-h-[60px] items-center justify-between gap-3 rounded-2xl bg-raised px-4 text-left"
      >
        <span className="flex flex-col">
          <span className="text-[17px] font-semibold">Au poids du corps</span>
          <span className="text-[13px] text-muted">Le poids saisi est un lest (0 = sans lest)</span>
        </span>
        <span className={`flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors ${v.bodyweight ? 'bg-accent' : 'bg-[#3a3d44]'}`}>
          <span className={`h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${v.bodyweight ? 'translate-x-5' : ''}`} />
        </span>
      </button>

      <div className="mt-1 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onCancel} className="press h-14 rounded-2xl bg-control text-[17px] font-bold">
          Annuler
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="press h-14 rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
