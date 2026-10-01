import { type ReactNode } from 'react'
import { FolderOpen } from 'lucide-react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#121622]/60 p-12 text-center backdrop-blur-xs ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-500/10">
        {icon || <FolderOpen className="h-7 w-7 stroke-[1.5]" />}
      </div>
      <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-slate-400 leading-relaxed font-medium">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
