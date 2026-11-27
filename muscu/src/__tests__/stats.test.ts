import { describe, expect, it } from 'vitest'
import type { Exercise, Session } from '../db/db'
import {
  countInMonth, epley, exerciseHistory, lastPerformance, personalRecords, recordsBroken,
  sessionTotals, startOfWeek, statsOfSets, weeklyCounts,
} from '../lib/stats'
import { fmtDuration, fmtSetWeight, parseNumber, summarizeSets } from '../lib/format'

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
const exMap = new Map([bench, pullup].map((e) => [e.id, e]))

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
    expect(summarizeSets([set(60, 10), set(60, 10), set(60, 10)], false)).toBe('3 × 10 à 60 kg')
    expect(summarizeSets([set(60, 10), set(60, 8)], false)).toBe('60 kg × 10, 8')
    expect(summarizeSets([set(60, 10), set(60, 10), set(57.5, 8)], false)).toBe('60 kg × 10, 10 · 57,5 kg × 8')
    expect(summarizeSets([set(0, 8), set(0, 8)], true)).toBe('2 × 8 au poids du corps')
    expect(summarizeSets([set(10, 6)], true)).toBe('1 × 6 à PDC + 10 kg')
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
    const rec = personalRecords(exerciseHistory(sessions, 'bench'), false)
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
