import { useCallback, useEffect, useRef, useState } from 'react'
import { beep } from '../lib/sound'

const KEY = 'muscu.rest'

interface RestState {
  endsAt: number
  duration: number
}

function read(): RestState | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return v && typeof v.endsAt === 'number' ? v : null
  } catch {
    return null
  }
}
function write(v: RestState | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v))
    else localStorage.removeItem(KEY)
  } catch {
    /* navigation privée : le minuteur marche quand même, sans être mémorisé */
  }
}

/** Minuteur de repos. Il continue si l'app est fermée puis rouverte. */
export function useRestTimer() {
  const [state, setState] = useState<RestState | null>(read)
  const [now, setNow] = useState(() => Date.now())
  const fired = useRef<number | null>(null)

  const update = useCallback((v: RestState | null) => {
    write(v)
    setState(v)
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (!state) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [state])

  const done = !!state && now >= state.endsAt

  useEffect(() => {
    if (!state || !done) return
    if (fired.current !== state.endsAt) {
      fired.current = state.endsAt
      // bip seulement si on vient de finir (pas en rouvrant l'app des heures plus tard)
      if (now - state.endsAt < 3000) beep()
    }
    // le bandeau « Repos terminé » disparaît tout seul
    if (now - state.endsAt > 12_000) update(null)
  }, [done, now, state, update])

  return {
    active: !!state,
    done,
    remaining: state ? Math.max(0, Math.ceil((state.endsAt - now) / 1000)) : 0,
    progress: state ? Math.min(1, Math.max(0, 1 - (state.endsAt - now) / (state.duration * 1000))) : 0,
    start: (seconds: number) => update({ endsAt: Date.now() + seconds * 1000, duration: seconds }),
    add: (seconds: number) => {
      if (!state) return
      const endsAt = Math.max(Date.now() + 1000, state.endsAt + seconds * 1000)
      update({ endsAt, duration: Math.max(state.duration + seconds, 1) })
    },
    stop: () => update(null),
  }
}

export type RestTimer = ReturnType<typeof useRestTimer>
