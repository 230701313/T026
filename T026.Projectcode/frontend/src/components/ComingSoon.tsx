import { Construction } from 'lucide-react'

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Construction className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        This feature is not implemented yet. It's planned for{' '}
        <span className="font-medium text-slate-700">{phase}</span>.
      </p>
    </div>
  )
}
