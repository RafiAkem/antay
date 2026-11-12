import { Link } from 'react-router-dom'
import { Carousel } from '@/components/ui/carousel'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { EventCard } from '@/components/events/event-card'
import { EventCardSkeleton } from '@/components/events/event-states'
import type { CatalogEvent } from '@/types/catalog'

const ROW_SIZE = 8

const SEE_ALL = 'text-[13px] leading-[18px] font-semibold text-accent-ink hover:underline'

type HomeRowsProps = {
  // Sudah disaring ke event yang akan datang dan diurut dari yang terdekat.
  events: CatalogEvent[]
}

// Dua baris dari data yang sama. Belum ada data kapasitas di daftar, jadi
// baris kedua jujur saja: event terdekat yang tiketnya sudah bisa dibeli.
export function HomeRows({ events }: HomeRowsProps) {
  const soonest = events.slice(0, ROW_SIZE)
  const onSale = events.filter((event) => event.onSale && event.priceFrom !== null).slice(0, ROW_SIZE)

  return (
    <>
      {soonest.length > 0 ? (
        <Section pad="sm">
          <Container size="wide">
            <Carousel
              title="Segera berlangsung"
              action={
                <Link to="/events" className={SEE_ALL}>
                  Lihat semua
                </Link>
              }
            >
              {soonest.map((event) => (
                <EventCard key={event.id} event={event} size="compact" />
              ))}
            </Carousel>
          </Container>
        </Section>
      ) : null}

      {onSale.length > 0 ? (
        <Section pad="sm">
          <Container size="wide">
            <Carousel
              title="Sedang dijual"
              action={
                <Link to="/events?sort=cheapest" className={SEE_ALL}>
                  Urut termurah
                </Link>
              }
            >
              {onSale.map((event) => (
                <EventCard key={event.id} event={event} size="compact" />
              ))}
            </Carousel>
          </Container>
        </Section>
      ) : null}
    </>
  )
}

export function HomeRowsLoading() {
  return (
    <Section pad="sm">
      <Container size="wide">
        <div role="status" aria-live="polite" className="grid gap-3">
          <Skeleton className="h-6 w-48" />
          <div className="-mx-gutter flex gap-3 overflow-hidden px-gutter lg:mx-0 lg:gap-4 lg:px-0">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="w-[calc((100%-24px)/2.15)] flex-none sm:w-[calc((100%-36px)/3.2)] lg:w-[calc((100%-48px)/4)]">
                <EventCardSkeleton />
              </div>
            ))}
          </div>
          <span className="sr-only">Memuat event terdekat...</span>
        </div>
      </Container>
    </Section>
  )
}
