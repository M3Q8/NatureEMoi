import { describe, expect, it } from 'vitest'
import type { Exercise, Session } from '../db/db'
import {
  countInMonth, epley, exerciseHistory, groupWeek, lastPerformance, metricsFor, personalRecords, platesFor, recordsBroken,
  sessionTotals, startOfWeek, statsOfSets, suggestNext, weeklyCounts,
} from '../lib/stats'
import { fmtDuration, fmtSeconds, fmtSet, fmtSetWeight, parseDuration, parseNumber, summarizeSets } from '../lib/format'

const set = (weight: number, reps: number, at = 0) => ({ id: `${weight}-${reps}-${Math.random()}`, weight, reps, at })
const day = (iso: string) => new Date(iso).getTime()

function session(id: string, iso: string, exercises: Record<string, [number, number][]>, ended = true): Session {
  const startedAt = day(iso)
  return {
    id,
    startedAt,
    endedAt: ended ? startedAt + 3600_000 : null,
    exercises: Object.entries(exercises).map(([exerciseId, sets], i) => ({
      id: `${id}-${i}`,
      exerciseId,
      sets: sets.map(([w, r]) => set(w, r, startedAt + 60_000)),
    })),
  }
}

const bench: Exercise = { id: 'bench', name: 'Développé couché', group: 'Pectoraux', bodyweight: false, custom: false, archived: false, createdAt: 0 }
const pullup: Exercise = { id: 'pullup', name: 'Tractions', group: 'Dos', bodyweight: true, custom: false, archived: false, createdAt: 0 }
const plank: Exercise = { id: 'plank', name: 'Gainage', group: 'Abdos', bodyweight: true, custom: false, archived: false, createdAt: 0, kind: 'time' }
const run: Exercise = { id: 'run', name: 'Tapis', group: 'Cardio', bodyweight: false, custom: false, archived: false, createdAt: 0, kind: 'time' }
const exMap = new Map([bench, pullup, plank, run].map((e) => [e.id, e]))

describe('calculs', () => {
  it("1RM d'Epley", () => {
    expect(epley(60, 10)).toBeCloseTo(80)
    expect(epley(100, 0)).toBe(0)
  })

  it('statistiques d’une série de séries', () => {
    const st = statsOfSets([set(60, 10), set(60, 8), set(62.5, 6)])
    expect(st.maxWeight).toBe(62.5)
    expect(st.volume).toBe(60 * 10 + 60 * 8 + 62.5 * 6)
    expect(st.best1RM).toBeCloseTo(80)
    expect(st.totalReps).toBe(24)
    expect(st.maxReps).toBe(10)
  })

  it('totaux de séance', () => {
    const s = session('a', '2026-11-20T18:00:00', { bench: [[60, 10], [60, 10]], pullup: [[0, 8]] })
    const t = sessionTotals(s)
    expect(t).toMatchObject({ exerciseCount: 2, setCount: 3, volume: 1200, durationMs: 3600_000 })
  })
})

describe('format', () => {
  it('résume « la dernière fois »', () => {
    expect(summarizeSets([set(60, 10), set(60, 10), set(60, 10)], bench)).toBe('3 × 10 à 60 kg')
    expect(summarizeSets([set(60, 10), set(60, 8)], bench)).toBe('60 kg × 10, 8')
    expect(summarizeSets([set(60, 10), set(60, 10), set(57.5, 8)], bench)).toBe('60 kg × 10, 10 · 57,5 kg × 8')
    expect(summarizeSets([set(0, 8), set(0, 8)], pullup)).toBe('2 × 8 au poids du corps')
    expect(summarizeSets([set(10, 6)], pullup)).toBe('1 × 6 à PDC + 10 kg')
    // l'échauffement n'apparaît pas
    expect(summarizeSets([{ ...set(20, 10), warmup: true }, set(60, 10)], bench)).toBe('1 × 10 à 60 kg')
  })
  it('exercices en durée', () => {
    expect(fmtSeconds(90)).toBe('1:30')
    expect(fmtSeconds(3900)).toBe('1:05:00')
    expect(summarizeSets([set(0, 60), set(0, 60), set(0, 60)], plank)).toBe('3 × 1:00')
    expect(summarizeSets([set(0, 60), set(0, 45)], plank)).toBe('1:00, 0:45')
    expect(summarizeSets([set(0, 1500)], run)).toBe('25:00')
    expect(fmtSet(set(10, 60), plank)).toBe('1:00 · +10 kg')
    expect(parseDuration('1:30', false)).toBe(90)
    expect(parseDuration('1,30', false)).toBe(90)
    expect(parseDuration('45', false)).toBe(45)
    expect(parseDuration('20', true)).toBe(1200)
    expect(parseDuration('abc', false)).toBeNull()
  })
  it('poids et durées', () => {
    expect(fmtSetWeight(62.5, false)).toBe('62,5 kg')
    expect(fmtSetWeight(0, true)).toBe('PDC')
    expect(fmtDuration(52 * 60000)).toBe('52 min')
    expect(fmtDuration(64 * 60000)).toBe('1 h 04')
    expect(parseNumber('62,5')).toBe(62.5)
    expect(parseNumber('abc')).toBeNull()
  })
})

describe('historique et records', () => {
  const sessions = [
    session('s1', '2026-11-02T18:00:00', { bench: [[55, 10], [55, 10]] }),
    session('s2', '2026-11-09T18:00:00', { bench: [[60, 10], [60, 8]], pullup: [[0, 8]] }),
    session('s3', '2026-11-16T18:00:00', { bench: [[57.5, 10]], pullup: [[0, 10]] }),
  ]

  it('évolution dans le temps', () => {
    const h = exerciseHistory(sessions, 'bench')
    expect(h.map((p) => p.stats.maxWeight)).toEqual([55, 60, 57.5])
  })

  it('records personnels avec leur date', () => {
    const rec = personalRecords(exerciseHistory(sessions, 'bench'), bench)
    expect(rec[0]).toMatchObject({ value: 60, date: day('2026-11-09T18:00:00') })
    expect(rec[2]).toMatchObject({ value: 55 * 20, date: day('2026-11-02T18:00:00') })
  })

  it('dernière fois avant une date', () => {
    const last = lastPerformance(sessions, 'bench', day('2026-11-16T18:00:00'))
    expect(last?.sets.map((s) => s.weight)).toEqual([60, 60])
    expect(lastPerformance(sessions, 'bench', day('2026-11-01T00:00:00'))).toBeNull()
  })

  it('records battus pendant une séance', () => {
    const today = session('s4', '2026-11-23T18:00:00', { bench: [[62.5, 10]], pullup: [[0, 12]] }, false)
    const broken = recordsBroken(today, [...sessions, today], exMap)
    const benchRec = broken.find((b) => b.exerciseId === 'bench')!
    expect(benchRec.items.map((i) => i.def.key)).toEqual(['maxWeight', 'best1RM'])
    const pullRec = broken.find((b) => b.exerciseId === 'pullup')!
    expect(pullRec.items.map((i) => i.def.key)).toEqual(['maxReps', 'totalReps'])
  })

  it('pas de record « battu » la première fois', () => {
    const first = session('x', '2026-10-01T18:00:00', { bench: [[100, 10]] })
    expect(recordsBroken(first, [first, ...sessions], exMap)).toEqual([])
  })

  it('régularité par semaine et par mois', () => {
    const now = day('2026-11-18T12:00:00')
    const w = weeklyCounts(sessions, now, 3)
    expect(w.map((x) => x.count)).toEqual([1, 1, 1])
    expect(w[2].weekStart).toBe(startOfWeek(now))
    expect(countInMonth(sessions, now)).toBe(3)
  })
})

describe('nouveautés', () => {
  it('l’échauffement ne compte ni dans les records ni dans le volume', () => {
    const st = statsOfSets([{ ...set(100, 5), warmup: true }, set(60, 10)])
    expect(st).toMatchObject({ maxWeight: 60, volume: 600, setCount: 1 })
    const s = session('w', '2026-11-20T18:00:00', { bench: [[60, 10]] })
    s.exercises[0].sets.unshift({ ...set(20, 10), warmup: true })
    expect(sessionTotals(s, exMap)).toMatchObject({ setCount: 1, volume: 600 })
  })

  it('indicateurs adaptés au type d’exercice', () => {
    expect(metricsFor(plank).map((m) => m.label)).toEqual(['Durée max', 'Durée totale', 'Lest max'])
    expect(metricsFor(run).map((m) => m.label)).toEqual(['Durée max', 'Durée totale'])
    // le volume en kg ignore les exercices en durée
    const s = session('t', '2026-11-20T18:00:00', { run: [[0, 1200]], bench: [[50, 10]] })
    expect(sessionTotals(s, exMap).volume).toBe(500)
  })

  it('suggestion de progression', () => {
    expect(suggestNext([set(60, 10), set(60, 10), set(60, 10)], bench)).toMatchObject({ weight: 62.5, reps: 10 })
    expect(suggestNext([set(60, 10), set(60, 8)], bench)).toBeNull() // pas toutes réussies
    expect(suggestNext([set(10, 12), set(10, 12)], bench)).toMatchObject({ weight: 11 })
    expect(suggestNext([set(0, 8), set(0, 9)], pullup)).toMatchObject({ weight: 0, reps: 9 })
    expect(suggestNext([set(0, 60)], plank)).toMatchObject({ reps: 65 })
    expect(suggestNext([set(0, 1200)], run)).toMatchObject({ reps: 1260 })
  })

  it('calculateur de disques', () => {
    expect(platesFor(100, 20)).toEqual({ perSide: [25, 15], missing: 0 })
    expect(platesFor(72.5, 20)).toEqual({ perSide: [25, 1.25], missing: 0 })
    expect(platesFor(20, 20)).toEqual({ perSide: [], missing: 0 })
    expect(platesFor(61, 20)?.missing).toBe(1)
    expect(platesFor(15, 20)).toBeNull()
  })

  it('séries par groupe musculaire et par semaine', () => {
    const s = session('g', '2026-11-17T18:00:00', { bench: [[60, 10], [60, 10]], pullup: [[0, 8]], run: [[0, 600]] })
    const rows = groupWeek([s], exMap, startOfWeek(s.startedAt))
    expect(rows.find((r) => r.group === 'Pectoraux')).toMatchObject({ sets: 2, volume: 1200 })
    expect(rows.find((r) => r.group === 'Dos')).toMatchObject({ sets: 1 })
    expect(rows.find((r) => r.group === 'Cardio')).toMatchObject({ sets: 1, volume: 0 })
    expect(groupWeek([s], exMap, startOfWeek(s.startedAt) + 7 * 864e5).every((r) => r.sets === 0)).toBe(true)
  })
})
