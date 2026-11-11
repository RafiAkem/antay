import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Paragraph } from '@/components/ui/text'
import { NotFoundInline } from '@/pages/common/not-found-inline'
import { EventDetailGrid } from './event-detail-grid'

// Kerangka yang meniru tata letak asli: poster persegi, judul, daftar fakta,
// baris kategori, dan panel kanan di desktop. Jadi saat data datang, tidak ada
// yang melompat.
export function EventDetailSkeleton() {
  return (
    <Section pad="none" className="pb-[clamp(16px,3vw,28px)] sm:pt-[clamp(16px,3vw,28px)]">
      <Container>
        <div role="status" aria-live="polite">
          <span className="sr-only">Memuat detail event...</span>
          <EventDetailGrid
            aside={
              <div className="hidden gap-4 rounded-card border border-border-soft bg-surface p-5 lg:grid">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            }
          >
            <div className="grid gap-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <div className="-mx-gutter sm:mx-0">
                <Skeleton className="aspect-square sm:rounded-card" />
              </div>
              <div className="grid content-start gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-4/5" />
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={row} className="h-5 w-3/5" />
                ))}
                <Skeleton className="mt-2 h-7 w-36" />
              </div>
            </div>
            <Skeleton className="mt-6 h-12 w-full" />
            <div className="mt-6 grid gap-2">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-20 w-full rounded-card" />
              ))}
            </div>
          </EventDetailGrid>
        </div>
      </Container>
    </Section>
  )
}

export function EventDetailMissing() {
  return (
    <Section>
      <Container size="narrow">
        <NotFoundInline
          title="Event ini tidak ditemukan."
          message="Mungkin sudah selesai, dibatalkan penyelenggara, atau tautannya terpotong. Event lain yang sedang dijual ada di daftar event."
          action={
            <Link to="/events" className="mt-1 w-fit text-[13px] font-semibold text-accent-ink hover:underline">
              Lihat event yang sedang dijual
            </Link>
          }
        />
      </Container>
    </Section>
  )
}

export function EventDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Section>
      <Container size="narrow">
        <div role="alert" className="grid justify-items-start gap-3 rounded-card border border-border-soft bg-surface p-5">
          <Heading level={1} size="md">
            Detail event belum bisa dimuat.
          </Heading>
          <Paragraph tone="muted">{message}</Paragraph>
          <Button onClick={onRetry}>Coba lagi</Button>
        </div>
      </Container>
    </Section>
  )
}
