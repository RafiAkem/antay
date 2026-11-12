import { cn } from './cn'

// Bentuk dan ukurannya ditentukan pemakai lewat className, supaya skeleton
// meniru tata letak aslinya. Pulse saja, tanpa shimmer yang bergerak.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-control bg-border-soft motion-reduce:animate-none', className)}
    />
  )
}
