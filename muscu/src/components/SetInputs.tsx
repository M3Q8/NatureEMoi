import { isCardio, isTimed, type Exercise } from '../db/db'
import { fmtSeconds, parseDuration } from '../lib/format'
import { Stepper } from './Stepper'

interface Props {
  ex: Exercise
  weight: number
  reps: number
  onChange: (patch: { weight?: number; reps?: number }) => void
}

/** Les gros boutons − / + adaptés à l'exercice : poids + répétitions, ou durée (+ lest). */
export function SetInputs({ ex, weight, reps, onChange }: Props) {
  const timed = isTimed(ex)
  const cardio = isCardio(ex)
  return (
    <>
      {!(timed && cardio) && (
        <Stepper
          label={ex.bodyweight ? 'Lest' : 'Poids'}
          unit="kg"
          decimal
          step={2.5}
          max={999}
          stepLabel="2,5 kg"
          value={weight}
          onChange={(w) => onChange({ weight: w })}
        />
      )}
      {timed ? (
        <Stepper
          label={cardio ? 'Durée (min)' : 'Durée'}
          step={cardio ? 60 : 5}
          min={cardio ? 60 : 5}
          max={6 * 3600}
          stepLabel={cardio ? '1 minute' : '5 secondes'}
          value={reps}
          format={fmtSeconds}
          parse={(t) => parseDuration(t, cardio)}
          onChange={(r) => onChange({ reps: r })}
        />
      ) : (
        <Stepper
          label="Répétitions"
          step={1}
          min={1}
          max={999}
          stepLabel="1 répétition"
          value={reps}
          onChange={(r) => onChange({ reps: r })}
        />
      )}
    </>
  )
}
