import type { Exercise, Session, WorkSet } from '../db/db'
import { fmtInt, fmtKg, fmtNum1 } from './format'

/** 1RM estimé, formule d'Epley : poids × (1 + reps / 30) */
export const epley = (weight: number, reps: number) => (reps > 0 ? weight * (1 + reps / 30) : 0)

export interface SetStats {
  maxWeight: number
  best1RM: number
  volume: number
  maxReps: number
  totalReps: number
  setCount: number
}

export function statsOfSets(sets: Pick<WorkSet, 'reps' | 'weight'>[]): SetStats {
  let maxWeight = 0
  let best1RM = 0
  let volume = 0
  let maxReps = 0
  let totalReps = 0
  for (const s of sets) {
    if (s.reps <= 0) continue
    maxWeight = Math.max(maxWeight, s.weight)
    best1RM = Math.max(best1RM, epley(s.weight, s.reps))
    volume += s.reps * s.weight
    maxReps = Math.max(maxReps, s.reps)
    totalReps += s.reps
  }
  return { maxWeight, best1RM, volume, maxReps, totalReps, setCount: sets.length }
}

export type MetricKey = 'maxWeight' | 'best1RM' | 'volume' | 'maxReps' | 'totalReps'

export interface MetricDef {
  key: MetricKey
  label: string
  unit: 'kg' | 'reps'
}

/** Les 3 indicateurs suivis. Au poids du corps, le poids vaut souvent 0 : on suit le lest et les répétitions. */
export function metricsFor(bodyweight: boolean): MetricDef[] {
  return bodyweight
    ? [
        { key: 'maxWeight', label: 'Lest max', unit: 'kg' },
        { key: 'maxReps', label: 'Reps max', unit: 'reps' },
        { key: 'totalReps', label: 'Total reps', unit: 'reps' },
      ]
    : [
        { key: 'maxWeight', label: 'Poids max', unit: 'kg' },
        { key: 'best1RM', label: '1RM estimé', unit: 'kg' },
        { key: 'volume', label: 'Volume', unit: 'kg' },
      ]
}

export function fmtMetric(def: MetricDef, value: number): string {
  if (def.unit === 'reps') return `${fmtInt(value)} reps`
  if (def.key === 'best1RM') return `${fmtNum1(value)} kg`
  if (def.key === 'volume') return `${fmtInt(value)} kg`
  return fmtKg(value)
}

/** Toutes les séries d'un exercice dans une séance (s'il y a été ajouté plusieurs fois). */
export function setsOf(session: Session, exerciseId: string): WorkSet[] {
  return session.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)
}

export interface HistoryPoint {
  sessionId: string
  date: number
  stats: SetStats
}

/** Évolution d'un exercice : une entrée par séance terminée, de la plus ancienne à la plus récente. */
export function exerciseHistory(sessions: Session[], exerciseId: string): HistoryPoint[] {
  const out: HistoryPoint[] = []
  for (const s of sessions) {
    if (s.endedAt === null) continue
    const sets = setsOf(s, exerciseId)
    if (sets.length === 0) continue
    out.push({ sessionId: s.id, date: s.startedAt, stats: statsOfSets(sets) })
  }
  return out.sort((a, b) => a.date - b.date)
}

export interface PersonalRecord {
  def: MetricDef
  value: number
  date: number
}

export function personalRecords(history: HistoryPoint[], bodyweight: boolean): PersonalRecord[] {
  return metricsFor(bodyweight).map((def) => {
    let best: HistoryPoint | null = null
    for (const p of history) if (!best || p.stats[def.key] > best.stats[def.key]) best = p
    return { def, value: best ? best.stats[def.key] : 0, date: best ? best.date : 0 }
  })
}

/** Ce qui a été fait la dernière fois sur cet exercice, avant la date donnée. */
export function lastPerformance(
  sessions: Session[],
  exerciseId: string,
  before: number,
): { date: number; sets: WorkSet[] } | null {
  let found: Session | null = null
  for (const s of sessions) {
    if (s.startedAt >= before) continue
    if (setsOf(s, exerciseId).length === 0) continue
    if (!found || s.startedAt > found.startedAt) found = s
  }
  return found ? { date: found.startedAt, sets: setsOf(found, exerciseId) } : null
}

export interface SessionTotals {
  durationMs: number
  exerciseCount: number
  setCount: number
  volume: number
}

export function sessionTotals(session: Session, now = Date.now()): SessionTotals {
  const withSets = session.exercises.filter((e) => e.sets.length > 0)
  const ids = new Set(withSets.map((e) => e.exerciseId))
  let setCount = 0
  let volume = 0
  for (const e of withSets) {
    for (const s of e.sets) {
      setCount++
      volume += s.reps * s.weight
    }
  }
  return { durationMs: (session.endedAt ?? now) - session.startedAt, exerciseCount: ids.size, setCount, volume }
}

export interface BrokenRecord {
  exerciseId: string
  name: string
  items: { def: MetricDef; value: number }[]
}

/** Records battus pendant cette séance, par rapport à toutes les séances précédentes. */
export function recordsBroken(session: Session, sessions: Session[], exercises: Map<string, Exercise>): BrokenRecord[] {
  const out: BrokenRecord[] = []
  const seen = new Set<string>()
  for (const se of session.exercises) {
    if (seen.has(se.exerciseId)) continue
    seen.add(se.exerciseId)
    const ex = exercises.get(se.exerciseId)
    const current = statsOfSets(setsOf(session, se.exerciseId))
    if (!ex || current.setCount === 0) continue
    const previous = sessions.filter(
      (s) => s.id !== session.id && s.startedAt < session.startedAt && setsOf(s, se.exerciseId).length > 0,
    )
    if (previous.length === 0) continue // première fois : pas de record « battu »
    const prevStats = previous.map((s) => statsOfSets(setsOf(s, se.exerciseId)))
    const items: BrokenRecord['items'] = []
    for (const def of metricsFor(ex.bodyweight)) {
      const best = Math.max(...prevStats.map((p) => p[def.key]))
      const value = current[def.key]
      if (value > 0 && value > best + 1e-9) items.push({ def, value })
    }
    if (items.length) out.push({ exerciseId: ex.id, name: ex.name, items })
  }
  return out
}

/** Lundi 0 h de la semaine contenant ts. */
export function startOfWeek(ts: number): number {
  const d = new Date(ts)
  const day = (d.getDay() + 6) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d.getTime()
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

/** Nombre de séances par semaine, de la plus ancienne (il y a weeks-1 semaines) à la semaine en cours. */
export function weeklyCounts(sessions: Session[], now = Date.now(), weeks = 12): { weekStart: number; count: number }[] {
  const current = startOfWeek(now)
  const out = Array.from({ length: weeks }, (_, i) => ({ weekStart: addDays(current, -7 * (weeks - 1 - i)), count: 0 }))
  for (const s of sessions) {
    if (s.endedAt === null || !hasSets(s)) continue
    const ws = startOfWeek(s.startedAt)
    const slot = out.find((w) => w.weekStart === ws)
    if (slot) slot.count++
  }
  return out
}

/** Moyenne de séances par semaine sur les 12 dernières semaines (ou depuis la première séance). */
export function weeklyAverage(sessions: Session[], now = Date.now()): number {
  const done = sessions.filter((s) => s.endedAt !== null && hasSets(s))
  if (done.length === 0) return 0
  const first = Math.min(...done.map((s) => s.startedAt))
  const weeksSinceFirst = Math.round((startOfWeek(now) - startOfWeek(first)) / (7 * 864e5)) + 1
  const weeks = Math.min(12, Math.max(1, weeksSinceFirst))
  const total = weeklyCounts(sessions, now, weeks).reduce((a, w) => a + w.count, 0)
  return total / weeks
}

export function countInMonth(sessions: Session[], now = Date.now()): number {
  const d = new Date(now)
  return sessions.filter((s) => {
    if (s.endedAt === null || !hasSets(s)) return false
    const sd = new Date(s.startedAt)
    return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth()
  }).length
}

export const hasSets = (s: Session) => s.exercises.some((e) => e.sets.length > 0)

/** Exercices classés par usage : les plus récents d'abord, puis les plus fréquents. */
export function usageByExercise(sessions: Session[]): Map<string, { count: number; lastUsed: number }> {
  const usage = new Map<string, { count: number; lastUsed: number }>()
  for (const s of sessions) {
    const ids = new Set(s.exercises.filter((e) => e.sets.length > 0).map((e) => e.exerciseId))
    for (const id of ids) {
      const u = usage.get(id) ?? { count: 0, lastUsed: 0 }
      u.count++
      u.lastUsed = Math.max(u.lastUsed, s.startedAt)
      usage.set(id, u)
    }
  }
  return usage
}
