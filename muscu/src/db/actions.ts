import { db, type Exercise, type MuscleGroup, type Session, type WorkSet } from './db'
import { uid } from '../lib/id'
import { makeDemoSessions } from './demo'
import { round2 } from '../lib/format'

/**
 * Modifie une séance dans une transaction et renvoie la version d'avant,
 * qu'il suffit de remettre en place pour « Annuler ».
 */
async function mutate(sessionId: string, change: (s: Session) => void): Promise<Session | undefined> {
  return db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(sessionId)
    if (!s) return undefined
    const before = structuredClone(s)
    change(s)
    await db.sessions.put(s)
    return before
  })
}

/** Remet une séance telle qu'elle était (bouton « Annuler »). */
export async function restoreSession(snapshot: Session): Promise<void> {
  await db.sessions.put(snapshot)
}

export async function getActiveSession(): Promise<Session | undefined> {
  const all = await db.sessions.toArray()
  return all.filter((s) => s.endedAt === null).sort((a, b) => b.startedAt - a.startedAt)[0]
}

/** Démarre une séance (vide, ou avec les mêmes exercices qu'une séance précédente). */
export async function startSession(template?: Session, now = Date.now()): Promise<string> {
  const active = await getActiveSession()
  if (active) return active.id
  const seen = new Set<string>()
  const exercises = (template?.exercises ?? [])
    .filter((e) => (seen.has(e.exerciseId) ? false : (seen.add(e.exerciseId), true)))
    .map((e) => ({ id: uid(), exerciseId: e.exerciseId, sets: [] as WorkSet[] }))
  const session: Session = { id: uid(), startedAt: now, endedAt: null, exercises }
  await db.sessions.add(session)
  return session.id
}

/** Ajoute un exercice à la séance (ou renvoie celui déjà présent). */
export async function addExerciseToSession(sessionId: string, exerciseId: string): Promise<string> {
  let seId = ''
  await mutate(sessionId, (s) => {
    const existing = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (existing) {
      seId = existing.id
      return
    }
    seId = uid()
    s.exercises.push({ id: seId, exerciseId, sets: [] })
  })
  return seId
}

export function removeExerciseFromSession(sessionId: string, seId: string) {
  return mutate(sessionId, (s) => {
    s.exercises = s.exercises.filter((e) => e.id !== seId)
  })
}

export function addSet(sessionId: string, seId: string, values: { reps: number; weight: number }, now = Date.now()) {
  return mutate(sessionId, (s) => {
    const se = s.exercises.find((e) => e.id === seId)
    se?.sets.push({ id: uid(), reps: Math.round(values.reps), weight: round2(values.weight), at: now })
  })
}

export function updateSet(sessionId: string, seId: string, setId: string, patch: Partial<Pick<WorkSet, 'reps' | 'weight'>>) {
  return mutate(sessionId, (s) => {
    const set = s.exercises.find((e) => e.id === seId)?.sets.find((x) => x.id === setId)
    if (!set) return
    if (patch.reps !== undefined) set.reps = Math.round(patch.reps)
    if (patch.weight !== undefined) set.weight = round2(patch.weight)
  })
}

export function deleteSet(sessionId: string, seId: string, setId: string) {
  return mutate(sessionId, (s) => {
    const se = s.exercises.find((e) => e.id === seId)
    if (se) se.sets = se.sets.filter((x) => x.id !== setId)
  })
}

const TWO_HOURS = 2 * 3600_000

/**
 * Termine la séance. Si la dernière série date de plus de 2 h (séance oubliée),
 * la fin est placée juste après cette dernière série plutôt que maintenant.
 * Une séance sans aucune série est supprimée.
 */
export async function finishSession(sessionId: string, now = Date.now()): Promise<{ deleted: boolean; before?: Session }> {
  const s = await db.sessions.get(sessionId)
  if (!s) return { deleted: false }
  const lastSetAt = Math.max(0, ...s.exercises.flatMap((e) => e.sets.map((x) => x.at)))
  if (lastSetAt === 0) {
    await db.sessions.delete(sessionId)
    return { deleted: true, before: s }
  }
  const endedAt = now - lastSetAt > TWO_HOURS ? lastSetAt + 5 * 60000 : now
  const before = await mutate(sessionId, (x) => {
    x.endedAt = endedAt
    // les exercices prévus mais pas faits ne restent pas dans l'historique
    x.exercises = x.exercises.filter((e) => e.sets.length > 0)
  })
  return { deleted: false, before }
}

export function resumeSession(sessionId: string) {
  return mutate(sessionId, (s) => {
    s.endedAt = null
  })
}

export async function deleteSession(sessionId: string): Promise<Session | undefined> {
  const s = await db.sessions.get(sessionId)
  if (s) await db.sessions.delete(sessionId)
  return s
}

// ---------- Exercices ----------

export async function createExercise(values: { name: string; group: MuscleGroup; bodyweight: boolean }): Promise<string> {
  const ex: Exercise = {
    id: uid(),
    name: values.name.trim(),
    group: values.group,
    bodyweight: values.bodyweight,
    custom: true,
    archived: false,
    createdAt: Date.now(),
  }
  await db.exercises.add(ex)
  return ex.id
}

export async function updateExercise(id: string, patch: Partial<Pick<Exercise, 'name' | 'group' | 'bodyweight'>>) {
  const clean = { ...patch }
  if (clean.name !== undefined) clean.name = clean.name.trim()
  await db.exercises.update(id, clean)
}

/** Supprime un exercice. S'il apparaît dans l'historique, il est seulement masqué de la liste. */
export async function deleteExercise(id: string): Promise<'archived' | 'deleted'> {
  return db.transaction('rw', db.exercises, db.sessions, async () => {
    const used = await db.sessions.filter((s) => s.exercises.some((e) => e.exerciseId === id)).count()
    if (used > 0) {
      await db.exercises.update(id, { archived: true })
      return 'archived' as const
    }
    await db.exercises.delete(id)
    return 'deleted' as const
  })
}

export async function restoreExercise(ex: Exercise) {
  await db.exercises.put(ex)
}

// ---------- Démo ----------

export async function deleteDemoData(): Promise<number> {
  const demo = await db.sessions.filter((s) => !!s.demo).primaryKeys()
  await db.sessions.bulkDelete(demo)
  return demo.length
}

export async function addDemoData(): Promise<void> {
  await deleteDemoData()
  await db.sessions.bulkAdd(makeDemoSessions())
}
