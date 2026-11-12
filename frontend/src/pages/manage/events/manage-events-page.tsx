import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { EventGrid } from '@/components/manage/events/event-grid'
import { EventListFilters } from '@/components/manage/events/event-list-filters'
import { EventListEmpty, EventListSkeleton } from '@/components/manage/events/event-list-states'
import { EventTable } from '@/components/manage/events/event-table'
import { useManageEvents } from '@/components/manage/events/use-manage-events'
import { LoadError } from '@/components/manage/shared/load-error'
import { PageHeading } from '@/components/manage/shared/page-heading'
import { useSession } from '@/lib/session'

export function ManageEventsPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const list = useManageEvents()

  return (
    <Section pad="none">
      <Container size="wide" className="grid gap-5">
        <PageHeading
          title="Kelola event"
          description={
            user?.role === 'admin'
              ? 'Semua event di mal, dari draf penyelenggara sampai yang sudah selesai.'
              : 'Event milik penyelenggaramu. Draf baru tayang setelah disetujui admin mal.'
          }
          action={<Button onClick={() => navigate('/manage/events/new')}>Buat event</Button>}
        />

        <EventListFilters
          tab={list.tab}
          counts={list.counts}
          query={list.query}
          onTab={list.setTab}
          onQuery={list.setQuery}
        />

        {list.loading ? (
          <EventListSkeleton />
        ) : list.error ? (
          <LoadError message={list.error} onRetry={list.retry} />
        ) : list.visible.length === 0 ? (
          <EventListEmpty
            hasEvents={list.events.length > 0}
            onReset={() => {
              list.setTab('all')
              list.setQuery('')
            }}
          />
        ) : (
          <>
            <EventTable events={list.visible} showOrganizer={user?.role === 'admin'} />
            <EventGrid events={list.visible} />
          </>
        )}
      </Container>
    </Section>
  )
}
