import { useMemo } from 'react'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { EventsEmpty, EventsError } from '@/components/events/event-states'
import { upcomingEvents } from '@/components/events/list/event-filters'
import { useCatalogEvents } from '@/components/events/list/use-catalog-events'
import { HomeHero } from '@/components/home/home-hero'
import { HomeQueueBand } from '@/components/home/home-queue-band'
import { HomeRows, HomeRowsLoading } from '@/components/home/home-rows'
import { HomeSteps } from '@/components/home/home-steps'
import { HomeWhenLinks } from '@/components/home/home-when-links'

export function HomePage() {
  const { events, state, error, reload } = useCatalogEvents()
  const upcoming = useMemo(() => upcomingEvents(events), [events])
  const featured = upcoming.find((event) => event.posterUrl !== '') ?? null

  return (
    <>
      <HomeHero featured={featured} />

      {state === 'loading' ? <HomeRowsLoading /> : null}

      {state === 'error' ? (
        <Section pad="sm">
          <Container size="wide">
            <EventsError message={error} onRetry={reload} />
          </Container>
        </Section>
      ) : null}

      {state === 'ready' && upcoming.length === 0 ? (
        <Section pad="sm">
          <Container size="wide">
            <EventsEmpty />
          </Container>
        </Section>
      ) : null}

      {state === 'ready' && upcoming.length > 0 ? (
        <>
          <Section pad="none" className="pt-5">
            <Container size="wide">
              <HomeWhenLinks events={upcoming} />
            </Container>
          </Section>
          <HomeRows events={upcoming} />
        </>
      ) : null}

      <HomeSteps />
      <HomeQueueBand />
    </>
  )
}
