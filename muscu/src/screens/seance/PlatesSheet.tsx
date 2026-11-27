import { useLiveQuery } from 'dexie-react-hooks'
import { getMeta, setMeta } from '../../db/db'
import { Sheet } from '../../components/Sheet'
import { fmtKg, fmtNum } from '../../lib/format'
import { platesFor } from '../../lib/stats'

const PLATE_STYLE: Record<string, { h: number; w: number; bg: string; ink: string }> = {
  '25': { h: 132, w: 26, bg: '#e5484d', ink: '#fff' },
  '20': { h: 120, w: 24, bg: '#3e7bfa', ink: '#fff' },
  '15': { h: 106, w: 22, bg: '#f5c518', ink: '#111' },
  '10': { h: 90, w: 20, bg: '#30a46c', ink: '#fff' },
  '5': { h: 70, w: 18, bg: '#ececec', ink: '#111' },
  '2.5': { h: 56, w: 16, bg: '#3a3d44', ink: '#fff' },
  '1.25': { h: 46, w: 14, bg: '#9ea3ab', ink: '#111' },
}

const BARS = [20, 15, 10, 0]

/** Quels disques mettre de chaque côté de la barre. */
export function PlatesSheet({ weight, onClose }: { weight: number; onClose: () => void }) {
  const bar = useLiveQuery(() => getMeta<number>('barWeight'), []) ?? 20
  const res = platesFor(weight, bar)

  return (
    <Sheet open onClose={onClose} label="Calculateur de disques">
      <div className="flex flex-col gap-4 px-4 pt-1 pb-2">
        <div className="px-1 pt-1">
          <h2 className="text-[22px] font-extrabold tracking-tight">Disques pour {fmtKg(weight)}</h2>
          <p className="mt-0.5 text-[15px] text-muted">À mettre de chaque côté de la barre</p>
        </div>

        <div className="flex h-[150px] items-center overflow-x-auto rounded-2xl bg-well px-4" aria-hidden="true">
          <div className="h-3 w-12 shrink-0 rounded-l bg-[#5a5d64]" />
          <div className="h-6 w-2 shrink-0 rounded-sm bg-[#7a7d84]" />
          {res?.perSide.map((p, i) => {
            const st = PLATE_STYLE[String(p)]
            return (
              <div
                key={i}
                className="animate-pop ml-0.5 flex shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold"
                style={{ height: st.h, width: st.w, background: st.bg, color: st.ink, writingMode: 'vertical-rl' }}
              >
                {fmtNum(p)}
              </div>
            )
          })}
          <div className="h-3 min-w-6 flex-1 rounded-r bg-[#5a5d64]" />
        </div>

        <p className="px-1 text-[17px] leading-snug font-semibold">
          {!res
            ? `Moins lourd que la barre (${fmtKg(bar)}).`
            : res.perSide.length === 0
              ? 'Rien à ajouter : la barre seule.'
              : `De chaque côté : ${res.perSide.map(fmtNum).join(' + ')} kg`}
        </p>
        {res && res.missing > 0 && (
          <p className="-mt-2 px-1 text-[14px] text-gold">
            Impossible pile avec des disques standards : il manque {fmtKg(res.missing)}.
          </p>
        )}

        <fieldset>
          <legend className="mb-1.5 px-1 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">Barre</legend>
          <div className="grid grid-cols-4 gap-2">
            {BARS.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={b === bar}
                onClick={() => setMeta('barWeight', b)}
                className={`press h-11 rounded-xl text-[15px] font-semibold ${b === bar ? 'bg-ink text-bg' : 'bg-control'}`}
              >
                {b ? `${b} kg` : 'Aucune'}
              </button>
            ))}
          </div>
        </fieldset>

        <button type="button" onClick={onClose} className="press h-14 rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink">
          OK
        </button>
      </div>
    </Sheet>
  )
}
