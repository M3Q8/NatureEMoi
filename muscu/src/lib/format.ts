const nf2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** 62.5 → « 62,5 » ; 8450 → « 8 450 » */
export const fmtNum = (n: number) => nf2.format(n)
export const fmtNum1 = (n: number) => nf1.format(n)
export const fmtInt = (n: number) => nf0.format(n)
export const fmtKg = (n: number) => `${fmtNum(n)} kg`

/** Poids d'une série. Au poids du corps : « PDC » ou « PDC + 10 kg ». */
export function fmtSetWeight(weight: number, bodyweight: boolean): string {
  if (!bodyweight) return fmtKg(weight)
  return weight === 0 ? 'PDC' : `PDC + ${fmtKg(weight)}`
}

type ExLike = { bodyweight: boolean; kind?: 'reps' | 'time'; group: string }
type SetLike = { reps: number; weight: number; warmup?: boolean }

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 90 → « 1:30 » ; 1500 → « 25:00 » ; 3900 → « 1:05:00 » */
export function fmtSeconds(total: number): string {
  const s = Math.max(0, Math.round(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${m}:${pad2(s % 60)}`
}

/**
 * Lit une durée tapée au clavier : « 1:30 » ou « 1,30 » = 1 min 30.
 * Un nombre seul compte en minutes pour le cardio, en secondes sinon.
 */
export function parseDuration(text: string, minutesByDefault: boolean): number | null {
  const t = text.trim()
  const ms = t.match(/^(\d+)\s*[:,.hm]\s*(\d{0,2})\s*s?$/i)
  if (ms) return Number(ms[1]) * 60 + Number(ms[2] || 0)
  if (/^\d+$/.test(t)) return Number(t) * (minutesByDefault ? 60 : 1)
  return null
}

/** Une série : « 60 kg × 10 », « PDC × 8 », « 1:30 », « 1:00 · +10 kg » */
export function fmtSet(set: SetLike, ex: ExLike): string {
  if (ex.kind === 'time') {
    const d = fmtSeconds(set.reps)
    if (ex.group === 'Cardio' || set.weight === 0) return d
    return ex.bodyweight ? `${d} · +${fmtKg(set.weight)}` : `${fmtKg(set.weight)} · ${d}`
  }
  return `${fmtSetWeight(set.weight, ex.bodyweight)} × ${set.reps}`
}

/**
 * Résumé des séries (hors échauffement) : « 3 × 10 à 60 kg »,
 * « 60 kg × 10, 10, 8 · 57,5 kg × 8 », « 3 × 1:00 », « 25:00 ».
 */
export function summarizeSets(allSets: SetLike[], ex: ExLike): string {
  const sets = allSets.filter((s) => !s.warmup)
  if (sets.length === 0) return ''
  const first = sets[0]
  const sameWeight = sets.every((s) => s.weight === first.weight)
  const sameReps = sets.every((s) => s.reps === first.reps)

  if (ex.kind === 'time') {
    const w = first.weight
    const suffix = ex.group !== 'Cardio' && sameWeight && w > 0 ? (ex.bodyweight ? ` · +${fmtKg(w)}` : ` à ${fmtKg(w)}`) : ''
    if (sameReps) return `${sets.length > 1 ? `${sets.length} × ` : ''}${fmtSeconds(first.reps)}${suffix}`
    if (sameWeight) return sets.map((s) => fmtSeconds(s.reps)).join(', ') + suffix
    return sets.map((s) => fmtSet(s, ex)).join(' · ')
  }

  const w = (x: number) => (ex.bodyweight ? (x === 0 ? 'poids du corps' : `PDC + ${fmtKg(x)}`) : fmtKg(x))
  if (sameWeight && sameReps) {
    const at = ex.bodyweight && first.weight === 0 ? 'au poids du corps' : `à ${w(first.weight)}`
    return `${sets.length} × ${first.reps} ${at}`
  }
  const groups: { weight: number; reps: number[] }[] = []
  for (const s of sets) {
    const last = groups[groups.length - 1]
    if (last && last.weight === s.weight) last.reps.push(s.reps)
    else groups.push({ weight: s.weight, reps: [s.reps] })
  }
  return groups.map((g) => `${w(g.weight)} × ${g.reps.join(', ')}`).join(' · ')
}

/** 52 min ; 1 h 04 */
export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h} h ${String(m).padStart(2, '0')}`
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const dfDayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const dfDayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
const dfDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const dfDateYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const dfTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const dfMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** Vendredi 27 novembre */
export const fmtDayLong = (ts: number) => capitalize(dfDayLong.format(ts))
/** Jeudi 26 nov. */
export const fmtDayShort = (ts: number) => capitalize(dfDayShort.format(ts))
/** 26 nov. (+ l'année si ce n'est pas l'année en cours) */
export function fmtDate(ts: number, now = Date.now()): string {
  return new Date(ts).getFullYear() === new Date(now).getFullYear() ? dfDate.format(ts) : dfDateYear.format(ts)
}
/** 18:05 */
export const fmtTime = (ts: number) => dfTime.format(ts)
/** Novembre 2026 */
export const fmtMonth = (ts: number) => capitalize(dfMonth.format(ts))

export const plural = (n: number, one: string, many: string) => `${fmtInt(n)} ${n > 1 ? many : one}`

/** Pour comparer sans tenir compte des accents ni des majuscules. */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Lit un nombre tapé au clavier (« 62,5 » ou « 62.5 »). */
export function parseNumber(text: string): number | null {
  const n = Number(text.replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Arrondi à 2 décimales (évite 0,1 + 0,2 = 0,30000000000000004). */
export const round2 = (n: number) => Math.round(n * 100) / 100
