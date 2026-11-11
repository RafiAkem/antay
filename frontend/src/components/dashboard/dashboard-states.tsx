import { LinkButton } from '@/components/admin/shared/link-button'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/pill'
import { Skeleton } from '@/components/ui/skeleton'

export function SummarySkeleton() {
  return (
    <div className="grid gap-5" role="status" aria-label="Memuat ringkasan event">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-soft bg-border-soft sm:grid-cols-4">
        {[0, 1, 2, 3].map((cell) => (
          <div key={cell} className="grid gap-2 bg-surface p-4 sm:p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-card" />
    </div>
  )
}

export function RetryCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <div role="alert" className="grid justify-items-start gap-3">
        <p className="text-sm text-negative-ink">{message}</p>
        <Button variant="ghost" size="small" onClick={onRetry}>
          Coba lagi
        </Button>
      </div>
    </Card>
  )
}

export function NoEventSummary() {
  return (
    <Card>
      <Empty
        title="Belum ada event untuk diringkas"
        hint="Penyelenggara membuat event dari Kelola event, lalu kamu menyetujuinya di Persetujuan. Ringkasan kuota muncul di sini setelahnya."
        action={
          <LinkButton to="/manage/reviews" variant="ghost" size="small" className="w-fit">
            Buka antrean persetujuan
          </LinkButton>
        }
      />
    </Card>
  )
}
