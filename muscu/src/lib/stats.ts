import { MUSCLE_GROUPS, type Exercise, type MuscleGroup, type Session, type WorkSet } from '../db/db'
import { fmtInt, fmtKg, fmtNum, fmtNum1, fmtSeconds } from './format'

type ExLike = Pick<Exercise, 'bodyweight' | 'kind' | 'group'>

/** 1RM estimé, formule d'Epley : poids × (1 + reps / 30) */
export const epley = (weight: number, reps: number) => (reps > 0 ? weight * (1 + reps / 30) : 0)

export interface SetStats {
  maxWeight: number
  best1RM: number
  volume: number
  /** répétitions (ou secondes) de la meilleure série */
  maxReps: number
  /** total des répétitions (ou secondes) */
  totalReps: number
  /** nombre de séries de travail (hors échauffement) */
  setCount: number
}

/** Statistiques des séries de travail (l'échauffement est ignoré). */
export function statsOfSets(sets: Pick<WorkSet, 'reps' | 'weight' | 'warmup'>[]): SetStats {
  let maxWeight = 0
  let best1RM = 0
  let volume = 0
  let maxReps = 0
  let totalReps = 0
  let setCount = 0
  for (const s of sets) {
    if (s.warmup || s.reps <= 0) continue
    setCount++
    maxWeight = Math.max(maxWeight, s.weight)
    best1RM = Math.max(best1RM, epley(s.weight, s.reps))
    volume += s.reps * s.weight
    maxReps = Math.max(maxReps, s.reps)
    totalReps += s.reps
  }
  return { maxWeight, best1RM, volume, maxReps, totalReps, setCount }
}

export type MetricKey = 'maxWeight' | 'best1RM' | 'volume' | 'maxReps' | 'totalReps'

export interface MetricDef {
  key: MetricKey
  label: string
  unit: 'kg' | 'reps' | 's'
}

/** Les indicateurs suivis, selon le type d'exercice. */
export function metricsFor(ex: ExLike): MetricDef[] {
  if (ex.kind === 'time') {
    const defs: MetricDef[] = [
      { key: 'maxReps', label: 'Durée max', unit: 's' },
      { key: 'totalReps', label: 'Durée totale', unit: 's' },
    ]
    if (ex.group !== 'Cardio') defs.push({ key: 'maxWeight', label: ex.bodyweight ? 'Lest max' : 'Poids max', unit: 'kg' })
    return defs
  }
  // Au poids du corps, le poids vaut souvent 0 : on suit le lest et les répétitions.
  return ex.bodyweight
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
  if (def.unit === 's') return fmtSeconds(value)
  if (def.unit === 'reps') return `${fmtInt(value)} reps`
  if (def.key === 'best1RM') return `${fmtNum1(value)} kg`
  if (def.key === 'volume') return `${fmtInt(value)} kg`
  return fmtKg(value)
}

/** Toutes les séries d'un exercice dans une séance (s'il y a été ajouté plusieurs fois). */
export function setsOf(session: Session, exerciseId: string): WorkSet[] {
  return session.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)
}

export const workSets = (sets: WorkSet[]) => sets.filter((s) => !s.warmup)

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
    const stats = statsOfSets(setsOf(s, exerciseId))
    if (stats.setCount === 0) continue
    out.push({ sessionId: s.id, date: s.startedAt, stats })
  }
  return out.sort((a, b) => a.date - b.date)
}

export interface PersonalRecord {
  def: MetricDef
  value: number
  date: number
}

export function personalRecords(history: HistoryPoint[], ex: ExLike): PersonalRecord[] {
  return metricsFor(ex).map((def) => {
    let best: HistoryPoint | null = null
    for (const p of history) if (!best || p.stats[def.key] > best.stats[def.key]) best = p
    return { def, value: best ? best.stats[def.key] : 0, date: best ? best.date : 0 }
  })
}

/** Ce qui a été fait la dernière fois sur cet exercice (séries de travail), avant la date donnée. */
export function lastPerformance(
  sessions: Session[],
  exerciseId: string,
  before: number,
): { date: number; sets: WorkSet[] } | null {
  let found: Session | null = null
  for (const s of sessions) {
    if (s.startedAt >= before) continue
    if (workSets(setsOf(s, exerciseId)).length === 0) continue
    if (!found || s.startedAt > found.startedAt) found = s
  }
  return found ? { date: found.startedAt, sets: workSets(setsOf(found, exerciseId)) } : null
}

export interface Suggestion {
  weight: number
  reps: number
  label: string
}

/**
 * Suggestion de progression : si toutes les séries de la dernière fois ont été réussies
 * (même charge, sans perdre de répétitions), on propose un peu plus.
 */
export function suggestNext(last: WorkSet[], ex: ExLike): Suggestion | null {
  const sets = workSets(last)
  if (sets.length === 0) return null
  const first = sets[0]
  const sameWeight = sets.every((s) => s.weight === first.weight)
  if (!sameWeight) return null
  const held = sets.every((s) => s.reps >= first.reps)
  if (!held) return null

  if (ex.kind === 'time') {
    const step = ex.group === 'Cardio' ? 60 : 5
    return { weight: first.weight, reps: first.reps + step, label: `${fmtSeconds(first.reps + step)} (+${step === 60 ? '1 min' : '5 s'})` }
  }
  if (ex.bodyweight && first.weight === 0) {
    return { weight: 0, reps: first.reps + 1, label: `${first.reps + 1} répétitions (+1)` }
  }
  const inc = first.weight < 15 ? 1 : 2.5
  const weight = first.weight + inc
  return { weight, reps: first.reps, label: `${fmtNum(weight)} kg (+${fmtNum(inc)})` }
}

export interface SessionTotals {
  durationMs: number
  exerciseCount: number
  setCount: number
  volume: number
}

/** Totaux d'une séance (hors échauffement ; le volume ignore les exercices en durée). */
export function sessionTotals(session: Session, exercises?: Map<string, Exercise>, now = Date.now()): SessionTotals {
  const ids = new Set<string>()
  let setCount = 0
  let volume = 0
  for (const e of session.exercises) {
    const timed = exercises?.get(e.exerciseId)?.kind === 'time'
    for (const s of e.sets) {
      if (s.warmup) continue
      ids.add(e.exerciseId)
      setCount++
      if (!timed) volume += s.reps * s.weight
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
    const prevStats = sessions
      .filter((s) => s.id !== session.id && s.startedAt < session.startedAt)
      .map((s) => statsOfSets(setsOf(s, se.exerciseId)))
      .filter((st) => st.setCount > 0)
    if (prevStats.length === 0) continue // première fois : pas de record « battu »
    const items: BrokenRecord['items'] = []
    for (const def of metricsFor(ex)) {
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

export interface GroupWeek {
  group: MuscleGroup
  sets: number
  volume: number
}

/** Séries de travail et volume par groupe musculaire, pour la semaine commençant à weekStart. */
export function groupWeek(sessions: Session[], exercises: Map<string, Exercise>, weekStart: number): GroupWeek[] {
  const end = addDays(weekStart, 7)
  const map = new Map<MuscleGroup, GroupWeek>(MUSCLE_GROUPS.map((g) => [g, { group: g, sets: 0, volume: 0 }]))
  for (const s of sessions) {
    if (s.startedAt < weekStart || s.startedAt >= end) continue
    for (const se of s.exercises) {
      const ex = exercises.get(se.exerciseId)
      if (!ex) continue
      const row = map.get(ex.group)!
      for (const set of se.sets) {
        if (set.warmup) continue
        row.sets++
        if (ex.kind !== 'time') row.volume += set.reps * set.weight
      }
    }
  }
  return [...map.values()]
}

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

export const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

/** Disques à mettre de chaque côté de la barre pour atteindre `total`. */
export function platesFor(total: number, bar: number, plates = STANDARD_PLATES): { perSide: number[]; missing: number } | null {
  if (total < bar) return null
  let rest = Math.round(((total - bar) / 2) * 100) / 100
  const perSide: number[] = []
  for (const p of plates) {
    while (rest >= p - 1e-9) {
      perSide.push(p)
      rest = Math.round((rest - p) * 100) / 100
    }
  }
  return { perSide, missing: Math.round(rest * 2 * 100) / 100 }
}
