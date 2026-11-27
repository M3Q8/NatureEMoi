import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconMinus, IconPlus } from './Icons'
import { fmtNum, parseNumber, round2 } from '../lib/format'

/** Bouton qui répète l'action tant qu'on garde le doigt appuyé. */
function HoldButton({ label, onStep, children }: { label: string; onStep: () => void; children: ReactNode }) {
  const fn = useRef(onStep)
  fn.current = onStep
  const delay = useRef<ReturnType<typeof setTimeout>>(undefined)
  const repeat = useRef<ReturnType<typeof setInterval>>(undefined)
  const repeated = useRef(false)
  const stop = () => {
    clearTimeout(delay.current)
    clearInterval(repeat.current)
  }
  useEffect(() => stop, [])
  return (
    <button
      type="button"
      aria-label={label}
      className="press flex h-[60px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-control text-ink active:bg-[#3a3d44]"
      onPointerDown={() => {
        repeated.current = false
        stop()
        delay.current = setTimeout(() => {
          repeated.current = true
          fn.current()
          repeat.current = setInterval(() => fn.current(), 90)
        }, 450)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (repeated.current) {
          repeated.current = false
          return
        }
        fn.current()
      }}
    >
      {children}
    </button>
  )
}

interface StepperProps {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  min?: number
  max?: number
  unit?: string
  /** autorise les décimales (poids) */
  decimal?: boolean
  /** texte des boutons pour les lecteurs d'écran, ex. « 2,5 kg » */
  stepLabel: string
  /** affichage personnalisé (ex. durée « 1:30 ») */
  format?: (v: number) => string
  /** lecture personnalisée de la saisie au clavier */
  parse?: (text: string) => number | null
}

/** Gros chiffre + boutons − / +. Toucher le chiffre permet de le taper au clavier numérique. */
export function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
  unit,
  decimal = false,
  stepLabel,
  format,
  parse,
}: StepperProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const latest = useRef(value)
  latest.current = value

  const clean = (v: number) => {
    const r = decimal ? round2(v) : Math.round(v)
    return Math.min(max, Math.max(min, r))
  }
  const bump = (delta: number) => {
    const next = clean(latest.current + delta)
    latest.current = next
    onChange(next)
  }
  const display = format ? format(value) : decimal ? fmtNum(value) : String(value)
  const shown = editing ? text : display

  const commit = () => {
    setEditing(false)
    const n = parse ? parse(text) : parseNumber(text)
    if (n === null || text.trim() === '') return
    const next = clean(n)
    if (next !== value) onChange(next)
  }

  return (
    <div className="flex items-center gap-2.5">
      <HoldButton label={`Moins ${stepLabel}`} onStep={() => bump(-step)}>
        <IconMinus size={28} />
      </HoldButton>
      <label className="flex h-[60px] min-w-0 flex-1 cursor-text flex-col items-center justify-center rounded-2xl bg-well">
        <span className="text-[11px] font-bold tracking-[0.08em] text-muted uppercase">{label}</span>
        <span className="flex items-baseline gap-1">
          <input
            aria-label={label}
            value={shown}
            inputMode={decimal || format ? 'decimal' : 'numeric'}
            enterKeyHint="done"
            autoComplete="off"
            onFocus={(e) => {
              setText(display)
              setEditing(true)
              const el = e.currentTarget
              requestAnimationFrame(() => el.setSelectionRange(0, el.value.length))
            }}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            style={{ width: `${Math.max(1, shown.length) + 0.4}ch` }}
            className="bg-transparent p-0 text-center text-[32px] leading-none font-extrabold text-ink outline-none"
          />
          {unit && <span className="text-[15px] font-semibold text-muted">{unit}</span>}
        </span>
      </label>
      <HoldButton label={`Plus ${stepLabel}`} onStep={() => bump(step)}>
        <IconPlus size={28} />
      </HoldButton>
    </div>
  )
}
