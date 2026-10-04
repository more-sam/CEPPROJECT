import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

import { ease } from '../../motion/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-600/25 hover:from-brand-400 hover:to-brand-500',
  secondary:
    'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/20',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
  danger:
    'border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
  success:
    'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-400 hover:to-teal-400',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-5 py-3 text-sm gap-2 rounded-xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

/** Every interactive action in the app uses this. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const reduced = useReducedMotion()

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      whileHover={reduced ? undefined : { y: -0.5 }}
      transition={{ duration: 0.16, ease: ease.out }}
      {...(rest as Record<string, unknown>)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </motion.button>
  )
}
