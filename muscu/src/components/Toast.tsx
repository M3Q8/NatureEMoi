import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconUndo } from './Icons'

interface ToastItem {
  id: number
  message: string
  undo?: () => unknown
}

interface ToastApi {
  show: (message: string, undo?: () => unknown) => void
}

interface ToastState {
  toast: ToastItem | null
  dismiss: () => void
  customSlots: number
  registerSlot: () => () => void
}

const ApiCtx = createContext<ToastApi>({ show: () => {} })
const StateCtx = createContext<ToastState | null>(null)

const DURATION = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)
  const [customSlots, setCustomSlots] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const nextId = useRef(1)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((message: string, undo?: () => unknown) => {
    clearTimeout(timer.current)
    setToast({ id: nextId.current++, message, undo })
    timer.current = setTimeout(() => setToast(null), DURATION)
  }, [])

  const registerSlot = useCallback(() => {
    setCustomSlots((n) => n + 1)
    return () => setCustomSlots((n) => n - 1)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const api = useMemo(() => ({ show }), [show])
  const state = useMemo(() => ({ toast, dismiss, customSlots, registerSlot }), [toast, dismiss, customSlots, registerSlot])
  return (
    <ApiCtx.Provider value={api}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </ApiCtx.Provider>
  )
}

export const useToast = () => useContext(ApiCtx)

/**
 * Emplacement où s'affiche le message (avec « Annuler »).
 * L'emplacement « fallback » (au-dessus de la barre d'onglets) ne sert que si
 * l'écran affiché n'a pas son propre emplacement (ex. au-dessus du panneau de saisie).
 */
export function ToastSlot({ className = '', fallback = false }: { className?: string; fallback?: boolean }) {
  const st = useContext(StateCtx)
  const register = st?.registerSlot
  useEffect(() => {
    if (!fallback && register) return register()
  }, [fallback, register])
  if (!st) return null
  const visible = st.toast && (!fallback || st.customSlots === 0)
  return (
    <div role="status" aria-live="polite" className={`pointer-events-none absolute inset-x-4 z-30 ${className}`}>
      {visible && st.toast && (
        <div
          key={st.toast.id}
          className="animate-rise pointer-events-auto flex min-h-[54px] items-center justify-between gap-2 rounded-2xl bg-toast py-1 pr-1.5 pl-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <span className="text-[15px] leading-snug font-semibold">{st.toast.message}</span>
          {st.toast.undo && (
            <button
              type="button"
              onClick={() => {
                const undo = st.toast?.undo
                st.dismiss()
                undo?.()
              }}
              className="press flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[15px] font-extrabold text-accent active:bg-white/10"
            >
              <IconUndo size={18} />
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  )
}
