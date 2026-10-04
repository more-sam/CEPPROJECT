import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

import { ease } from '../../motion/tokens'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Dialog with motion transitions.
 *
 * The backdrop and surface animate independently so the dim is a short fade and
 * the surface lifts in with a spring — the surface should feel like it rises
 * toward the visitor, not that the curtain animates it.
 */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.16, ease: ease.out }}
        >
          <motion.div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: ease.out }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="sb-glass relative z-10 w-full max-w-lg rounded-2xl p-6"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 4 }}
            transition={
              reduced
                ? { duration: 0.16, ease: ease.out }
                : { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-white">{title}</h2>
                {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/8 hover:text-white"
                whileTap={reduced ? undefined : { scale: 0.92 }}
                transition={{ duration: 0.1 }}
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="mt-4">{children}</div>

            {footer && (
              <div className="mt-6 flex justify-end gap-3 border-t border-white/8 pt-4">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
