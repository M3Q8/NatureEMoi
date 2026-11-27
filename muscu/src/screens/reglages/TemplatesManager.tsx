import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { createTemplate, deleteTemplate, restoreTemplate, updateTemplate } from '../../db/actions'
import { useData } from '../../hooks/useData'
import { useToast } from '../../components/Toast'
import { Sheet } from '../../components/Sheet'
import { IconChevronDown, IconChevronLeft, IconClose, IconPencil, IconPlus, IconTrash } from '../../components/Icons'
import { plural } from '../../lib/format'
import { ExercisePicker } from '../seance/ExercisePicker'

const DEFAULT_NAME = 'Nouvelle séance'

/** Modifier une séance type : nom, exercices et leur ordre. Tout est enregistré au fur et à mesure. */
function TemplateEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { exMap } = useData()
  const toast = useToast()
  const tpl = useLiveQuery(() => db.templates.get(id), [id])
  const [name, setName] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const latest = useRef(tpl)
  latest.current = tpl

  useEffect(() => {
    if (tpl && name === null) setName(tpl.name)
  }, [tpl, name])

  if (!tpl) return null
  const ids = tpl.exerciseIds.filter((x) => exMap.has(x))

  const move = (i: number, dir: -1 | 1) => {
    const next = [...ids]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    updateTemplate(id, { exerciseIds: next })
  }

  const close = async () => {
    const t = latest.current
    // une séance type créée puis laissée vide disparaît d'elle-même
    if (t && t.exerciseIds.length === 0 && (t.name.trim() === '' || t.name === DEFAULT_NAME)) await deleteTemplate(id)
    onClose()
  }

  const remove = async () => {
    const before = await deleteTemplate(id)
    onClose()
    if (before) toast.show(`« ${before.name} » supprimée`, () => restoreTemplate(before))
  }

  return (
    <Sheet open full onClose={close} label="Modifier la séance type">
      <div className="flex items-center justify-between px-5 pt-1 pb-2">
        <h2 className="text-[22px] font-extrabold tracking-tight">Séance type</h2>
        <button type="button" onClick={close} className="press -mr-1 h-11 px-2 text-[16px] font-bold text-accent">
          OK
        </button>
      </div>
      <div className="scroll-area flex flex-1 flex-col gap-4 px-4 pb-4">
        <label className="flex flex-col gap-1.5">
          <span className="px-1 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">Nom</span>
          <input
            value={name ?? ''}
            onChange={(e) => {
              setName(e.target.value)
              updateTemplate(id, { name: e.target.value })
            }}
            onFocus={(e) => name === DEFAULT_NAME && e.currentTarget.select()}
            placeholder="Ex : Pecs, Dos, Jambes…"
            enterKeyHint="done"
            className="h-[52px] rounded-[14px] border border-line bg-well px-3.5 text-[17px] text-ink outline-none focus:border-accent"
          />
        </label>

        <section aria-label="Exercices" className="flex flex-col gap-1.5">
          <h3 className="px-1 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">
            {ids.length ? plural(ids.length, 'exercice', 'exercices') : 'Exercices'}
          </h3>
          {ids.length > 0 && (
            <ol className="flex flex-col gap-px overflow-hidden rounded-2xl bg-line">
              {ids.map((exId, i) => (
                <li key={exId} className="flex min-h-14 items-center gap-1 bg-raised py-1 pr-1 pl-4">
                  <span className="w-6 shrink-0 text-[14px] font-bold text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{exMap.get(exId)!.name}</span>
                  <button
                    type="button"
                    aria-label="Monter"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="press flex h-11 w-10 items-center justify-center rounded-lg text-muted disabled:opacity-25"
                  >
                    <IconChevronDown size={20} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    aria-label="Descendre"
                    disabled={i === ids.length - 1}
                    onClick={() => move(i, 1)}
                    className="press flex h-11 w-10 items-center justify-center rounded-lg text-muted disabled:opacity-25"
                  >
                    <IconChevronDown size={20} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Retirer ${exMap.get(exId)!.name}`}
                    onClick={() => updateTemplate(id, { exerciseIds: ids.filter((x) => x !== exId) })}
                    className="press flex h-11 w-10 items-center justify-center rounded-lg text-muted active:text-danger"
                  >
                    <IconClose size={18} />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="press flex h-14 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#3a3d44] text-[16px] font-bold"
          >
            <IconPlus size={20} className="text-accent" />
            Ajouter un exercice
          </button>
        </section>

        <button type="button" onClick={remove} className="press mt-2 flex h-12 items-center justify-center gap-2 text-[15px] font-semibold text-danger">
          <IconTrash size={18} />
          Supprimer cette séance type
        </button>
      </div>

      {picking && (
        <ExercisePicker
          inSession={new Set(ids)}
          onClose={() => setPicking(false)}
          onPick={(exId) => {
            setPicking(false)
            if (!ids.includes(exId)) updateTemplate(id, { exerciseIds: [...ids, exId] })
          }}
        />
      )}
    </Sheet>
  )
}

/** Liste des séances types (« Pecs », « Jambes »…), lancées en 1 tap depuis l'écran Séance. */
export function TemplatesManager({ onBack }: { onBack: () => void }) {
  const { exMap } = useData()
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []) ?? []
  const [editId, setEditId] = useState<string | null>(null)

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-area pt-safe flex-1 px-4 pb-6">
        <button type="button" onClick={onBack} className="press -ml-1 flex h-11 items-center gap-0.5 pr-3 text-[16px] font-semibold text-accent">
          <IconChevronLeft size={22} />
          Réglages
        </button>
        <h1 className="mx-1 mt-1 mb-1 text-[30px] font-extrabold tracking-tight">Mes séances types</h1>
        <p className="mx-1 mb-4 text-[14px] leading-relaxed text-muted">
          Prépare tes séances (Pecs, Dos, Jambes…) pour les lancer en 1 tap depuis l’écran Séance. Tu peux aussi en
          créer une à la fin d’une séance.
        </p>

        <div className="flex flex-col gap-2.5">
          {templates.map((t) => {
            const names = t.exerciseIds.filter((x) => exMap.has(x)).map((x) => exMap.get(x)!.name)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditId(t.id)}
                className="press flex min-h-[72px] items-center gap-3 rounded-[18px] border border-[#24262b] bg-surface px-4 py-3 text-left active:bg-raised"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="truncate text-[17px] font-bold">{t.name}</strong>
                  <span className="truncate text-[14px] text-muted">{names.length ? names.join(', ') : 'Aucun exercice'}</span>
                </span>
                <IconPencil size={18} className="shrink-0 text-muted" />
              </button>
            )
          })}
          {templates.length === 0 && <p className="mx-1 mt-6 text-center text-[16px] text-muted">Aucune séance type pour l’instant.</p>}
        </div>
      </div>

      <div className="shrink-0 px-4 pt-2 pb-3">
        <button
          type="button"
          onClick={async () => setEditId(await createTemplate(DEFAULT_NAME, []))}
          className="press flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink"
        >
          <IconPlus size={22} strokeWidth={3} />
          Nouvelle séance type
        </button>
      </div>

      {editId && <TemplateEditor key={editId} id={editId} onClose={() => setEditId(null)} />}
    </div>
  )
}
