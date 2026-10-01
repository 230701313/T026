import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 shadow-md shadow-indigo-600/30 border border-indigo-400/20 focus-visible:ring-indigo-500',
  secondary:
    'bg-slate-800/90 text-slate-100 hover:bg-slate-700 active:bg-slate-600 border border-slate-700/80 focus-visible:ring-slate-400',
  outline:
    'border border-slate-700/90 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600 hover:text-white active:bg-slate-700 focus-visible:ring-indigo-500 shadow-2xs',
  ghost:
    'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100 active:bg-slate-700/70 focus-visible:ring-slate-400',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-md shadow-rose-600/30 border border-rose-400/20 focus-visible:ring-rose-500',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl font-semibold',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-2xl font-bold',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b10] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
