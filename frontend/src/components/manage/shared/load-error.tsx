import { Button } from '@/components/ui/button'

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-3 rounded-card border border-negative-bg bg-negative-bg p-4">
      <p className="text-sm text-negative-ink">{message}</p>
      <Button variant="ghost" size="small" onClick={onRetry}>
        Muat ulang
      </Button>
    </div>
  )
}
