import Dexie, { type Table } from 'dexie'
import { seedExercises } from './seed'
import { makeDemoSessions } from './demo'

export const MUSCLE_GROUPS = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdos'] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export interface Exercise {
  id: string
  name: string
  group: MuscleGroup
  /** Exercice au poids du corps : le poids saisi est un lest (0 = sans lest). */
  bodyweight: boolean
  /** Ajouté par l'utilisateur (sinon : fait partie de la liste de départ). */
  custom: boolean
  /** Supprimé de la liste, mais conservé pour l'historique. */
  archived: boolean
  createdAt: number
}

export interface WorkSet {
  id: string
  reps: number
  /** kg (lest pour un exercice au poids du corps) */
  weight: number
  /** horodatage de la saisie */
  at: number
}

export interface SessionExercise {
  id: string
  exerciseId: string
  sets: WorkSet[]
}

export interface Session {
  id: string
  startedAt: number
  /** null = séance en cours */
  endedAt: number | null
  exercises: SessionExercise[]
  /** séance de démonstration (supprimable d'un coup) */
  demo?: boolean
}

export interface Meta {
  key: string
  value: unknown
}

export class MuscuDB extends Dexie {
  exercises!: Table<Exercise, string>
  sessions!: Table<Session, string>
  meta!: Table<Meta, string>

  constructor(name = 'muscu') {
    super(name)
    this.version(1).stores({
      exercises: 'id, name, group',
      sessions: 'id, startedAt',
      meta: 'key',
    })
  }
}

export const db = new MuscuDB()

// Premier lancement : liste d'exercices de départ + données de démonstration.
db.on('populate', (tx) => {
  tx.table('exercises').bulkAdd(seedExercises())
  tx.table('sessions').bulkAdd(makeDemoSessions())
})

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}
