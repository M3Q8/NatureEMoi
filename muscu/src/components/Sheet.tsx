import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  /** occupe toute la hauteur (liste d'exercices…) */
  full?: boolean
}

/** Panneau qui monte du bas de l'écran. Toucher le fond le ferme. */
export function Sheet({ open, onClose, label, children, full = false }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Fermer" tabIndex={-1} onClick={onClose} className="animate-fade absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="animate-sheet pb-safe-2 absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl border-t border-line bg-surface shadow-[0_-12px_32px_rgba(0,0,0,0.45)]"
        style={full ? { top: 'max(env(safe-area-inset-top), 16px)' } : { maxHeight: '92%' }}
      >
        <div aria-hidden="true" className="mx-auto mt-2 mb-1 h-[5px] w-10 shrink-0 rounded-full bg-[#3a3d44]" />
        {children}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  message?: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}

/** Confirmation, réservée aux grosses suppressions. */
export function ConfirmSheet({ open, title, message, confirmLabel, onConfirm, onClose }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <div className="flex flex-col gap-3 px-4 pt-2 pb-2">
        <h2 className="px-1 text-[21px] font-extrabold tracking-tight">{title}</h2>
        {message && <p className="px-1 text-[15px] leading-relaxed text-soft">{message}</p>}
        <button
          type="button"
          onClick={() => {
            onClose()
            onConfirm()
          }}
          className="press mt-2 h-14 rounded-2xl border-[1.5px] border-[#4a2a27] bg-[#241614] text-[17px] font-bold text-danger"
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={onClose} className="press h-14 rounded-2xl bg-control text-[17px] font-bold">
          Annuler
        </button>
      </div>
    </Sheet>
  )
}
