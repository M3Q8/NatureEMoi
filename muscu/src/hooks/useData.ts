import { createContext, useContext, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type Session } from '../db/db'

export interface AppData {
  exercises: Exercise[]
  exMap: Map<string, Exercise>
  /** toutes les séances, de la plus récente à la plus ancienne */
  sessions: Session[]
  active: Session | undefined
  hasDemo: boolean
}

/** Charge toute la base et se met à jour tout seul à chaque modification. */
export function useLoadAppData(): AppData | undefined {
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), [])
  return useMemo(() => {
    if (!exercises || !sessions) return undefined
    return {
      exercises,
      exMap: new Map(exercises.map((e) => [e.id, e])),
      sessions,
      active: sessions.find((s) => s.endedAt === null),
      hasDemo: sessions.some((s) => s.demo),
    }
  }, [exercises, sessions])
}

export const DataContext = createContext<AppData | null>(null)

export function useData(): AppData {
  const d = useContext(DataContext)
  if (!d) throw new Error('DataContext manquant')
  return d
}
