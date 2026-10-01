import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'outline'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  icon?: ReactNode
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: 'bg-slate-800/80 text-slate-300 border-slate-700',
    dot: 'bg-slate-400',
  },
  primary: {
    container: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    dot: 'bg-indigo-400',
  },
  success: {
    container: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  warning: {
    container: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  danger: {
    container: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400',
  },
  info: {
    container: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400',
  },
  purple: {
    container: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
  },
  outline: {
    container: 'bg-slate-900 text-slate-300 border-slate-700',
    dot: 'bg-slate-400',
  },
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'sm', dot = false, icon, children, className = '', ...props }, ref) => {
    const config = variantStyles[variant] || variantStyles.default
    const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs gap-1.5' : 'px-3 py-1 text-sm gap-2'

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full font-medium border ${config.container} ${sizeClasses} ${className}`}
        {...props}
      >
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />}
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'
