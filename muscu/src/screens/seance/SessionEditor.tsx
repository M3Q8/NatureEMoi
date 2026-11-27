import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getMeta, isCardio, isTimed, type Exercise, type Session, type SessionExercise } from '../../db/db'
import {
  addExerciseToSession, addSet, deleteSession, finishSession, removeExerciseFromSession, restoreSession,
} from '../../db/actions'
import { useData } from '../../hooks/useData'
import { useNow } from '../../hooks/useNow'
import { useRestTimer } from '../../hooks/useRestTimer'
import { unlockAudio } from '../../lib/sound'
import { useToast, ToastSlot } from '../../components/Toast'
import { ConfirmSheet } from '../../components/Sheet'
import { IconChevronLeft, IconPlus, IconTrash } from '../../components/Icons'
import { fmtDayLong, fmtDuration, fmtTime, plural } from '../../lib/format'
import { lastPerformance, suggestNext } from '../../lib/stats'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePicker } from './ExercisePicker'
import { EditSetSheet } from './EditSetSheet'
import { SetDock, type Draft } from './SetDock'
import { NoteSheet } from './NoteSheet'
import { PlatesSheet } from './PlatesSheet'

interface Props {
  session: Session
  /** live = séance en cours ; history = séance passée, modifiée après coup */
  mode: 'live' | 'history'
  onFinished?: (sessionId: string) => void
  onBack?: () => void
}

function initialActive(session: Session): string | null {
  const withSets = session.exercises.filter((e) => e.sets.length > 0)
  const next = session.exercises.find((e) => e.sets.length === 0)
  // reprendre là où on en était ; sinon le premier exercice pas encore fait
  return (withSets.at(-1) ?? next ?? session.exercises[0])?.id ?? null
}

/** Valeurs proposées pour la prochaine série. */
function defaultDraft(se: SessionExercise, ex: Exercise, sessions: Session[], session: Session): Draft {
  const prev = se.sets.at(-1)
  if (prev) return { weight: prev.weight, reps: prev.reps, warmup: prev.warmup }
  const last = lastPerformance(sessions, se.exerciseId, session.startedAt)
  if (last) return { weight: last.sets[0].weight, reps: last.sets[0].reps }
  if (isTimed(ex)) return { weight: 0, reps: isCardio(ex) ? 20 * 60 : 30 }
  return ex.bodyweight ? { weight: 0, reps: 10 } : { weight: 20, reps: 10 }
}

export function SessionEditor({ session, mode, onFinished, onBack }: Props) {
  const live = mode === 'live'
  const { sessions, exMap } = useData()
  const toast = useToast()
  const now = useNow()
  const [activeId, setActiveId] = useState<string | null>(() => (live ? initialActive(session) : null))
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<{ seId: string; setId: string } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<SessionExercise | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [noteFor, setNoteFor] = useState<Exercise | null>(null)
  const [plates, setPlates] = useState(false)
  const rest = useRestTimer()
  const restSeconds = useLiveQuery(() => getMeta<number>('restSeconds'), []) ?? 90

  const activeSe =
    session.exercises.find((e) => e.id === activeId) ?? (live && activeId !== null ? (session.exercises.at(-1) ?? null) : null)
  const activeEx = activeSe ? exMap.get(activeSe.exerciseId) : undefined
  const draft = activeSe && activeEx ? (drafts[activeSe.id] ?? defaultDraft(activeSe, activeEx, sessions, session)) : null
  const inSession = useMemo(() => new Set(session.exercises.map((e) => e.exerciseId)), [session.exercises])

  // amène l'exercice ouvert à l'écran
  useEffect(() => {
    if (activeSe) document.getElementById(`se-${activeSe.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeSe?.id])

  const workCount = activeSe ? activeSe.sets.filter((s) => !s.warmup).length : 0
  const lastActive = activeSe ? lastPerformance(sessions, activeSe.exerciseId, session.startedAt) : null
  const rawSuggestion = live && activeEx && workCount === 0 && lastActive ? suggestNext(lastActive.sets, activeEx) : null
  // masquée une fois appliquée
  const suggestion =
    rawSuggestion && draft && !draft.warmup && draft.weight === rawSuggestion.weight && draft.reps === rawSuggestion.reps
      ? null
      : rawSuggestion

  const onAddSet = async () => {
    if (!activeSe || !activeEx || !draft) return
    unlockAudio() // l'iPhone n'autorise le bip du minuteur qu'après un toucher
    const before = await addSet(session.id, activeSe.id, draft)
    setDrafts((d) => ({ ...d, [activeSe.id]: draft }))
    toast.show(draft.warmup ? 'Échauffement ajouté' : `Série ${workCount + 1} ajoutée`, before ? () => restoreSession(before) : undefined)
    if (live && restSeconds > 0) rest.start(restSeconds)
  }

  const onPick = async (exerciseId: string) => {
    setPicking(false)
    const seId = await addExerciseToSession(session.id, exerciseId)
    setActiveId(seId)
  }

  const removeSe = async (se: SessionExercise) => {
    const before = await removeExerciseFromSession(session.id, se.id)
    toast.show(`${exMap.get(se.exerciseId)?.name ?? 'Exercice'} retiré`, before ? () => restoreSession(before) : undefined)
  }

  const onFinish = async () => {
    const res = await finishSession(session.id)
    if (res.deleted) {
      const before = res.before
      toast.show('Séance vide supprimée', before ? () => restoreSession(before) : undefined)
    } else onFinished?.(session.id)
  }

  const onDeleteSession = async () => {
    const before = await deleteSession(session.id)
    onBack?.()
    toast.show('Séance supprimée', before ? () => restoreSession(before) : undefined)
  }

  const end = session.endedAt ?? now

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-area pt-safe flex-1 px-4 pb-6">
        {live ? (
          <header className="flex items-center justify-between gap-3 px-1 pt-2">
            <div className="min-w-0">
              <h1 className="text-[28px] font-extrabold tracking-tight">Séance</h1>
              <p className="text-[14px] text-muted">
                Commencée à {fmtTime(session.startedAt)} · {fmtDuration(now - session.startedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onFinish}
              className="press h-11 shrink-0 rounded-full border-[1.5px] border-[#3a3d44] px-[18px] text-[15px] font-bold active:bg-raised"
            >
              Terminer
            </button>
          </header>
        ) : (
          <header className="px-1">
            <button
              type="button"
              onClick={onBack}
              className="press -ml-2 flex h-11 items-center gap-0.5 pr-3 pl-1 text-[16px] font-semibold text-accent"
            >
              <IconChevronLeft size={22} />
              Historique
            </button>
            <h1 className="mt-1 text-[26px] leading-tight font-extrabold tracking-tight">{fmtDayLong(session.startedAt)}</h1>
            <p className="mt-0.5 text-[14px] text-muted">
              {fmtTime(session.startedAt)} – {fmtTime(end)} · {fmtDuration(end - session.startedAt)}
              {session.demo && ' · démo'}
            </p>
          </header>
        )}

        <div className="mt-[18px] flex flex-col gap-3">
          {session.exercises.map((se) => {
            const ex = exMap.get(se.exerciseId)
            if (!ex) return null
            const isActive = se.id === activeSe?.id
            return (
              <ExerciseCard
                key={se.id}
                se={se}
                ex={ex}
                active={isActive}
                live={live}
                last={lastPerformance(sessions, se.exerciseId, session.startedAt)}
                suggestion={isActive ? suggestion : null}
                onApplySuggestion={() =>
                  suggestion && setDrafts((d) => ({ ...d, [se.id]: { weight: suggestion.weight, reps: suggestion.reps } }))
                }
                onEditNote={() => setNoteFor(ex)}
                onActivate={() => setActiveId(isActive && !live ? null : se.id)}
                onEditSet={(setId) => setEditing({ seId: se.id, setId })}
                onRemove={() => (se.sets.length > 0 ? setConfirmRemove(se) : removeSe(se))}
              />
            )
          })}

          {session.exercises.length === 0 && (
            <p className="px-1 pt-8 text-center text-[16px] leading-relaxed text-muted">
              Ajoute ton premier exercice
              <br />
              avec le bouton en bas.
            </p>
          )}

          {session.exercises.length > 0 && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="press flex h-14 items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#3a3d44] text-[16px] font-bold active:bg-raised"
            >
              <IconPlus size={20} />
              Ajouter un exercice
            </button>
          )}

          {!live && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="press mt-4 flex h-12 items-center justify-center gap-2 text-[15px] font-semibold text-danger"
            >
              <IconTrash size={18} />
              Supprimer la séance
            </button>
          )}
        </div>
      </div>

      <div className="relative shrink-0">
        <ToastSlot className="bottom-full mb-3" />
        {activeSe && activeEx && draft ? (
          <SetDock
            ex={activeEx}
            setNumber={workCount + 1}
            draft={draft}
            onDraft={(d) => setDrafts((all) => ({ ...all, [activeSe.id]: d }))}
            onAdd={onAddSet}
            rest={live ? rest : null}
            onPlates={() => setPlates(true)}
          />
        ) : live ? (
          <div className="px-4 pt-2 pb-3">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="press flex h-[72px] w-full items-center justify-center gap-3 rounded-[22px] bg-accent text-[19px] font-extrabold text-accent-ink"
            >
              <IconPlus size={24} strokeWidth={3} />
              Ajouter un exercice
            </button>
          </div>
        ) : null}
      </div>

      {picking && <ExercisePicker onClose={() => setPicking(false)} onPick={onPick} inSession={inSession} />}
      {noteFor && <NoteSheet ex={exMap.get(noteFor.id) ?? noteFor} onClose={() => setNoteFor(null)} />}
      {plates && draft && <PlatesSheet weight={draft.weight} onClose={() => setPlates(false)} />}
      {editing && (
        <EditSetSheet
          key={editing.setId}
          session={session}
          seId={editing.seId}
          setId={editing.setId}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmSheet
        open={!!confirmRemove}
        title="Retirer cet exercice ?"
        message={
          confirmRemove
            ? `${exMap.get(confirmRemove.exerciseId)?.name} et ses ${plural(confirmRemove.sets.length, 'série', 'séries')} seront retirés de la séance.`
            : undefined
        }
        confirmLabel="Retirer l’exercice"
        onConfirm={() => confirmRemove && removeSe(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
      />
      <ConfirmSheet
        open={confirmDelete}
        title="Supprimer cette séance ?"
        message="Toutes ses séries seront effacées de l’historique."
        confirmLabel="Supprimer la séance"
        onConfirm={onDeleteSession}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
