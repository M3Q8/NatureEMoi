import { db, MUSCLE_GROUPS, setMeta, type Exercise, type MuscleGroup, type Session } from '../db/db'

export interface Backup {
  app: 'my-app-muscu'
  version: 1
  exportedAt: string
  exercises: Exercise[]
  sessions: Session[]
}

export async function exportData(): Promise<Backup> {
  const [exercises, sessions] = await Promise.all([db.exercises.toArray(), db.sessions.toArray()])
  return { app: 'my-app-muscu', version: 1, exportedAt: new Date().toISOString(), exercises, sessions }
}

export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `muscu-sauvegarde-${d}.json`
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const isStr = (x: unknown): x is string => typeof x === 'string'

/** Lit et vérifie un fichier de sauvegarde. Lève une erreur au message lisible. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide (JSON illisible).")
  }
  if (!isObj(raw) || raw.app !== 'my-app-muscu' || !Array.isArray(raw.exercises) || !Array.isArray(raw.sessions)) {
    throw new Error("Ce fichier n'est pas une sauvegarde de cette app.")
  }
  const bad = () => new Error('La sauvegarde est abîmée : certaines données sont illisibles.')
  const exercises: Exercise[] = raw.exercises.map((e) => {
    if (!isObj(e) || !isStr(e.id) || !isStr(e.name)) throw bad()
    const group = (MUSCLE_GROUPS as readonly string[]).includes(e.group as string) ? (e.group as MuscleGroup) : 'Pectoraux'
    return {
      id: e.id,
      name: e.name,
      group,
      bodyweight: !!e.bodyweight,
      custom: !!e.custom,
      archived: !!e.archived,
      createdAt: isNum(e.createdAt) ? e.createdAt : Date.now(),
    }
  })
  const sessions: Session[] = raw.sessions.map((s) => {
    if (!isObj(s) || !isStr(s.id) || !isNum(s.startedAt) || !Array.isArray(s.exercises)) throw bad()
    return {
      id: s.id,
      startedAt: s.startedAt,
      endedAt: isNum(s.endedAt) ? s.endedAt : null,
      demo: s.demo ? true : undefined,
      exercises: s.exercises.map((se) => {
        if (!isObj(se) || !isStr(se.id) || !isStr(se.exerciseId) || !Array.isArray(se.sets)) throw bad()
        return {
          id: se.id,
          exerciseId: se.exerciseId,
          sets: se.sets.map((x) => {
            if (!isObj(x) || !isStr(x.id) || !isNum(x.reps) || !isNum(x.weight)) throw bad()
            return { id: x.id, reps: x.reps, weight: x.weight, at: isNum(x.at) ? x.at : (s.startedAt as number) }
          }),
        }
      }),
    }
  })
  return { app: 'my-app-muscu', version: 1, exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '', exercises, sessions }
}

/** Remplace toutes les données par celles de la sauvegarde. */
export async function importData(backup: Backup): Promise<void> {
  await db.transaction('rw', db.exercises, db.sessions, async () => {
    await db.exercises.clear()
    await db.sessions.clear()
    await db.exercises.bulkAdd(backup.exercises)
    await db.sessions.bulkAdd(backup.sessions)
  })
}

/**
 * Sur iPhone : ouvre le menu Partager (→ « Enregistrer dans Fichiers », iCloud Drive, AirDrop…).
 * Ailleurs : téléchargement classique.
 */
export async function saveBackupFile(backup: Backup): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const json = JSON.stringify(backup, null, 1)
  const name = backupFileName()
  const file = new File([json], name, { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Sauvegarde Muscu' })
      await setMeta('lastExportAt', Date.now())
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // partage impossible : on retombe sur le téléchargement
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  await setMeta('lastExportAt', Date.now())
  return 'downloaded'
}
