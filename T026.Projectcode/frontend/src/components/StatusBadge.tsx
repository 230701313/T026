import type { ItemStatus } from '@/types'

const STATUS_CONFIG: Record<
  ItemStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  ACTIVE: {
    label: 'Active',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400 animate-pulse',
  },
  MATCHED: {
    label: 'Match Found',
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
  },
  CLAIMED: {
    label: 'Claimed',
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  RECOVERED: {
    label: 'Recovered',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-400',
  },
  CLOSED: {
    label: 'Closed',
    bg: 'bg-slate-800/80',
    text: 'text-slate-400',
    border: 'border-slate-700',
    dot: 'bg-slate-500',
  },
}

export function StatusBadge({
  status,
  size = 'sm',
  className = '',
}: {
  status: ItemStatus
  size?: 'sm' | 'md'
  className?: string
}) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-xs'
      : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
