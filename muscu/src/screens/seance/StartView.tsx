import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getMeta, type Session } from '../../db/db'
import { deleteDemoData, startSession } from '../../db/actions'
import { useData } from '../../hooks/useData'
import { useNow } from '../../hooks/useNow'
import { useNav } from '../../hooks/useNav'
import { useToast } from '../../components/Toast'
import { ConfirmSheet } from '../../components/Sheet'
import { IconPlay, IconPlus, IconRepeat, IconShield } from '../../components/Icons'
import { fmtDayLong, fmtDayShort, plural } from '../../lib/format'
import { addDays, hasSets, startOfWeek } from '../../lib/stats'
import { exportData, saveBackupFile } from '../../lib/backup'

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Écran d'ouverture quand aucune séance n'est en cours. */
export function StartView() {
  const { sessions, exMap, hasDemo } = useData()
  const toast = useToast()
  const now = useNow(60_000)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const lastExportAt = useLiveQuery(() => getMeta<number>('lastExportAt'), [], null)
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []) ?? []
  const nav = useNav()
  const usable = (ids: string[]) => ids.filter((id) => exMap.get(id) && !exMap.get(id)!.archived)

  const done = useMemo(() => sessions.filter((s) => s.endedAt !== null && hasSets(s)), [sessions])

  // séances à refaire : les plus récentes, sans doublon de programme
  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: Session[] = []
    for (const s of done) {
      const key = s.exercises.map((e) => e.exerciseId).join('|')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(s)
      if (out.length === 4) break
    }
    return out
  }, [done])

  const weekStart = startOfWeek(now)
  const week = DAY_LETTERS.map((letter, i) => {
    const dayStart = addDays(weekStart, i)
    const dayEnd = addDays(weekStart, i + 1)
    return {
      letter,
      done: done.some((s) => s.startedAt >= dayStart && s.startedAt < dayEnd),
      today: now >= dayStart && now < dayEnd,
    }
  })
  const weekCount = done.filter((s) => s.startedAt >= weekStart).length

  const realCount = done.filter((s) => !s.demo).length
  const needBackup = lastExportAt !== null && realCount >= 3 && (!lastExportAt || now - lastExportAt > 30 * 864e5)

  const backupNow = async () => {
    const res = await saveBackupFile(await exportData())
    if (res !== 'cancelled') toast.show('Sauvegarde enregistrée')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-area pt-safe flex-1 px-4 pb-6">
        <header className="px-1 pt-3">
          <p className="text-[15px] font-semibold text-muted">{fmtDayLong(now)}</p>
          <h1 className="mt-1 text-[34px] font-extrabold tracking-tight">Séance</h1>
        </header>

        {hasDemo && (
          <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#2f3a12] bg-[#151a08] py-3 pr-2 pl-4">
            <p className="flex-1 text-[14px] leading-snug text-soft">Des séances de démonstration sont affichées pour te montrer l’app.</p>
            <button
              type="button"
              onClick={() => setConfirmDemo(true)}
              className="press h-11 shrink-0 rounded-xl px-3 text-[14px] font-bold text-accent active:bg-white/5"
            >
              Les supprimer
            </button>
          </div>
        )}

        {needBackup && (
          <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#4a3a16] bg-[#1f1a10] py-3 pr-2 pl-4">
            <IconShield size={22} className="shrink-0 text-gold" />
            <p className="flex-1 text-[14px] leading-snug text-soft">Tes données ne sont que sur ce téléphone. Pense à les sauvegarder.</p>
            <button
              type="button"
              onClick={backupNow}
              className="press h-11 shrink-0 rounded-xl px-3 text-[14px] font-bold text-gold active:bg-white/5"
            >
              Sauvegarder
            </button>
          </div>
        )}

        <section aria-labelledby="mes-seances" className="mt-6 flex flex-col gap-2.5">
          <div className="mx-1 flex items-center justify-between">
            <h2 id="mes-seances" className="text-[13px] font-bold tracking-[0.06em] text-muted uppercase">
              Mes séances types
            </h2>
            {templates.length > 0 && (
              <button
                type="button"
                onClick={() => nav.goTo('reglages', 'templates')}
                className="press -my-2 h-11 px-1 text-[15px] font-semibold text-accent"
              >
                Modifier
              </button>
            )}
          </div>
          {templates.map((t) => {
            const ids = usable(t.exerciseIds)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => startSession(ids)}
                className="press flex min-h-[72px] items-center gap-3.5 rounded-[18px] border border-[#2f3a12] bg-surface px-4 py-3 text-left active:bg-raised"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="truncate text-[17px] font-bold">{t.name}</strong>
                  <span className="truncate text-[14px] text-muted">
                    {ids.length ? ids.map((id) => exMap.get(id)!.name).join(', ') : 'Aucun exercice'}
                  </span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
                  <IconPlay size={16} />
                </span>
                <span className="sr-only">Démarrer cette séance</span>
              </button>
            )
          })}
          {templates.length === 0 && (
            <button
              type="button"
              onClick={() => nav.goTo('reglages', 'templates')}
              className="press flex min-h-14 items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-[#3a3d44] px-4 py-2 text-left active:bg-raised"
            >
              <IconPlus size={20} className="shrink-0 text-accent" />
              <span className="text-[15px] leading-snug text-soft">Crée tes séances types (Pecs, Jambes…) pour les lancer en 1 tap</span>
            </button>
          )}
        </section>

        {recent.length > 0 && (
          <section aria-labelledby="refaire" className="mt-7 flex flex-col gap-2.5">
            <h2 id="refaire" className="mx-1 mb-0.5 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">
              Refaire une séance précédente
            </h2>
            {recent.map((s) => {
              const names = s.exercises.map((e) => exMap.get(e.exerciseId)?.name).filter(Boolean)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => startSession(s.exercises.map((e) => e.exerciseId))}
                  className="press flex min-h-[72px] items-center gap-3.5 rounded-[18px] border border-[#24262b] bg-surface px-4 py-3 text-left active:bg-raised"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong className="text-[17px] font-bold">{fmtDayShort(s.startedAt)}</strong>
                    <span className="truncate text-[14px] text-muted">{names.join(', ')}</span>
                  </span>
                  <IconRepeat size={22} className="shrink-0 text-accent" />
                  <span className="sr-only">Refaire cette séance</span>
                </button>
              )
            })}
          </section>
        )}

        <section aria-label="Cette semaine" className="mt-6 flex flex-col gap-3 rounded-[18px] border border-[#24262b] bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-bold">Cette semaine</span>
            <span className="text-[15px] text-muted">
              <strong className="text-ink">{weekCount}</strong> {weekCount > 1 ? 'séances' : 'séance'}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((d, i) => (
              <div
                key={i}
                className={`flex h-[34px] items-center justify-center rounded-[10px] text-[13px] ${
                  d.done
                    ? 'bg-accent font-extrabold text-accent-ink'
                    : d.today
                      ? 'border-2 border-accent font-bold text-ink'
                      : 'bg-[#202227] font-semibold text-muted'
                }`}
              >
                {d.letter}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="shrink-0 px-4 pt-2 pb-3">
        <button
          type="button"
          onClick={() => startSession()}
          className="press flex h-[88px] w-full items-center justify-center gap-3.5 rounded-[26px] bg-accent text-[21px] font-extrabold tracking-tight text-accent-ink active:bg-[#b3db2b]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-ink text-accent">
            <IconPlay size={20} />
          </span>
          Démarrer une séance
        </button>
      </div>

      <ConfirmSheet
        open={confirmDemo}
        title="Supprimer les données de démo ?"
        message={`Les ${plural(sessions.filter((s) => s.demo).length, 'séance', 'séances')} d’exemple seront effacées. Tes propres séances sont conservées.`}
        confirmLabel="Supprimer la démo"
        onConfirm={async () => {
          const n = await deleteDemoData()
          toast.show(`${plural(n, 'séance de démo supprimée', 'séances de démo supprimées')}`)
        }}
        onClose={() => setConfirmDemo(false)}
      />
    </div>
  )
}
