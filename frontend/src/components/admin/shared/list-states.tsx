import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/pill'
import { Skeleton } from '@/components/ui/skeleton'

// Bentuknya meniru baris tabel di desktop dan kartu di ponsel.
export function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-[132px] rounded-card" />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-card border border-border-soft bg-surface lg:block">
        <div className="h-11 bg-raised" />
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-6 border-t border-border-soft px-4 py-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-16 rounded-pill" />
            <Skeleton className="ml-auto h-8 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-3 rounded-card border-l-4 border-negative bg-negative-bg p-4">
      <div className="grid gap-1 text-negative-ink">
        <b className="font-bold">{title}</b>
        <span className="text-sm leading-5">{message}</span>
      </div>
      <Button variant="ghost" size="small" onClick={onRetry}>
        Coba lagi
      </Button>
    </div>
  )
}

export function ListEmpty({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return <Empty title={title} hint={hint} action={action ? <div className="mt-1.5">{action}</div> : undefined} />
}
