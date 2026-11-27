import type { Session, SessionExercise, WorkSet } from './db'
import { uid } from '../lib/id'
import { addDays, startOfWeek } from '../lib/stats'

/** Générateur pseudo-aléatoire reproductible. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Plan {
  id: string
  start: number // kg au départ
  perWeek: number // progression par semaine
  reps: number
  sets: number
  /** poids du corps : semaines avant d'ajouter du lest */
  bodyweightUntilWeek?: number
}

const WORKOUTS: Plan[][] = [
  [
    { id: 'developpe-couche', start: 55, perWeek: 1.25, reps: 10, sets: 4 },
    { id: 'developpe-militaire', start: 32.5, perWeek: 0.6, reps: 10, sets: 3 },
    { id: 'developpe-incline-halteres', start: 20, perWeek: 0.5, reps: 10, sets: 3 },
    { id: 'elevations-laterales', start: 8, perWeek: 0.2, reps: 12, sets: 3 },
    { id: 'extension-triceps', start: 20, perWeek: 0.6, reps: 12, sets: 3 },
  ],
  [
    { id: 'tractions', start: 0, perWeek: 0.8, reps: 8, sets: 4, bodyweightUntilWeek: 5 },
    { id: 'rowing-barre', start: 45, perWeek: 1, reps: 10, sets: 4 },
    { id: 'tirage-vertical', start: 45, perWeek: 1, reps: 10, sets: 3 },
    { id: 'curl-biceps', start: 25, perWeek: 0.5, reps: 10, sets: 3 },
    { id: 'curl-marteau', start: 12, perWeek: 0.25, reps: 12, sets: 3 },
  ],
  [
    { id: 'squat', start: 70, perWeek: 2, reps: 8, sets: 4 },
    { id: 'presse-cuisses', start: 120, perWeek: 4, reps: 10, sets: 3 },
    { id: 'leg-curl', start: 35, perWeek: 1, reps: 12, sets: 3 },
    { id: 'mollets-debout', start: 60, perWeek: 2, reps: 15, sets: 3 },
  ],
]

const roundTo = (x: number, step: number) => Math.round(x / step) * step

/** Environ 10 semaines de séances (3 par semaine), jusqu'à avant-hier. */
export function makeDemoSessions(now = Date.now()): Session[] {
  const rand = mulberry32(42)
  const weeks = 10
  const firstMonday = addDays(startOfWeek(now), -7 * weeks)
  const limit = now - 2 * 864e5
  const sessions: Session[] = []
  let rotation = 0

  for (let w = 0; w <= weeks; w++) {
    for (const dayOffset of [1, 3, 5]) {
      const day = new Date(addDays(firstMonday, w * 7 + dayOffset))
      day.setHours(dayOffset === 5 ? 10 : 18, Math.floor(rand() * 40), 0, 0)
      const startedAt = day.getTime()
      if (startedAt > limit) continue
      if (rand() < 0.1) continue // séance manquée, pour une régularité réaliste

      const plan = WORKOUTS[rotation % WORKOUTS.length]
      rotation++
      let clock = startedAt + 4 * 60000
      const exercises: SessionExercise[] = plan.map((p) => {
        let weight: number
        if (p.bodyweightUntilWeek !== undefined) {
          weight = w < p.bodyweightUntilWeek ? 0 : roundTo((w - p.bodyweightUntilWeek + 1) * p.perWeek * 2, 2.5)
        } else {
          const raw = p.start + p.perWeek * w + (rand() - 0.5) * 2
          weight = raw < 16 ? roundTo(raw, 1) : roundTo(raw, 2.5)
        }
        const baseReps = p.bodyweightUntilWeek !== undefined ? p.reps + Math.min(3, Math.floor(w / 2)) : p.reps
        const sets: WorkSet[] = []
        for (let i = 0; i < p.sets; i++) {
          const fatigue = i < 2 ? 0 : Math.floor(rand() * 3)
          clock += (2 + rand() * 1.5) * 60000
          sets.push({ id: uid(), reps: Math.max(3, baseReps - fatigue), weight, at: clock })
        }
        clock += 3 * 60000
        return { id: uid(), exerciseId: p.id, sets }
      })
      sessions.push({ id: uid(), startedAt, endedAt: clock + 2 * 60000, exercises, demo: true })
    }
  }
  return sessions
}
