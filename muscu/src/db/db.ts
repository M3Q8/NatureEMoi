import Dexie, { type Table } from 'dexie'
import { seedExercises } from './seed'

export const MUSCLE_GROUPS = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdos', 'Cardio'] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

/** reps = on compte des répétitions ; time = on mesure une durée (gainage, cardio…) */
export type ExerciseKind = 'reps' | 'time'

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
  /** absent = 'reps' */
  kind?: ExerciseKind
  /** note libre : réglage de la machine, prise, sensations… */
  note?: string
}

export const isTimed = (e: Pick<Exercise, 'kind'>) => e.kind === 'time'
/** Cardio : seule la durée compte, pas de poids. */
export const isCardio = (e: Pick<Exercise, 'group'>) => e.group === 'Cardio'

export interface WorkSet {
  id: string
  /** répétitions, ou secondes pour un exercice en durée */
  reps: number
  /** kg (lest pour un exercice au poids du corps) */
  weight: number
  /** horodatage de la saisie */
  at: number
  /** série d'échauffement : exclue des records et du volume */
  warmup?: boolean
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

/** Modèle de séance nommé (« Pecs », « Jambes »…). */
export interface Template {
  id: string
  name: string
  exerciseIds: string[]
  createdAt: number
}

export interface BodyWeight {
  id: string
  date: number
  kg: number
}

export interface Meta {
  key: string
  value: unknown
}

export class MuscuDB extends Dexie {
  exercises!: Table<Exercise, string>
  sessions!: Table<Session, string>
  meta!: Table<Meta, string>
  templates!: Table<Template, string>
  bodyweights!: Table<BodyWeight, string>

  constructor(name = 'muscu') {
    super(name)
    const schema = {
      exercises: 'id, name, group',
      sessions: 'id, startedAt',
      meta: 'key',
    }
    this.version(1).stores(schema)
    // v2 : l'app démarre vide. Les séances de démonstration déjà présentes sont retirées.
    this.version(2)
      .stores(schema)
      .upgrade((tx) => tx.table('sessions').filter((s: Session) => !!s.demo).delete())
    // v3 : modèles de séance, poids du corps, nouveaux exercices de départ (gainage, cardio…).
    this.version(3)
      .stores({ ...schema, templates: 'id, name', bodyweights: 'id, date' })
      .upgrade(async (tx) => {
        const existing = new Set(await tx.table('exercises').toCollection().primaryKeys())
        await tx.table('exercises').bulkAdd(seedExercises().filter((e) => !existing.has(e.id)))
      })

    // Premier lancement : seulement la liste d'exercices de départ.
    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(seedExercises())
    })
  }
}

export const db = new MuscuDB()

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}
