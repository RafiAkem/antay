import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'
import { EventsResults } from '@/components/events/list/events-results'
import { EventsToolbar } from '@/components/events/list/events-toolbar'
import { useEventsPage } from '@/components/events/list/use-events-page'

export function EventsPage() {
  const page = useEventsPage()

  return (
    <Section pad="sm" labelledBy="events-title">
      <Container size="wide" className="grid gap-5">
        <header className="grid gap-1">
          <Heading level={1} id="events-title">
            Event di Summarecon Mall Bandung
          </Heading>
          <Paragraph tone="muted" size="sm" className="num">
            {page.state === 'ready' ? countLabel(page.results.length, page.total, page.filtered) : 'Memuat jadwal event...'}
          </Paragraph>
        </header>

        <EventsToolbar
          query={page.query}
          when={page.when}
          sort={page.sort}
          onQueryChange={page.setQuery}
          onWhenChange={page.setWhen}
          onSortChange={page.setSort}
        />

        <EventsResults
          state={page.state}
          error={page.error}
          total={page.total}
          results={page.results}
          query={page.query}
          when={page.when}
          onRetry={page.reload}
          onReset={page.reset}
        />
      </Container>
    </Section>
  )
}

function countLabel(shown: number, total: number, filtered: boolean): string {
  if (total === 0) return 'Belum ada event yang tayang.'
  if (filtered) return `${shown} dari ${total} event cocok dengan saringanmu.`
  return `${total} event akan datang di mal.`
}
