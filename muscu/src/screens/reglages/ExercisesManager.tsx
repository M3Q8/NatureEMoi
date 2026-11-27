import { useState } from 'react'
import { MUSCLE_GROUPS, type Exercise } from '../../db/db'
import { createExercise, deleteExercise, restoreExercise, updateExercise } from '../../db/actions'
import { useData } from '../../hooks/useData'
import { useToast } from '../../components/Toast'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { ExerciseForm } from '../../components/ExerciseForm'
import { IconChevronLeft, IconPencil, IconPlus, IconTrash } from '../../components/Icons'

/** Ajouter, renommer ou supprimer ses exercices. */
export function ExercisesManager({ onBack }: { onBack: () => void }) {
  const { exercises } = useData()
  const toast = useToast()
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Exercise | null>(null)

  const visible = exercises.filter((e) => !e.archived)
  const groups = MUSCLE_GROUPS.map((g) => ({
    group: g,
    items: visible.filter((e) => e.group === g).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  })).filter((g) => g.items.length > 0)

  const remove = async (ex: Exercise) => {
    const res = await deleteExercise(ex.id)
    toast.show(
      res === 'archived' ? `${ex.name} supprimé (historique conservé)` : `${ex.name} supprimé`,
      () => restoreExercise(ex),
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-area pt-safe flex-1 px-4 pb-6">
        <button
          type="button"
          onClick={onBack}
          className="press -ml-1 flex h-11 items-center gap-0.5 pr-3 text-[16px] font-semibold text-accent"
        >
          <IconChevronLeft size={22} />
          Réglages
        </button>
        <h1 className="mx-1 mt-1 mb-1 text-[30px] font-extrabold tracking-tight">Mes exercices</h1>
        <p className="mx-1 mb-2 text-[14px] text-muted">Touche un exercice pour le renommer ou le supprimer.</p>

        {groups.map((g) => (
          <section key={g.group} aria-label={g.group}>
            <h2 className="mx-1 mt-4 mb-1.5 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">{g.group}</h2>
            <div className="flex flex-col gap-px overflow-hidden rounded-2xl bg-line">
              {g.items.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEditing(e)}
                  className="flex min-h-14 items-center justify-between gap-3 bg-surface px-4 py-2 text-left active:bg-raised"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[17px] font-semibold">{e.name}</span>
                    {(e.bodyweight || e.custom || (e.kind === 'time' && e.group !== 'Cardio')) && (
                      <span className="text-[13px] text-muted">
                        {[e.kind === 'time' && e.group !== 'Cardio' && 'En durée', e.bodyweight && 'Poids du corps', e.custom && 'Ajouté par toi']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </span>
                  <IconPencil size={18} className="shrink-0 text-muted" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="relative shrink-0 px-4 pt-2 pb-3">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="press flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink"
        >
          <IconPlus size={22} strokeWidth={3} />
          Nouvel exercice
        </button>
      </div>

      {creating && (
        <Sheet open onClose={() => setCreating(false)} label="Nouvel exercice">
          <h2 className="px-5 pt-2 pb-3 text-[22px] font-extrabold tracking-tight">Nouvel exercice</h2>
          <div className="scroll-area">
            <ExerciseForm
              initial={{ name: '', group: 'Pectoraux', bodyweight: false }}
              submitLabel="Créer"
              onCancel={() => setCreating(false)}
              onSubmit={async (v) => {
                setCreating(false)
                await createExercise(v)
                toast.show(`${v.name} ajouté`)
              }}
            />
          </div>
        </Sheet>
      )}

      {editing && (
        <Sheet open onClose={() => setEditing(null)} label={`Modifier ${editing.name}`}>
          <h2 className="px-5 pt-2 pb-3 text-[22px] font-extrabold tracking-tight">Modifier l’exercice</h2>
          <div className="scroll-area">
            <ExerciseForm
              editingId={editing.id}
              initial={{ name: editing.name, group: editing.group, bodyweight: editing.bodyweight, kind: editing.kind ?? 'reps', note: editing.note ?? '' }}
              submitLabel="Valider"
              onCancel={() => setEditing(null)}
              onSubmit={async (v) => {
                const before = editing
                setEditing(null)
                await updateExercise(before.id, { ...v, note: v.note?.trim() ? v.note : undefined })
                toast.show('Exercice modifié', () => restoreExercise(before))
              }}
            />
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(editing)
                  setEditing(null)
                }}
                className="press mt-1 flex h-12 w-full items-center justify-center gap-2 text-[15px] font-semibold text-danger"
              >
                <IconTrash size={18} />
                Supprimer l’exercice
              </button>
            </div>
          </div>
        </Sheet>
      )}

      <ConfirmSheet
        open={!!confirmDelete}
        title={`Supprimer « ${confirmDelete?.name ?? ''} » ?`}
        message="Il disparaîtra de la liste. S’il apparaît dans tes anciennes séances, elles sont conservées."
        confirmLabel="Supprimer l’exercice"
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}
