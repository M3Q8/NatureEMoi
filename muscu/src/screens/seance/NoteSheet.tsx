import { useEffect, useRef, useState } from 'react'
import type { Exercise } from '../../db/db'
import { setExerciseNote } from '../../db/actions'
import { Sheet } from '../../components/Sheet'

/** Note libre sur un exercice : enregistrée pendant la frappe. */
export function NoteSheet({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const [text, setText] = useState(ex.note ?? '')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(text)
  latest.current = text

  useEffect(
    () => () => {
      clearTimeout(timer.current)
      setExerciseNote(ex.id, latest.current)
    },
    [ex.id],
  )

  return (
    <Sheet open onClose={onClose} label={`Note : ${ex.name}`}>
      <div className="flex flex-col gap-3 px-4 pt-1 pb-2">
        <div className="px-1 pt-1">
          <h2 className="text-[22px] font-extrabold tracking-tight">Note</h2>
          <p className="mt-0.5 text-[15px] text-muted">{ex.name}</p>
        </div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            clearTimeout(timer.current)
            const v = e.target.value
            timer.current = setTimeout(() => setExerciseNote(ex.id, v), 400)
          }}
          rows={4}
          autoFocus
          placeholder="Ex : siège cran 4, prise serrée, douleur épaule gauche…"
          className="min-h-[120px] w-full resize-none rounded-[14px] border border-line bg-well p-3.5 text-[17px] leading-snug text-ink outline-none focus:border-accent"
        />
        <p className="px-1 text-[13px] text-muted">La note s’affiche à chaque fois que tu fais cet exercice. Enregistrée automatiquement.</p>
        <button type="button" onClick={onClose} className="press h-14 rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink">
          OK
        </button>
      </div>
    </Sheet>
  )
}
